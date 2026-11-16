import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState as NativeAppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { defaultState, type AppState } from '../domain/types';
import { transition, type Action } from '../domain/reducer';
import { addDays, trackingDay } from '../domain/dates';
import { loadState, saveState } from '../data/database';
import { syncNotifications } from '../services/notifications';
import { syncWidgets } from '../services/widgets';

type Context = { state: AppState; loading: boolean; error: string | null; syncWarning: string | null; today: string; dispatch: (action: Action) => Promise<AppState>; retry: () => void; resync: () => Promise<void> };
const AppContext = createContext<Context | null>(null);
export const errorText = (error: unknown) => error instanceof Error ? error.message : 'İşlem tamamlanamadı. Tekrar dene.';
export const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function AppProvider({ children }: React.PropsWithChildren) {
  const [state, setState] = useState(defaultState); const current = useRef(state);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [syncWarning, setSyncWarning] = useState<string | null>(null); const [today, setToday] = useState(trackingDay);
  const queue = useRef<Promise<unknown>>(Promise.resolve()); const effects = useRef<Promise<unknown>>(Promise.resolve());
  const resync = useCallback(async () => {
    const run = effects.current.catch(() => {}).then(async () => {
      const latest = current.current;
      const results = await Promise.allSettled([syncNotifications(latest), syncWidgets(latest)]);
      const issues = results.flatMap((r, i) => r.status === 'rejected' ? [`${i === 0 ? 'Bildirim' : 'Widget'}: ${errorText(r.reason)}`] : []);
      setSyncWarning(issues.length ? issues.join('\n') : null);
    });
    effects.current = run; await run;
  }, []);
  const retry = useCallback(() => {
    setLoading(true); setError(null);
    loadState().then(value => { current.current = value; setState(value); void resync(); }).catch(e => setError(errorText(e))).finally(() => setLoading(false));
  }, [resync]);
  useEffect(retry, [retry]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setToday(trackingDay()); void resync();
      const next = new Date(); if(next.getHours()<2) next.setHours(2,0,1,0); else {next.setDate(next.getDate()+1);next.setHours(2,0,1,0);}
      timer = setTimeout(tick, next.getTime() - Date.now());
    };
    const subscription = NativeAppState.addEventListener('change', status => {
      clearTimeout(timer); if (status === 'active') tick();
    });
    const next = new Date(); if(next.getHours()<2) next.setHours(2,0,1,0); else {next.setDate(next.getDate()+1);next.setHours(2,0,1,0);} timer = setTimeout(tick, next.getTime()-Date.now());
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [resync]);
  const dispatch = useCallback((action: Action): Promise<AppState> => {
    const run = queue.current.catch(() => {}).then(async () => {
      const previous = current.current; const next = transition(previous, action);
      if (next !== previous) {
        await saveState(next, previous.revision);
        current.current = next; setState(next);
        // Finish clearing OS reminders/widgets before returning to onboarding.
        if (action.type === 'reset') await resync(); else void resync();
      }
      return next;
    });
    queue.current = run; return run;
  }, [resync]);
  useEffect(() => {
    if(loading)return;
    const handled=new Set<string>();
    const apply=(response:Notifications.NotificationResponse|null|undefined)=>{
      if(!response)return;
      const data=response.notification.request.content.data as {kind?:string;packageIds?:unknown;date?:unknown;eye?:unknown};
      const key=`${response.notification.request.identifier}:${response.actionIdentifier}`;if(handled.has(key))return;handled.add(key);
      if(data.kind==='package-expired'&&response.actionIdentifier==='open-package'&&(data.eye==='left'||data.eye==='right')){router.push({pathname:'/package/new',params:{eye:data.eye}});return;}
      if(data.kind!=='daily-checkin'||!['worn','notWorn'].includes(response.actionIdentifier))return;
      const date=typeof data.date==='string'?data.date:trackingDay();
      const ids=Array.isArray(data.packageIds)?data.packageIds.filter((id):id is string=>typeof id==='string'):[];
      for(const packageId of ids){const pack=current.current.packages.find(p=>p.id===packageId);if(!pack||date<pack.openedOn||(pack.closedOn&&date>pack.closedOn))continue;void dispatch({type:'checkIn',id:uid(),packageId,date,status:response.actionIdentifier as 'worn'|'notWorn'});}
    };
    const subscription=Notifications.addNotificationResponseReceivedListener(apply);
    void Notifications.getLastNotificationResponseAsync().then(apply).catch(()=>{});
    return()=>subscription.remove();
  },[dispatch,loading]);
  useEffect(() => {
    if (loading || new Date().getHours() < 2) return;
    const through=addDays(today,-1);
    for (const pack of current.current.packages) {
      if(pack.boxId.startsWith('legacy-box-'))continue;
      const last = pack.closedOn && pack.closedOn < through ? pack.closedOn : through;
      for (let date=pack.openedOn; date<=last; date=addDays(date,1)) {
        if (current.current.checkIns.some(c=>c.packageId===pack.id&&c.date===date)) continue;
        void dispatch({type:'checkIn',id:uid(),packageId:pack.id,date,status:current.current.settings.defaultAnswer,automatic:true}).catch(e=>setError(errorText(e)));
      }
    }
  },[loading,today,state.revision,dispatch]);
  return <AppContext.Provider value={{ state, loading, error, syncWarning, today, dispatch, retry, resync }}>{children}</AppContext.Provider>;
}
export function useApp() { const context = useContext(AppContext); if (!context) throw new Error('Uygulama bağlamı bulunamadı.'); return context; }

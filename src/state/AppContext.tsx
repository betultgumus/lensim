import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState as NativeAppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { defaultState, type AppState } from '../domain/types';
import { transition, type Action } from '../domain/reducer';
import { trackingDay } from '../domain/dates';
import { friendlyError, type ErrorContext } from '../domain/errors';
import { loadState, saveState } from '../data/database';
import { syncNotifications } from '../services/notifications';
import { syncWidgets } from '../services/widgets';

type Context = { state: AppState; loading: boolean; error: string | null; syncWarning: string | null; today: string; dispatch: (action: Action) => Promise<AppState>; retry: () => void; resync: () => Promise<void> };
const AppContext = createContext<Context | null>(null);
/** Turkish, person-facing text for any error. Raw SQLite/native messages are never shown. */
export const errorText = (error: unknown, context: ErrorContext = 'save') => friendlyError(error, context).message;
/** Shows a Turkish alert that says what happened and what to do next. */
export const showError = (error: unknown, context: ErrorContext = 'save') => { const { title, message } = friendlyError(error, context); Alert.alert(title, message); };
export const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function AppProvider({ children }: React.PropsWithChildren) {
  const [state, setState] = useState(defaultState); const current = useRef(state);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [syncWarning, setSyncWarning] = useState<string | null>(null); const [today, setToday] = useState(trackingDay);
  const queue = useRef<Promise<unknown>>(Promise.resolve()); const effects = useRef<Promise<unknown>>(Promise.resolve());
  const resync = useCallback(async () => {
    const run = effects.current.catch(() => {}).then(async () => {
      const latest = current.current;
      // A failed widget refresh is not shown to the person: the widget keeps its last cards and is
      // refreshed again on the next save, day change or app resume.
      const [notifications] = await Promise.allSettled([syncNotifications(latest), syncWidgets(latest)]);
      const issues = notifications.status === 'rejected' ? [errorText(notifications.reason,'notification')] : [];
      setSyncWarning(issues.length ? issues.join('\n') : null);
    });
    effects.current = run; await run;
  }, []);
  const retry = useCallback(() => {
    setLoading(true); setError(null);
    loadState().then(value => { current.current = value; setState(value); void resync(); }).catch(e => setError(errorText(e,'load'))).finally(() => setLoading(false));
  }, [resync]);
  const refreshFromDisk = useCallback(async () => {
    const revisionAtStart = current.current.revision;
    try {
      const value = await loadState();
      // The native widget can write through SQLite while the app is backgrounded. Adopt only a
      // state at least as new as the one in memory; never roll back an in-flight app edit.
      if (value.revision >= current.current.revision && current.current.revision >= revisionAtStart) {
        current.current = value; setState(value); void resync();
      }
    } catch { /* A transient read cannot replace the already loaded in-memory records. */ }
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
      clearTimeout(timer); if (status === 'active') { void refreshFromDisk(); tick(); }
    });
    const next = new Date(); if(next.getHours()<2) next.setHours(2,0,1,0); else {next.setDate(next.getDate()+1);next.setHours(2,0,1,0);} timer = setTimeout(tick, next.getTime()-Date.now());
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [resync, refreshFromDisk]);
  const dispatch = useCallback((action: Action): Promise<AppState> => {
    const run = queue.current.catch(() => {}).then(async () => {
      const previous = current.current; const next = transition(previous, action, trackingDay());
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
      // "Taktım" / "Takmadım" under the daily question: saved as that day's ONE shared answer, exactly like the
      // answer buttons on the home screen (useMarkDay). An existing answer for the day is updated, never duplicated.
      // The response is cleared afterwards, so a later app start never applies it again over a newer answer.
      const status=response.actionIdentifier as 'worn'|'notWorn';
      const date=typeof data.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(data.date)?data.date:trackingDay();
      try{Notifications.clearLastNotificationResponse?.();}catch{/* older native module: nothing to clear */}
      void Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(()=>{});
      const covered=current.current.packages.find(p=>p.openedOn<=date&&(!p.closedOn||date<=p.closedOn));
      const save=covered?dispatch({type:'checkIn',id:uid(),packageId:covered.id,date,status,automatic:false})
        :status==='notWorn'?dispatch({type:'dailyStatus',id:uid(),date,status,automatic:false}):null;
      if(!save){Alert.alert('Bu gün için paket yok','Lens taktığın günü kaydetmek için önce o gün açtığın paketi ekle.');return;}
      // Show the answer where it lives: the home lens card (the widget is refreshed by the save itself).
      save.then(()=>router.navigate({pathname:'/(tabs)',params:{page:'today'}})).catch(e=>showError(e));
    };
    const subscription=Notifications.addNotificationResponseReceivedListener(apply);
    void Notifications.getLastNotificationResponseAsync().then(apply).catch(()=>{});
    return()=>subscription.remove();
  },[dispatch,loading]);
  // Unanswered days are filled in ONE saved transition (previously one save per day and eye, queued
  // again on every revision change). A failure here never blocks the app: it is retried on the next
  // day change, app resume or saved change, and nothing is lost meanwhile.
  const autoFilling = useRef(false);
  useEffect(() => {
    if (loading || autoFilling.current) return;
    autoFilling.current = true;
    dispatch({ type: 'autoFill', id: uid() }).catch(() => {}).finally(() => { autoFilling.current = false; });
  },[loading,today,state.revision,dispatch]);
  return <AppContext.Provider value={{ state, loading, error, syncWarning, today, dispatch, retry, resync }}>{children}</AppContext.Provider>;
}
export function useApp() { const context = useContext(AppContext); if (!context) throw new Error('Uygulama bağlamı bulunamadı.'); return context; }

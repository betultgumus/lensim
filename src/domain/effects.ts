import { activeCycles } from './reducer.ts';
import { addDays, dateOnly, formatDate, getCycleProgress, getDaysRemaining, getNotificationDates, parseDate, statusCopy, trackingDay } from './dates.ts';
import type { AppState, LensPackage } from './types.ts';

export type Reminder = { key: string; date: Date; body: string; kind?: 'daily-checkin'|'package-expired'; packageIds?: string[]; eye?: 'left'|'right' };
export function notificationPlan(state: AppState, now = new Date()): Reminder[] {
  if (!state.settings.notifications) return [];
  const result: Reminder[] = [];
  for (const c of activeCycles(state)) {
    const offsets = c.plan.kind === 'daily' ? [0] : state.settings.offsets;
    for (const date of getNotificationDates(c.due, offsets, state.settings.notificationTime, now)) {
      if (dateOnly(date) < c.start) continue;
      const eye = c.profileId === 'both' ? 'Lenslerin' : c.profileId === 'left' ? 'Sol lensin' : 'Sağ lensin';
      result.push({ key: `lens:${c.id}:${+date}`, date, body: c.plan.kind === 'daily' ? 'Günlük lensini kullanım sonunda atmayı unutma.' : `${eye} için değişim tarihi: ${formatDate(c.due)}. Ürün talimatını esas al.` });
    }
  }
  const packages=state.packages.filter(p=>!p.closedOn&&p.openedOn<=trackingDay(now));
  for (const pack of packages) {
    const box=state.boxes.find(b=>b.id===pack.boxId); if(!box)continue;const duration=pack.durationDaysSnapshot??box.durationDays;if(duration<=1)continue;
    const due=addDays(pack.openedOn,duration-1);
    for(const date of getNotificationDates(due,state.settings.offsets,state.settings.notificationTime,now)) {
      if(dateOnly(date)<pack.openedOn) continue;
      const days=getDaysRemaining(due,dateOnly(date));
      result.push({key:`package:${pack.id}:${+date}`,date,body:days===0?`${pack.eye==='right'?'Sağ':'Sol'} lensinin bugün son günü.`:`${pack.eye==='right'?'Sağ':'Sol'} lensinin ${days} günü kaldı.`});
    }
    const expiredDate=parseDate(addDays(due,1));const [notifyHour,notifyMinute]=state.settings.notificationTime.split(':').map(Number);expiredDate.setHours(notifyHour!,notifyMinute!,0,0);
    if(expiredDate>now)result.push({key:`package-expired:${pack.id}`,date:expiredDate,body:`${pack.eye==='right'?'Sağ':'Sol'} lensinin süresi doldu. Yenisini açtın mı?`,kind:'package-expired',eye:pack.eye});
  }
  if(packages.length) {
    const [hour,minute]=state.settings.notificationTime.split(':').map(Number);
    for(let i=0;i<30;i++) {
      const day=addDays(trackingDay(now),i); const packageIds=packages.filter(p=>!state.checkIns.some(c=>c.packageId===p.id&&c.date===day)).map(p=>p.id);
      if(!packageIds.length)continue;
      const date=parseDate(day);date.setHours(hour!,minute!,0,0);if(date<=now)continue;
      result.push({key:`daily-check:${+date}:${packageIds.join(',')}`,date,body:'Bugün lens taktın mı?',kind:'daily-checkin',packageIds});
    }
  }
  for (const e of state.auxiliary.filter(e => !e.completed && state.modules[e.kind])) {
    for (const date of getNotificationDates(e.due, [0], state.settings.notificationTime, now)) result.push({ key: `${e.kind}:${e.id}:${+date}`, date, body: `${e.kind === 'case' ? 'Lens kabı' : 'Solüsyon'} değişim tarihin geldi. Ürün talimatını kontrol et.` });
  }
  return result.sort((a,b) => +a.date - +b.date).slice(0, 60);
}
export type WidgetProps = { title: string; value: string; label: string; due: string; summary: string; color: string; background: string; mascot: boolean; face: string; stock: string; progress: number };
const colors = { lavender: '#7456C3', mint: '#267257', rose: '#A14472', peach: '#A15B31', sky: '#346CA2' };
const backgrounds = { lavender: '#F2EDFF', mint: '#E4F6EC', rose: '#FBEAF3', peach: '#FFF0E5', sky: '#E8F3FF' };
/** Widget storage never receives journal notes, lens powers, brands or historical records. */
export function androidWidgetSnapshot(state: AppState) {
  const { theme, mode, mascot, widgetStyle, widgetScope, widgetStock } = state.settings;
  return {
    settings: { theme, mode, mascot, widgetStyle, widgetScope, widgetStock },
    modules: { separate: state.modules.separate, stock: state.modules.stock },
    cycles: activeCycles(state).map(c => ({ start:c.start, due:c.due, profileId:c.profileId, completed:null, plan:{ kind:c.plan.kind } })),
    widget: widgetProps(state,trackingDay()),
    stock: { pieces: state.modules.stock && widgetStock ? state.stock.pieces : 0 },
  };
}
export function widgetProps(state: AppState, day: string): WidgetProps {
  const packages=state.packages.filter(p=>!p.closedOn&&p.openedOn<=day).sort((a,b)=>a.openedOn.localeCompare(b.openedOn));
  if(packages.length){
    const selected=(state.settings.widgetScope==='left'||state.settings.widgetScope==='right'?packages.find(p=>p.eye===state.settings.widgetScope):packages.find(p=>p.eye==='right'))??packages[0]!;
    const box=state.boxes.find(b=>b.id===selected.boxId)!;
    const eyeText=(eye:'left'|'right')=>eye==='right'?'Sağ':'Sol';
    const display=(pack:LensPackage)=>{
      const lensBox=state.boxes.find(b=>b.id===pack.boxId)!;const wornDates=state.checkIns.filter(c=>c.packageId===pack.id&&c.status==='worn').map(c=>c.date);
      const duration=pack.durationDaysSnapshot??lensBox.durationDays;
      if(duration===1){const count=new Set(wornDates.filter(d=>d.slice(0,7)===day.slice(0,7))).size;return{value:String(count),label:`${count} gün taktın`,due:`Kutuda ${lensBox.lensesRemaining} lens`,progress:Math.min(1,count/30)};}
      const elapsed=Math.max(1,getDaysRemaining(day,pack.openedOn)+1);const remaining=duration-elapsed;const overdue=Math.max(0,-remaining);
      return{value:`${elapsed}/${duration}`,label:`${elapsed} gündür açık · ${new Set(wornDates).size} gün taktın`,due:overdue?`Süre geçti · +${overdue} gün aşım`:remaining===0?'Bugün son gün':`${remaining} gün kaldı`,progress:Math.min(1,elapsed/duration),overdue};
    };
    const primary=display(selected);
    const summary=packages.length>1?packages.map(p=>`${eyeText(p.eye)} ${display(p).value}`).join(' · '):'';
    const overdue=Boolean(primary.overdue);
    return{title:'Lensim',value:primary.value,label:primary.label,due:primary.due,summary,color:overdue?'#C8243B':selected.eye==='right'?'#0754C8':'#5A9FD9',background:overdue?'#FDEBED':state.settings.mode==='dark'?'#211C30':backgrounds[state.settings.theme],mascot:state.settings.widgetStyle==='mascot'&&state.settings.mascot!=='none',face:overdue?'pufi':state.settings.mascot,stock:state.settings.widgetStock?`Yedek: ${box.lensesRemaining} lens`:'',progress:primary.progress};
  }
  const cycles = activeCycles(state);
  const sorted = [...cycles].sort((a,b) => a.due.localeCompare(b.due));
  const cycle = state.settings.widgetScope === 'summary' ? sorted[0] : cycles.find(c => c.profileId === state.settings.widgetScope) ?? sorted[0];
  const copy = cycle ? statusCopy(cycle, day) : null;
  return {
    title: 'Lensim', value: copy?.number ?? 'Merhaba', label: copy?.label ?? 'İlk lens paketini ekle',
    due: cycle ? `Değişim: ${formatDate(cycle.due, true)}` : 'Uygulamayı aç',
    summary: state.modules.separate ? cycles.map(c => `${c.profileId === 'left' ? 'Sol' : 'Sağ'}: ${statusCopy(c, day).number} ${statusCopy(c, day).label}`).join(' · ') : '',
    color: colors[state.settings.theme], background: state.settings.mode === 'dark' ? '#211C30' : backgrounds[state.settings.theme],
    mascot: state.settings.widgetStyle === 'mascot' && state.settings.mascot !== 'none', face: state.settings.mascot,
    stock: state.modules.stock && state.settings.widgetStock ? `${state.stock.pieces} lens stokta` : '',
    progress: cycle ? getCycleProgress(cycle,day) : 0,
  };
}
/** Local midnights, not increments of 24h; final entry has no stale countdown. */
export function generateWidgetTimeline(state: AppState, now = new Date(), days = 62) {
  const entries = [{ date: now, props: widgetProps(state, dateOnly(now)) }];
  for (let i = 1; i <= days; i++) {
    const day = addDays(dateOnly(now), i); const date = parseDate(day); date.setHours(0,0,0,0);
    entries.push({ date, props: widgetProps(state, day) });
  }
  const final = parseDate(addDays(dateOnly(now), days + 1)); final.setHours(0,0,0,0);
  entries.push({ date: final, props: { ...widgetProps(state, dateOnly(final)), value: 'Tarihini', label: 'kontrol et', summary: '' } });
  return entries;
}

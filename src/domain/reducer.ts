import { addDays, dateOnly, getNextReplacementDate, isWithinEntryWindow, parseDate, timeParts, validatePlan } from './dates.ts';
import { defaultState, type AppState, type Plan, type Scope, type Settings, type ModuleKey, type Journal, type Auxiliary, type LensBox, type LensPackage, type Eye, type PrescriptionRecord, type DailyStatus } from './types.ts';

/** Box used for one eye: an existing box id or a new box created in the same transaction. */
export type PackageSource = { boxId?: string; newBox?: LensBox };

export type Action =
  | { type: 'setup'; plan: Plan; start: string; due?: string; id: string }
  | { type: 'completeOnboarding' }
  | { type: 'settings'; patch: Partial<Settings>; /** When the default answer changes: 'update' (default) also rewrites the days filled automatically before; 'keep' leaves them and applies the new default only to days filled from now on. */ pastAutomatic?: 'update' | 'keep' }
  | { type: 'module'; key: ModuleKey; enabled: boolean }
  | { type: 'separate'; enabled: boolean; copy: boolean }
  | { type: 'edit'; scope: Scope; plan: Plan; start: string; due?: string; brand: string; power: string }
  | { type: 'replace'; cycleId: string; date: string; id: string; allowEmptyStock?: boolean }
  | { type: 'correctHistory'; cycleId: string; date: string }
  | { type: 'openDaily'; scope: Scope; date: string; id: string; allowEmptyStock?: boolean }
  | { type: 'openLens'; scope: Scope; date: string; id: string; allowEmptyStock?: boolean }
  | { type: 'undo'; expectedRevision: number; previous: AppState }
  | { type: 'stock'; pieces: number; reason: string; id: string; date: string }
  | { type: 'stockSettings'; autoDeduct: boolean; unit: 'pairs' | 'pieces' }
  | { type: 'auxiliary'; entry: Auxiliary }
  | { type: 'journal'; entry: Journal }
  | { type: 'deleteJournal'; id: string }
  | { type: 'addBox'; box: LensBox }
  | { type: 'editBox'; id:string; patch: Partial<Pick<LensBox,'name'|'brand'|'lensType'|'durationDays'|'lensesTotal'|'lensesRemaining'|'prescription'>> }
  | { type: 'openPackage'; id: string; boxId: string; eye: Eye; date: string }
  | { type: 'openPackages'; ids: string[]; boxId?: string; newBox?: LensBox; boxes?: PackageSource[]; eyes: Eye[]; date: string; pairId?: string; durationDays?:number }
  | { type:'deletePackage';id:string;withPair?:boolean }
  | { type:'editPackage';id:string;openedOn:string;durationDays:number;withPair?:boolean }
  | { type: 'closePackage'; id: string; date: string }
  | { type: 'checkIn'; id: string; packageId: string; date: string; status: 'worn' | 'notWorn' | 'glasses'; automatic?: boolean }
  | { type: 'dailyStatus'; id:string; date:string; status:'worn'|'notWorn'|'glasses'; automatic?:boolean; moveOpening?:boolean; /** "Taktım" before any package, keeping the opening date: only the day's answer is saved. */ keepOpening?:boolean }
  | { type:'bulkDailyStatus';id:string;dates:string[];status:'worn'|'notWorn'|'glasses' }
  | { type:'autoFill';id:string }
  | { type: 'prescriptionRecord'; entry: PrescriptionRecord }
  | { type: 'deletePrescriptionRecord'; id:string }
  | { type: 'setBackup'; enabled: boolean }
  | { type: 'restore'; state: AppState }
  | { type: 'reset' };

export function activeCycles(state: AppState) {
  return state.cycles.filter(c => !c.completed && (state.modules.separate ? c.profileId !== 'both' : c.profileId === 'both'));
}
// State contains JSON values only. Do not depend on structuredClone availability in Hermes.
function cloneState(state: AppState): AppState { return JSON.parse(JSON.stringify(state)) as AppState; }
/**
 * Writes the single shared answer for a day and mirrors it to every package open that day.
 * An automatic write never changes an answer that already exists for the day: it only fills
 * the missing per-package records with the existing answer. This keeps manual corrections
 * intact when auto-fill or package edits regenerate records.
 */
function setDailyStatus(state:AppState,id:string,date:string,status:'worn'|'notWorn'|'glasses',automatic:boolean,today:string,requiredPackageId?:string,force=false,allowNoPackage=false){
  const fromAutomation=automatic;
  parseDate(date);if(date>today)throw new Error('Gelecek gün işaretlenemez.');if(!fromAutomation&&!isWithinEntryWindow(date,today))throw new Error('Geçmiş kullanım kaydı en fazla 30 gün geriye girilebilir.');
  const applicable=state.packages.filter(p=>p.openedOn<=date&&(!p.closedOn||date<=p.closedOn));
  if(requiredPackageId&&!applicable.some(p=>p.id===requiredPackageId))throw new Error('Bu tarih için açık lens paketi yok.');
  const day=state.dailyStatuses.find(d=>d.date===date);
  // `force` is only used when the default answer changes: it rewrites a day that is still automatic.
  if(fromAutomation&&day&&!force){status=day.status;automatic=day.automatic;}
  // A "worn" day outside every package is only kept when the person chose it (keeping the package opening date);
  // recalculations keep such a manual day as it is.
  if(status==='worn'&&!applicable.length&&!allowNoPackage&&!(fromAutomation&&day&&!day.automatic))throw new Error('Lens takıldı kaydı için o gün açık bir paket bulunmalı.');
  if(day){day.status=status;day.automatic=automatic;}else state.dailyStatuses.push({id,date,status,automatic});
  for(const pack of applicable){
    const existing=state.checkIns.find(c=>c.packageId===pack.id&&c.date===date);const box=state.boxes.find(b=>b.id===pack.boxId)!;let stockUsed=existing?.stockUsed??existing?.status==='worn';
    if((pack.durationDaysSnapshot??box.durationDays)===1){const willWear=status==='worn';if(!stockUsed&&willWear&&box.lensesRemaining<1&&!fromAutomation)throw new Error('Günlük lens kutusunda yedek kalmamış.');if(stockUsed&&!willWear){box.lensesRemaining+=1;stockUsed=false;}else if(!stockUsed&&willWear&&box.lensesRemaining>0){box.lensesRemaining-=1;stockUsed=true;}else if(!willWear)stockUsed=false;}
    if(existing){existing.status=status;existing.automatic=automatic;if((pack.durationDaysSnapshot??box.durationDays)===1)existing.stockUsed=stockUsed;}
    else state.checkIns.push({id:`${id}-${pack.id}`,packageId:pack.id,date,status,automatic,...((pack.durationDaysSnapshot??box.durationDays)===1?{stockUsed}:{})});
  }
}
/** Removes a package's day records outside its open range, returning daily lenses to its box. */
function releaseCheckInsOutside(state:AppState,pack:LensPackage){
  const box=state.boxes.find(b=>b.id===pack.boxId);
  for(const c of state.checkIns.filter(c=>c.packageId===pack.id&&(c.date<pack.openedOn||(pack.closedOn!==null&&c.date>pack.closedOn)))){
    if(c.stockUsed&&box)box.lensesRemaining=Math.min(box.lensesTotal,box.lensesRemaining+1);
  }
  state.checkIns=state.checkIns.filter(c=>c.packageId!==pack.id||(c.date>=pack.openedOn&&(pack.closedOn===null||c.date<=pack.closedOn)));
}
/** For each eye, the first package opened after a date when nothing of that eye covers the gap. */
export function packagesOpenedAfter(state:AppState,date:string):LensPackage[]{
  const result:LensPackage[]=[];
  for(const eye of ['right','left'] as const){
    const next=state.packages.filter(p=>p.eye===eye&&p.openedOn>date).sort((a,b)=>a.openedOn.localeCompare(b.openedOn))[0];
    if(next&&!state.packages.some(p=>p.eye===eye&&p.id!==next.id&&p.openedOn<next.openedOn&&(!p.closedOn||p.closedOn>=date)))result.push(next);
  }
  return result;
}
/**
 * Days that the automatic answer should fill: every day from a package's start up to yesterday
 * that has no record for that package. A package's start is its opening day, except when the
 * package was added to Lensim later with a backdated opening: the days before it was added were
 * never asked about, so they stay unanswered (the home screen asks the person to mark them)
 * instead of being filled silently the moment the package is saved.
 */
export function missingAutoDays(state:AppState,today:string):string[]{
  const through=addDays(today,-1);const result=new Set<string>();
  for(const pack of state.packages){
    if(pack.boxId.startsWith('legacy-box-'))continue;
    const from=pack.createdOn&&pack.createdOn>pack.openedOn?pack.createdOn:pack.openedOn;
    const last=pack.closedOn&&pack.closedOn<through?pack.closedOn:through;
    for(let date=from;date<=last;date=addDays(date,1))if(!state.checkIns.some(c=>c.packageId===pack.id&&c.date===date))result.add(date);
  }
  return [...result].sort();
}
/** Days inside an open package (up to yesterday) that still have no answer at all, e.g. backdated days. */
export function unansweredDays(state:AppState,today:string):string[]{
  const through=addDays(today,-1);const result=new Set<string>();const answered=new Set(state.dailyStatuses.map(d=>d.date));
  for(const pack of state.packages.filter(p=>!p.closedOn)){
    for(let date=pack.openedOn<addDays(today,-30)?addDays(today,-30):pack.openedOn;date<=through;date=addDays(date,1))if(!answered.has(date))result.add(date);
  }
  return [...result].sort();
}
/** Re-mirrors existing daily answers from a date onward without changing any answer. */
function regenerateFrom(state:AppState,from:string,today:string){
  for(const day of state.dailyStatuses.filter(d=>d.date>=from&&d.date<=today).sort((a,b)=>a.date.localeCompare(b.date)))setDailyStatus(state,day.id,day.date,day.status,true,today);
}
function validDates(start: string, due: string) {
  parseDate(start); parseDate(due);
  if (due < start) throw new Error('Değişim tarihi başlangıçtan önce olamaz.');
}
function deduct(state: AppState, scope: Scope, id: string, date: string, allowEmpty = false) {
  if (!state.modules.stock || !state.stock.autoDeduct) return;
  const pieces = scope === 'both' ? 2 : 1;
  if (state.stock.pieces < pieces && !allowEmpty) throw new Error('Stok yetersiz. Önce stok ekle veya otomatik azaltmayı kapat.');
  if (state.stock.pieces < pieces) return;
  state.stock.pieces -= pieces;
  state.movements.push({ id: `stock-${id}`, cycleId: id, date, delta: -pieces, reason: 'Yeni lens açıldı' });
}
/** Pure atomic transition. Persistence commits the entire transition before external effects. */
export function transition(previous: AppState, action: Action, today = dateOnly()): AppState {
  if (action.type === 'reset') { const empty = defaultState(); empty.revision = previous.revision + 1; return empty; }
  if (action.type === 'restore') { const restored = validateState(action.state); return { ...restored, revision: previous.revision + 1 }; }
  const state: AppState = cloneState(previous);
  switch (action.type) {
    case 'setup': {
      if (state.onboarded) throw new Error('Kurulum zaten tamamlandı.');
      validatePlan(action.plan);
      const due = action.plan.kind === 'daily' ? action.start : action.due || getNextReplacementDate(action.start, action.plan);
      validDates(action.start, due);
      state.profiles = [{ id: 'both', plan: action.plan, brand: '', power: '' }];
      state.cycles = [{ id: action.id, profileId: 'both', start: action.start, due, completed: null, plan: action.plan }];
      state.onboarded = true; break;
    }
    case 'settings': {
      if (action.patch.notificationTime) timeParts(action.patch.notificationTime);
      if (action.patch.nightReminderTime) timeParts(action.patch.nightReminderTime);
      const changedDefault = action.patch.defaultAnswer && action.patch.defaultAnswer !== state.settings.defaultAnswer ? action.patch.defaultAnswer : null;
      state.settings = { ...state.settings, ...action.patch };
      // Automatic days mean "unanswered, counted with the default". When the default changes they follow it
      // unless the person chose to keep them; days the person answered (automatic === false) are never touched.
      if (changedDefault && action.pastAutomatic !== 'keep') for (const day of state.dailyStatuses.filter(d => d.automatic && d.status !== changedDefault)) {
        if (changedDefault === 'worn' && !state.packages.some(p => p.openedOn <= day.date && (!p.closedOn || day.date <= p.closedOn))) continue;
        setDailyStatus(state, day.id, day.date, changedDefault, true, today, undefined, true);
      }
      break;
    }
    case 'completeOnboarding': state.onboarded = true; break;
    case 'module':
      if (action.key === 'separate') throw new Error('Ayrı takip geçişini onay ekranından yap.');
      state.modules[action.key] = action.enabled; break;
    case 'separate': {
      if (action.enabled && !state.profiles.some(p => p.id === 'left')) {
        const both = state.profiles.find(p => p.id === 'both'); const current = activeCycles(state)[0];
        if (!both || !current || !action.copy) throw new Error('Önce iki göz için etkin bir döngü başlat.');
        for (const scope of ['left','right'] as const) {
          state.profiles.push({ ...both, id: scope });
          state.cycles.push({ ...current, id: `${current.id}-${scope}`, profileId: scope });
        }
      }
      // Original and separate cycles remain stored; inactive scopes are frozen from UI/effects only.
      state.modules.separate = action.enabled; break;
    }
    case 'edit': {
      validatePlan(action.plan);
      const profile = state.profiles.find(p => p.id === action.scope);
      if (!profile) throw new Error('Lens profili bulunamadı.');
      const cycle = state.cycles.find(c => c.profileId === action.scope && !c.completed);
      const due = action.plan.kind === 'daily' ? action.start : action.due || getNextReplacementDate(action.start, action.plan);
      validDates(action.start, due);
      if (cycle) Object.assign(cycle, { start: action.start, due, plan: action.plan });
      Object.assign(profile, { plan: action.plan, brand: action.brand, power: action.power }); break;
    }
    case 'replace': {
      const cycle = state.cycles.find(c => c.id === action.cycleId);
      // A completed cycle ID makes repeated taps idempotent, including process retries.
      if (!cycle || cycle.completed) return previous;
      if (!activeCycles(state).some(c => c.id === cycle.id)) throw new Error('Bu takip şu anda etkin değil.');
      parseDate(action.date);
      if (action.date < cycle.start || action.date > today) throw new Error('Gerçek değişim tarihi başlangıç ile bugün arasında olmalı.');
      cycle.completed = action.date;
      if (cycle.plan.kind !== 'daily') {
        const profile = state.profiles.find(p => p.id === cycle.profileId)!;
        state.cycles.push({ id: action.id, profileId: cycle.profileId, start: action.date, due: getNextReplacementDate(action.date, profile.plan), completed: null, plan: profile.plan });
        deduct(state, cycle.profileId, action.id, action.date, action.allowEmptyStock);
      }
      break;
    }
    case 'openDaily':
    case 'openLens': {
      parseDate(action.date);
      if (action.date > today) throw new Error('Yeni lens açılışı geleceğe kaydedilemez.');
      if (state.cycles.some(c => c.id === action.id)) return previous;
      if (state.cycles.some(c => c.profileId === action.scope && !c.completed)) throw new Error('Önce kullanılan lensi attığını kaydet.');
      const profile = state.profiles.find(p => p.id === action.scope);
      if (!profile || (action.type === 'openDaily' && profile.plan.kind !== 'daily')) throw new Error('Lens planı bulunamadı.');
      if (state.modules.separate ? action.scope === 'both' : action.scope !== 'both') throw new Error('Bu takip şu anda etkin değil.');
      const last = state.cycles.filter(c => c.profileId === action.scope && c.completed).at(-1);
      if (last?.completed && action.date < last.completed) throw new Error('Yeni kullanım önceki kayıttan önce başlayamaz.');
      state.cycles.push({ id: action.id, profileId: action.scope, start: action.date, due: getNextReplacementDate(action.date,profile.plan), completed: null, plan: profile.plan });
      deduct(state, action.scope, action.id, action.date, action.allowEmptyStock); break;
    }
    case 'correctHistory': {
      const cycle = state.cycles.find(c => c.id === action.cycleId);
      if (!cycle?.completed) throw new Error('Tamamlanan kayıt bulunamadı.');
      parseDate(action.date);
      if (action.date < cycle.start || action.date > today) throw new Error('Gerçek tarih başlangıç ile bugün arasında olmalı.');
      const index = state.cycles.indexOf(cycle);
      const next = state.cycles.slice(index + 1).find(c => c.profileId === cycle.profileId);
      const linked = next && cycle.plan.kind !== 'daily' && next.start === cycle.completed;
      if (next && action.date > (next.completed ?? (linked ? today : next.start))) throw new Error('Bu tarih sonraki kayıtla çakışıyor. Önce sonraki kaydı kontrol et.');
      if (next && cycle.plan.kind !== 'daily' && next.start === cycle.completed) {
        const manual = next.due !== getNextReplacementDate(next.start, next.plan);
        next.start = action.date;
        if (!manual) next.due = getNextReplacementDate(action.date, next.plan);
        validDates(next.start, next.due);
        state.movements.filter(m => m.cycleId === next.id).forEach(m => { m.date = action.date; });
      }
      cycle.completed = action.date; break;
    }
    case 'undo':
      if (previous.revision !== action.expectedRevision) throw new Error('Sonrasında başka değişiklik yapıldı; geri alma artık mümkün değil.');
      return { ...cloneState(action.previous), revision: previous.revision + 1 };
    case 'stock': {
      if (!Number.isInteger(action.pieces) || action.pieces < 0) throw new Error('Stok negatif olmayan tam lens adedi olmalı.');
      state.movements.push({ id: action.id, date: action.date, delta: action.pieces - state.stock.pieces, reason: action.reason });
      state.stock.pieces = action.pieces; break;
    }
    case 'stockSettings': state.stock = { ...state.stock, autoDeduct: action.autoDeduct, unit: action.unit }; break;
    case 'auxiliary': {
      validDates(action.entry.start, action.entry.due);
      if (action.entry.start > today) throw new Error('Açılış tarihi gelecekte olamaz.');
      if (state.auxiliary.some(e => e.kind === action.entry.kind && !e.completed && action.entry.start < e.start)) throw new Error('Yeni açılış önceki açılıştan önce olamaz.');
      state.auxiliary.filter(e => e.kind === action.entry.kind && !e.completed).forEach(e => { e.completed = action.entry.start; });
      state.auxiliary.push(action.entry); break;
    }
    case 'journal':
      parseDate(action.entry.date);
      if (action.entry.date > today) throw new Error('Günlük tarihi gelecekte olamaz.');
      if (action.entry.comfort < 1 || action.entry.comfort > 5) throw new Error('Konfor seviyesi 1–5 olmalı.');
      state.journal.push(action.entry); break;
    case 'deleteJournal': state.journal = state.journal.filter(e => e.id !== action.id); break;
    case 'addBox': {
      if (!action.box.name.trim() || !Number.isInteger(action.box.durationDays) || action.box.durationDays < 1 || !Number.isInteger(action.box.lensesTotal) || action.box.lensesTotal < 1) throw new Error('Kutu bilgileri eksik: kutu adını, kutudaki lens sayısını (en az 1) ve kullanım süresini kontrol et.');
      if (state.boxes.some(b => b.id === action.box.id)) return previous;
      state.boxes.push(action.box); break;
    }
    case 'editBox': {
      const box=state.boxes.find(b=>b.id===action.id);if(!box)throw new Error('Lens kutusu bulunamadı.');
      const next={...box,...action.patch};
      if(!next.name.trim()||!Number.isInteger(next.durationDays)||next.durationDays<1||!Number.isInteger(next.lensesTotal)||next.lensesTotal<1||!Number.isInteger(next.lensesRemaining)||next.lensesRemaining<0||next.lensesRemaining>next.lensesTotal)throw new Error('Kutu adı, süre ve lens sayılarını kontrol et.');
      Object.assign(box,action.patch);break;
    }
    case 'openPackage': {
      parseDate(action.date);
      if (!isWithinEntryWindow(action.date,today)) throw new Error('Paket açılış tarihi bugün ile en fazla 30 gün öncesi arasında olmalı.');
      if (state.packages.some(p => p.id === action.id)) return previous;
      if (state.packages.some(p => p.eye === action.eye && !p.closedOn)) throw new Error('Bu gözde zaten açık paket var. Önce mevcut paketi kapat.');
      const box = state.boxes.find(b => b.id === action.boxId);
      if (!box || !box.eyes.includes(action.eye)) throw new Error('Seçilen kutu bu göz için uygun değil.');
      if (box.lensesRemaining < 1) throw new Error('Kutuda lens kalmamış. Yeni kutu ekle.');
      // Reusable lenses consume a backup when the package is opened. Daily lenses
      // consume one lens per worn day, so their stock changes in checkIn below.
      if (box.durationDays > 1) box.lensesRemaining -= 1;
      state.packages.push({ id: action.id, boxId: box.id, eye: action.eye, openedOn: action.date, closedOn: null, createdOn: today, durationDaysSnapshot:box.durationDays,lensTypeSnapshot:box.lensType,prescriptionSnapshot:JSON.parse(JSON.stringify(box.prescription)) });
      for(const day of state.dailyStatuses.filter(d=>d.date>=action.date))setDailyStatus(state,day.id,day.date,day.status,day.automatic,today);break;
    }
    case 'openPackages': {
      parseDate(action.date);
      if (!isWithinEntryWindow(action.date,today)) throw new Error('Paket açılış tarihi bugün ile en fazla 30 gün öncesi arasında olmalı.');
      if (!action.eyes.length || new Set(action.eyes).size!==action.eyes.length || action.ids.length!==action.eyes.length || action.ids.some(id=>state.packages.some(p=>p.id===id))) throw new Error('Göz seçimi anlaşılmadı. “İkisi”, “Sağ” veya “Sol” seçeneğinden birini seçip tekrar dene.');
      const sources=action.boxes??action.eyes.map(()=>({boxId:action.boxId,newBox:action.newBox}));
      if(sources.length!==action.eyes.length)throw new Error('Her göz için bir kutu seç.');
      const created=new Set<string>();const resolved:{box:LensBox;isNew:boolean}[]=[];
      for(let i=0;i<sources.length;i++){
        const src=sources[i]!;let box:LensBox|undefined;
        if(src.newBox){
          const b=src.newBox;
          if(created.has(b.id))box=state.boxes.find(x=>x.id===b.id);
          else{
            if(!b.id||state.boxes.some(existing=>existing.id===b.id)||!b.name.trim()||!Number.isInteger(b.durationDays)||b.durationDays<1||!Number.isInteger(b.lensesTotal)||b.lensesTotal<1||b.lensesRemaining!==b.lensesTotal||!Array.isArray(b.eyes)||!b.eyes.length||b.eyes.some(e=>!['right','left'].includes(e)))throw new Error('Kutu bilgileri eksik: kutu adını, kutudaki lens sayısını (en az 1) ve kullanım süresini kontrol et.');
            box=JSON.parse(JSON.stringify(b)) as LensBox;state.boxes.push(box);created.add(b.id);
            const filled=Object.values(b.prescription.right??{}).some(Boolean)||Object.values(b.prescription.left??{}).some(Boolean)||Boolean(b.prescription.color);
            if(filled)state.prescriptionHistory.push({id:`lens-rx-${b.id}`,date:action.date,kind:'lens',eyes:[...b.eyes],values:{...(b.prescription.right?{right:{...b.prescription.right}}:{}),...(b.prescription.left?{left:{...b.prescription.left}}:{})}});
          }
        } else box=state.boxes.find(b=>b.id===src.boxId);
        if(!box)throw new Error('Seçilen kutu bulunamadı.');
        // Per-eye selection ("Her göze ayrı") may use any saved box for either eye; the box then serves that eye too.
        if(!box.eyes.includes(action.eyes[i]!)){if(action.boxes&&!src.newBox)box.eyes.push(action.eyes[i]!);else throw new Error('Seçilen kutu bu gözler için uygun değil.');}
        resolved.push({box,isNew:Boolean(src.newBox)});
      }
      const existing=action.eyes.map(eye=>state.packages.find(p=>p.eye===eye&&!p.closedOn));
      if(existing.some(p=>p&&action.date<p.openedOn))throw new Error('Yeni paket tarihi açık paketin başlangıcından önce olamaz.');
      // An existing box keeps its own duration; the duration choice applies only to a new box.
      const durations=resolved.map(({box,isNew})=>isNew?(action.durationDays??box.durationDays):box.durationDays);
      if(durations.some(d=>!Number.isInteger(d)||d<1||d>365))throw new Error('Lens kullanım süresini 1–365 gün arasında seç.');
      const needed=new Map<string,number>();for(const {box} of resolved)needed.set(box.id,(needed.get(box.id)??0)+1);
      for(const [boxId,count] of needed){const box=state.boxes.find(b=>b.id===boxId)!;if(box.lensesRemaining<count)throw new Error('Kutuda seçilen gözler için yeterli lens yok.');}
      for(let i=0;i<action.eyes.length;i++){
        const old=existing[i];if(!old)continue;
        old.closedOn=action.date===old.openedOn?action.date:addDays(action.date,-1);
        releaseCheckInsOutside(state,old);
      }
      for(let i=0;i<action.eyes.length;i++){
        const {box}=resolved[i]!;const duration=durations[i]!;
        if(duration>1)box.lensesRemaining-=1;
        state.packages.push({id:action.ids[i]!,boxId:box.id,eye:action.eyes[i]!,openedOn:action.date,closedOn:null,createdOn:today,durationDaysSnapshot:duration,lensTypeSnapshot:box.lensType,prescriptionSnapshot:JSON.parse(JSON.stringify(box.prescription)),...(action.eyes.length===2&&action.pairId?{pairId:action.pairId}:{})});
      }
      regenerateFrom(state,action.date,today);
      state.onboarded=true;break;
    }
    case 'deletePackage': {
      const pack=state.packages.find(p=>p.id===action.id);if(!pack)return previous;
      const targets=[pack,...(action.withPair&&pack.pairId?state.packages.filter(p=>p.pairId===pack.pairId&&p.id!==pack.id):[])];
      let regenerateDate:string|null=null;
      for(const target of targets){
        const box=state.boxes.find(b=>b.id===target.boxId);
        const entries=state.checkIns.filter(c=>c.packageId===target.id);
        if(box){const returned=(target.durationDaysSnapshot??box.durationDays)===1?entries.filter(c=>c.stockUsed).length:1;box.lensesRemaining=Math.min(box.lensesTotal,box.lensesRemaining+returned);}
        state.checkIns=state.checkIns.filter(c=>c.packageId!==target.id);state.packages=state.packages.filter(p=>p.id!==target.id);
        // Deleting the open package undoes the replacement: the package it closed opens again.
        if(!target.closedOn&&!state.packages.some(p=>p.eye===target.eye&&!p.closedOn)){
          const before=state.packages.filter(p=>p.eye===target.eye&&p.closedOn&&p.closedOn<=target.openedOn&&p.closedOn>=addDays(target.openedOn,-1)).sort((a,b)=>b.openedOn.localeCompare(a.openedOn))[0];
          if(before){const from=before.closedOn===target.openedOn?target.openedOn:addDays(before.closedOn!,1);before.closedOn=null;const current=regenerateDate as string|null;regenerateDate=!current||from<current?from:current;}
        }
      }
      if(regenerateDate)regenerateFrom(state,regenerateDate,today);
      // Keep every answer except a worn day that no package covers anymore.
      state.dailyStatuses=state.dailyStatuses.filter(day=>day.status!=='worn'||state.packages.some(p=>p.openedOn<=day.date&&(!p.closedOn||day.date<=p.closedOn)));
      break;
    }
    case 'editPackage': {
      const pack=state.packages.find(p=>p.id===action.id);if(!pack)throw new Error('Paket bulunamadı.');
      parseDate(action.openedOn);if(!isWithinEntryWindow(action.openedOn,today))throw new Error('Açılış tarihi bugün ile son 30 gün arasında olmalı.');
      if(!Number.isInteger(action.durationDays)||action.durationDays<1||action.durationDays>365)throw new Error('Lens süresini 1–365 gün arasında seç.');
      const targets=[pack,...(action.withPair&&pack.pairId?state.packages.filter(p=>p.pairId===pack.pairId&&p.id!==pack.id):[])];
      const targetIds=new Set(targets.map(t=>t.id));
      for(const target of targets){
        const previousDuration=target.durationDaysSnapshot??state.boxes.find(b=>b.id===target.boxId)?.durationDays??30;
        if((previousDuration===1)!==(action.durationDays===1))throw new Error('Paket açıldıktan sonra günlük ve yedekli lens türü değiştirilemez; kutu sayımı etkilenir.');
        if(target.closedOn&&target.closedOn<action.openedOn)throw new Error('Açılış tarihi kapanış tarihinden sonra olamaz.');
        if(state.packages.some(p=>!targetIds.has(p.id)&&p.eye===target.eye&&p.openedOn<=(target.closedOn??today)&&(p.closedOn??today)>=action.openedOn))throw new Error('Bu gözde seçilen tarihle çakışan başka bir paket var.');
      }
      for(const target of targets){target.openedOn=action.openedOn;target.durationDaysSnapshot=action.durationDays;releaseCheckInsOutside(state,target);}
      regenerateFrom(state,action.openedOn,today);
      break;
    }
    case 'closePackage': {
      const pack = state.packages.find(p => p.id === action.id);
      if (!pack || pack.closedOn) return previous;
      parseDate(action.date); if (!isWithinEntryWindow(action.date,today) || action.date < pack.openedOn) throw new Error('Kapanış tarihi açılış günü ile son 30 gün arasında olmalı.');
      pack.closedOn = action.date; break;
    }
    case 'checkIn': {
      const pack=state.packages.find(p=>p.id===action.packageId);if(!pack)throw new Error('Bu tarih için açık lens paketi yok.');
      setDailyStatus(state,action.id,action.date,action.status,action.automatic??false,today,action.packageId);
      break;
    }
    case 'dailyStatus': {
      // "Worn" on a day before the package was opened means the package was really opened that day.
      if(action.moveOpening&&action.status==='worn'&&!state.packages.some(p=>p.openedOn<=action.date&&(!p.closedOn||action.date<=p.closedOn))){
        parseDate(action.date);if(!isWithinEntryWindow(action.date,today))throw new Error('Açılış tarihi bugün ile son 30 gün arasında olmalı.');
        const moved=packagesOpenedAfter(state,action.date);
        if(!moved.length)throw new Error('Bu tarihten sonra açılmış bir paket yok. Önce yeni paket ekle.');
        for(const pack of moved)pack.openedOn=action.date;
        regenerateFrom(state,action.date,today);
      }
      setDailyStatus(state,action.id,action.date,action.status,action.automatic??false,today,undefined,false,Boolean(action.keepOpening));break;
    }
    case 'bulkDailyStatus': {
      const dates=[...new Set(action.dates)].sort();if(!dates.length)throw new Error('Önce takvimden en az bir gün seç.');
      for(const date of dates)setDailyStatus(state,`${action.id}-${date}`,date,action.status,false,today);
      break;
    }
    case 'autoFill': {
      const dates=missingAutoDays(state,today);if(!dates.length)return previous;
      for(const date of dates)setDailyStatus(state,`${action.id}-${date}`,date,state.settings.defaultAnswer,true,today);
      break;
    }
    case 'prescriptionRecord': {
      parseDate(action.entry.date);
      if(!action.entry.id||!['lens','glasses'].includes(action.entry.kind)||!action.entry.eyes.length||action.entry.eyes.some(e=>!['left','right'].includes(e)))throw new Error('Göz numarası kaydını kontrol et.');
      const old=state.prescriptionHistory.findIndex(e=>e.id===action.entry.id);
      if(old>=0)state.prescriptionHistory[old]=action.entry;else state.prescriptionHistory.push(action.entry);break;
    }
    case 'deletePrescriptionRecord': state.prescriptionHistory=state.prescriptionHistory.filter(e=>e.id!==action.id);break;
    case 'setBackup': state.settings.backupEnabled = action.enabled; break;
  }
  state.revision++;
  return state;
}

/** Reject malformed state rather than silently deleting user records. */
export function validateState(value: unknown): AppState {
  const raw = value as AppState;
  if (!raw || raw.version !== 1 || !Number.isInteger(raw.revision) || !raw.settings || !raw.modules || !Array.isArray(raw.cycles) || !Array.isArray(raw.profiles) || !Array.isArray(raw.journal) || !Array.isArray(raw.auxiliary) || !Array.isArray(raw.movements) || !raw.stock) throw new Error('Yerel veriler okunamadı. Veriler korunuyor.');
  const s = raw as AppState;
  Object.assign(s.settings, { defaultAnswer: s.settings.defaultAnswer ?? 'worn', backupEnabled: s.settings.backupEnabled ?? false });
  Object.assign(s.settings,{separateEyeCalendars:s.settings.separateEyeCalendars??false,nightReminder:s.settings.nightReminder??false,nightReminderTime:s.settings.nightReminderTime??'23:00'});
  s.boxes ??= []; s.packages ??= []; s.checkIns ??= []; s.dailyStatuses??=[];s.prescriptionHistory ??=[];
  // Preserve old cycle records by converting them into package records once.
  if (!s.packages.length && s.cycles.length) {
    for (const profile of s.profiles) {
      const related = s.cycles.filter(c => c.profileId === profile.id);
      if (!related.length) continue;
      const boxId = `legacy-box-${profile.id}`;
      const first = related[0]!;
      const durationDays = Math.max(1, first.plan.unit === 'months' ? first.plan.interval * 30 : first.plan.unit === 'weeks' ? first.plan.interval * 7 : first.plan.interval);
      s.boxes.push({ id: boxId, name: profile.brand || 'Eski lens kaydı', brand: profile.brand || '', lensType: 'spherical', durationDays, lensesTotal: 1000000, lensesRemaining: 1000000, eyes: profile.id === 'both' ? ['left','right'] : [profile.id], prescription: { ...(profile.id === 'left' ? { left: { PWR: profile.power } } : profile.id === 'right' ? { right: { PWR: profile.power } } : { left: { PWR: profile.power }, right: { PWR: profile.power } }) } });
      for (const c of related) {
        const eyes: Eye[] = c.profileId === 'both' ? ['right','left'] : [c.profileId];
        for (const eye of eyes) s.packages.push({ id: `${c.id}-${eye}`, boxId, eye, openedOn: c.start, closedOn: c.completed,...(eyes.length===2?{pairId:c.id}:{}) });
      }
    }
  }
  for(const pack of s.packages){const box=s.boxes.find(b=>b.id===pack.boxId);if(box){pack.durationDaysSnapshot??=box.durationDays;pack.lensTypeSnapshot??=box.lensType;pack.prescriptionSnapshot??=JSON.parse(JSON.stringify(box.prescription));}}
  const statusDates=new Set(s.dailyStatuses.map(d=>d.date));for(const c of s.checkIns){if(!statusDates.has(c.date)){s.dailyStatuses.push({id:`legacy-day-${c.date}`,date:c.date,status:c.status,automatic:c.automatic});statusDates.add(c.date);}}
  timeParts(s.settings.notificationTime);timeParts(s.settings.nightReminderTime);if(typeof s.settings.nightReminder!=='boolean')throw new Error('Hatırlatıcı ayarları okunamadı.');
  if (!['worn','notWorn'].includes(s.settings.defaultAnswer) || typeof s.settings.backupEnabled !== 'boolean' || typeof s.settings.separateEyeCalendars!=='boolean') throw new Error('Yedek veya varsayılan cevap ayarı okunamadı.');
  if (!['lavender','mint','rose','peach','sky'].includes(s.settings.theme) || !['system','light','dark'].includes(s.settings.mode) || !['lumi','minti','pufi','none'].includes(s.settings.mascot) || !['mascot','minimal'].includes(s.settings.widgetStyle) || !['both','left','right','summary'].includes(s.settings.widgetScope) || !Array.isArray(s.settings.offsets) || s.settings.offsets.some(n => !Number.isInteger(n) || n < 0 || n > 365)) throw new Error('Görünüm veya hatırlatıcı ayarları okunamadı.');
  for (const key of ['separate','stock','solution','journal','case'] as const) if (typeof s.modules[key] !== 'boolean') throw new Error('Özellik ayarları okunamadı.');
  for (const key of ['reduceMotion','haptics','notifications','widgetStock'] as const) if (typeof s.settings[key] !== 'boolean') throw new Error('Uygulama ayarları okunamadı.');
  const scopes = new Set<string>();
  for (const p of s.profiles) {
    if (!['both','left','right'].includes(p.id) || scopes.has(p.id)) throw new Error('Lens profili tutarsız.');
    scopes.add(p.id); validatePlan(p.plan);
  }
  const active = new Set<string>(); const ids = new Set<string>();
  for (const c of s.cycles) {
    validatePlan(c.plan); validDates(c.start, c.due);
    if (c.completed) { parseDate(c.completed); if (c.completed < c.start) throw new Error('Geçmiş tarihi tutarsız.'); }
    if (!s.profiles.some(p => p.id === c.profileId) || ids.has(c.id)) throw new Error('Döngü kaydı tutarsız.');
    ids.add(c.id);
    if (!c.completed) { if (active.has(c.profileId)) throw new Error('Bir profil için birden fazla etkin döngü var.'); active.add(c.profileId); }
  }
  const boxIds=new Set<string>();
  for (const b of s.boxes) { if (!b.id || boxIds.has(b.id) || !b.name || !Array.isArray(b.eyes) || !b.eyes.length || b.eyes.some(e=>!['left','right'].includes(e)) || !Number.isInteger(b.durationDays) || b.durationDays<1 || !Number.isInteger(b.lensesTotal) || b.lensesTotal<1 || !Number.isInteger(b.lensesRemaining) || b.lensesRemaining < 0 || b.lensesRemaining>b.lensesTotal || !['spherical','toric','multifocal','colored'].includes(b.lensType)) throw new Error('Lens kutusu tutarsız.'); boxIds.add(b.id); }
  const activeEyes=new Set<string>(); const packageIds=new Set<string>();
  for (const p of s.packages) { parseDate(p.openedOn); if (p.closedOn) {parseDate(p.closedOn); if(p.closedOn<p.openedOn)throw new Error('Paket kapanış tarihi tutarsız.');} if (!s.boxes.some(b => b.id === p.boxId) || packageIds.has(p.id)) throw new Error('Paket kutusu bulunamadı veya yineleniyor.'); packageIds.add(p.id); if(!p.closedOn){if(activeEyes.has(p.eye))throw new Error('Aynı gözde birden fazla açık paket var.');activeEyes.add(p.eye);} }
  const checkInKeys=new Set<string>();
  for (const c of s.checkIns) { parseDate(c.date); const p=s.packages.find(p=>p.id===c.packageId); const key=`${c.packageId}:${c.date}`; if (!['worn','notWorn','glasses'].includes(c.status) || !p || c.date<p.openedOn || (p.closedOn&&c.date>p.closedOn) || checkInKeys.has(key) || typeof c.automatic!=='boolean' || (c.stockUsed!==undefined&&typeof c.stockUsed!=='boolean')) throw new Error('Günlük kullanım kaydı tutarsız.'); checkInKeys.add(key); }
  for(const entry of s.prescriptionHistory){parseDate(entry.date);if(!entry.id||!['lens','glasses'].includes(entry.kind)||!Array.isArray(entry.eyes)||!entry.eyes.length||entry.eyes.some(e=>!['left','right'].includes(e)))throw new Error('Göz numarası geçmişi tutarsız.');}
  const dailyDates=new Set<string>();for(const d of s.dailyStatuses){parseDate(d.date);if(!d.id||!['worn','notWorn','glasses'].includes(d.status)||typeof d.automatic!=='boolean'||dailyDates.has(d.date))throw new Error('Günlük durum kaydı tutarsız.');dailyDates.add(d.date);}
  if (!Number.isInteger(s.stock.pieces) || s.stock.pieces < 0) throw new Error('Stok kaydı tutarsız.');
  for (const j of s.journal) { parseDate(j.date); if (!Array.isArray(j.symptoms) || typeof j.note !== 'string' || !Number.isInteger(j.comfort) || j.comfort < 1 || j.comfort > 5) throw new Error('Günlük kaydı okunamadı.'); }
  for (const e of s.auxiliary) { validDates(e.start, e.due); if (!['case','solution'].includes(e.kind)) throw new Error('Yardımcı kayıt okunamadı.'); }
  return s;
}

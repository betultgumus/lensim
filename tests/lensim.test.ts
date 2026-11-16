import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../src/domain/types.ts';
import { transition, validateState } from '../src/domain/reducer.ts';
import { notificationPlan } from '../src/domain/effects.ts';

const box=(durationDays:number, eyes:('right'|'left')[]=['right','left'])=>({id:'box',name:'Aylık',brand:'',lensType:'spherical' as const,durationDays,lensesTotal:6,lensesRemaining:6,eyes,prescription:{}});

test('opening a two-eye monthly package uses two backups immediately',()=>{
  let state=transition(defaultState(),{type:'addBox',box:box(30)});
  state=transition(state,{type:'openPackage',id:'r',boxId:'box',eye:'right',date:'2026-11-15'});
  state=transition(state,{type:'openPackage',id:'l',boxId:'box',eye:'left',date:'2026-11-15'});
  assert.equal(state.boxes[0]!.lensesRemaining,4);
});

test('onboarding opens both eyes and deducts stock in one transaction',()=>{
  const source=defaultState();
  const opened=transition(source,{type:'openPackages',ids:['right','left'],newBox:box(30),eyes:['right','left'],date:'2026-11-15',pairId:'both'});
  assert.equal(source.boxes.length,0);
  assert.equal(opened.onboarded,true);
  assert.equal(opened.boxes[0]!.lensesRemaining,4);
  assert.equal(opened.packages[0]!.pairId,opened.packages[1]!.pairId);
  assert.throws(()=>transition(source,{type:'openPackages',ids:['right','left'],newBox:{...box(30),lensesTotal:1,lensesRemaining:1},eyes:['right','left'],date:'2026-11-15'}));
  assert.equal(source.boxes.length,0);
});

test('daily lens stock is reduced by a worn day and restored when corrected',()=>{
  let state=transition(defaultState(),{type:'addBox',box:box(1,['right'])});
  state=transition(state,{type:'openPackage',id:'r',boxId:'box',eye:'right',date:'2026-11-15'});
  assert.equal(state.boxes[0]!.lensesRemaining,6);
  state=transition(state,{type:'checkIn',id:'day',packageId:'r',date:'2026-11-15',status:'worn'});
  assert.equal(state.boxes[0]!.lensesRemaining,5);
  state=transition(state,{type:'checkIn',id:'day',packageId:'r',date:'2026-11-15',status:'notWorn',automatic:true});
  assert.equal(state.boxes[0]!.lensesRemaining,6);
  assert.equal(state.checkIns[0]!.automatic,true);
});

test('a daily answer entered for one eye is shared with every active eye; glasses is distinct',()=>{
  let state=transition(defaultState(),{type:'openPackages',ids:['right','left'],newBox:box(30),eyes:['right','left'],date:'2026-11-01',pairId:'pair'},'2026-11-01');
  state=transition(state,{type:'closePackage',id:'left',date:'2026-11-09'},'2026-11-15');
  state=transition(state,{type:'openPackage',id:'next-left',boxId:'box',eye:'left',date:'2026-11-10'},'2026-11-10');
  state=transition(state,{type:'checkIn',id:'day',packageId:'right',date:'2026-11-10',status:'glasses'},'2026-11-15');
  const records=state.checkIns.filter(c=>c.date==='2026-11-10');
  assert.equal(records.length,2);
  assert(records.every(c=>c.status==='glasses'));
  state=transition(state,{type:'checkIn',id:'fix',packageId:'next-left',date:'2026-11-10',status:'worn'},'2026-11-15');
  assert(state.checkIns.filter(c=>c.date==='2026-11-10').every(c=>c.status==='worn'));
});

test('opening dates obey the thirty-day manual entry limit',()=>{
  const source=defaultState();
  assert.throws(()=>transition(source,{type:'openPackages',ids:['r'],newBox:box(30,['right']),eyes:['right'],date:'2026-10-15'},'2026-11-15'),/30 gün/);
  const ok=transition(source,{type:'openPackages',ids:['r'],newBox:box(30,['right']),eyes:['right'],date:'2026-10-16'},'2026-11-15');
  assert.equal(ok.packages[0]!.openedOn,'2026-10-16');
});

test('glasses days can be recorded without an active lens package but lens days cannot',()=>{
  let state=transition(defaultState(),{type:'dailyStatus',id:'glasses-day',date:'2026-11-15',status:'glasses'},'2026-11-15');
  assert.equal(state.dailyStatuses[0]!.status,'glasses');
  assert.throws(()=>transition(state,{type:'dailyStatus',id:'no-lens',date:'2026-11-15',status:'worn'},'2026-11-15'),/açık bir paket/);
});

test('daily status stores a single shared source while keeping package stock entries synchronized',()=>{
  let state=transition(defaultState(),{type:'openPackages',ids:['right','left'],newBox:box(30),eyes:['right','left'],date:'2026-11-15'});
  state=transition(state,{type:'checkIn',id:'wear',packageId:'right',date:'2026-11-15',status:'worn'});
  assert.equal(state.dailyStatuses.filter(d=>d.date==='2026-11-15').length,1);
  assert.equal(state.dailyStatuses[0]!.status,'worn');
  assert.equal(state.checkIns.filter(c=>c.date==='2026-11-15').length,2);
});
test('bulk calendar status is all-or-nothing and applies to both eyes',()=>{
  let state=transition(defaultState(),{type:'openPackages',ids:['r','l'],newBox:box(30),eyes:['right','left'],date:'2026-11-01'},'2026-11-15');
  state=transition(state,{type:'bulkDailyStatus',id:'batch',dates:['2026-11-02','2026-11-03'],status:'glasses'},'2026-11-15');
  assert.equal(state.dailyStatuses.filter(d=>d.status==='glasses').length,2);
  assert.equal(state.checkIns.filter(c=>c.status==='glasses').length,4);
  assert.throws(()=>transition(state,{type:'bulkDailyStatus',id:'bad',dates:['2026-11-04','2026-10-15'],status:'worn'},'2026-11-15'),/30 gün/);
  assert.equal(state.dailyStatuses.some(d=>d.date==='2026-11-04'),false);
});
test('package duration can be changed after opening and delete returns the reserved lens',()=>{
  let state=transition(defaultState(),{type:'openPackages',ids:['r'],newBox:box(30,['right']),eyes:['right'],date:'2026-11-01'},'2026-11-15');
  state=transition(state,{type:'editPackage',id:'r',openedOn:'2026-11-02',durationDays:14},'2026-11-15');
  assert.equal(state.packages[0]!.durationDaysSnapshot,14);assert.equal(state.packages[0]!.openedOn,'2026-11-02');
  state=transition(state,{type:'deletePackage',id:'r'},'2026-11-15');
  assert.equal(state.packages.length,0);assert.equal(state.boxes[0]!.lensesRemaining,6);
});

test('box edits do not rewrite the duration, lens type, or prescription of opened packages',()=>{
  let state=transition(defaultState(),{type:'openPackages',ids:['r'],newBox:box(30,['right']),eyes:['right'],date:'2026-11-15'});
  state=transition(state,{type:'editBox',id:'box',patch:{durationDays:90,lensType:'toric'}});
  assert.equal(state.boxes[0]!.durationDays,90);
  assert.equal(state.packages[0]!.durationDaysSnapshot,30);
  assert.equal(state.packages[0]!.lensTypeSnapshot,'spherical');
});

test('automatic worn day still records when daily lens stock is empty without inventing stock on correction',()=>{
  let state=transition(defaultState(),{type:'addBox',box:{...box(1,['right']),lensesTotal:1,lensesRemaining:1}});
  state=transition(state,{type:'openPackage',id:'r',boxId:'box',eye:'right',date:'2026-11-15'});
  state=transition(state,{type:'checkIn',id:'today',packageId:'r',date:'2026-11-15',status:'worn'});
  state=transition(state,{type:'checkIn',id:'next',packageId:'r',date:'2026-11-16',status:'worn',automatic:true},'2026-11-16');
  assert.equal(state.boxes[0]!.lensesRemaining,0);
  assert.equal(state.checkIns[1]!.stockUsed,false);
  state=transition(state,{type:'checkIn',id:'next',packageId:'r',date:'2026-11-16',status:'notWorn',automatic:false},'2026-11-16');
  assert.equal(state.boxes[0]!.lensesRemaining,0);
});

test('local reminder plan covers active packages and omits answered days',()=>{
  let state=transition(defaultState(),{type:'addBox',box:box(30,['right'])});
  state=transition(state,{type:'openPackage',id:'r',boxId:'box',eye:'right',date:'2026-11-15'});
  state=transition(state,{type:'settings',patch:{notifications:true}});
  const now=new Date(2026,10,15,16,0,0);
  let plan=notificationPlan(state,now);
  assert(plan.some(r=>r.kind==='daily-checkin'&&r.body==='Bugün lens taktın mı?'));
  assert(plan.some(r=>r.body.includes('günü kaldı')));
  state=transition(state,{type:'checkIn',id:'today',packageId:'r',date:'2026-11-15',status:'worn'});
  plan=notificationPlan(state,now);
  assert(!plan.some(r=>r.kind==='daily-checkin'&&r.date.toDateString()===new Date(2026,10,15,21,0).toDateString()));
});

test('restore rejects duplicate daily records instead of silently losing one',()=>{
  let state=transition(defaultState(),{type:'addBox',box:box(1,['right'])});
  state=transition(state,{type:'openPackage',id:'r',boxId:'box',eye:'right',date:'2026-11-15'});
  state.checkIns=[{id:'a',packageId:'r',date:'2026-11-15',status:'worn',automatic:false},{id:'b',packageId:'r',date:'2026-11-15',status:'notWorn',automatic:false}];
  assert.throws(()=>validateState(state),/Günlük kullanım kaydı tutarsız/);
});

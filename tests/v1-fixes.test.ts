import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, type AppState } from '../src/domain/types.ts';
import { transition, validateState } from '../src/domain/reducer.ts';
import { addDays, packageMascotLevel } from '../src/domain/dates.ts';

const box=(id:string,durationDays:number,eyes:('right'|'left')[]=['right','left'],count=6)=>({id,name:id,brand:'',lensType:'spherical' as const,durationDays,lensesTotal:count,lensesRemaining:count,eyes,prescription:{}});
/** Simulates the app's auto-fill: every past day of every package gets the default answer. */
function autoFill(state:AppState,today:string){
  for(const pack of state.packages){
    const last=pack.closedOn&&pack.closedOn<addDays(today,-1)?pack.closedOn:addDays(today,-1);
    for(let date=pack.openedOn;date<=last;date=addDays(date,1)){
      if(state.checkIns.some(c=>c.packageId===pack.id&&c.date===date))continue;
      state=transition(state,{type:'checkIn',id:`auto-${pack.id}-${date}`,packageId:pack.id,date,status:'worn',automatic:true},today);
    }
  }
  return state;
}
const pair=(today='2026-11-16')=>transition(defaultState(),{type:'openPackages',ids:['r1','l1'],newBox:box('old',30),eyes:['right','left'],date:'2026-11-01',pairId:'p1'},today);

test('replacing a package after filled days saves and keeps the day answers',()=>{
  const today='2026-11-16';
  let state=autoFill(pair(),today);
  state=transition(state,{type:'checkIn',id:'t',packageId:'r1',date:today,status:'worn'},today);
  for(const date of [today,addDays(today,-3)]){
    const next=transition(state,{type:'openPackages',ids:['r2','l2'],boxId:'old',eyes:['right','left'],date,pairId:'p2'},today);
    assert.doesNotThrow(()=>validateState(JSON.parse(JSON.stringify(next))));
    const old=next.packages.find(p=>p.id==='r1')!;
    assert.equal(old.closedOn,addDays(date,-1));
    assert.equal(next.checkIns.some(c=>c.packageId==='r1'&&c.date>old.closedOn!),false);
    assert.equal(next.checkIns.filter(c=>c.packageId==='r2').length,next.dailyStatuses.filter(d=>d.date>=date).length);
    assert.equal(next.dailyStatuses.find(d=>d.date===today)!.automatic,false);
  }
});

test('auto-fill never overwrites a manual answer, also after the opening date moves earlier',()=>{
  const today='2026-11-16';
  let state=transition(defaultState(),{type:'openPackages',ids:['r'],newBox:box('b',30,['right']),eyes:['right'],date:'2026-11-10'},today);
  state=transition(state,{type:'dailyStatus',id:'g',date:'2026-11-05',status:'glasses'},today);
  state=transition(state,{type:'editPackage',id:'r',openedOn:'2026-11-03',durationDays:30},today);
  state=autoFill(state,today);
  assert.equal(state.dailyStatuses.find(d=>d.date==='2026-11-05')!.status,'glasses');
  assert.equal(state.checkIns.find(c=>c.date==='2026-11-05')!.status,'glasses');
  assert.equal(state.checkIns.find(c=>c.date==='2026-11-04')!.automatic,true);
});

test('an existing daily box keeps its daily duration even if a duration is sent',()=>{
  const today='2026-11-16';
  let state=transition(defaultState(),{type:'addBox',box:box('daily',1,['right','left'],30)});
  state=transition(state,{type:'openPackages',ids:['r','l'],boxId:'daily',eyes:['right','left'],date:today,durationDays:30},today);
  assert.equal(state.packages[0]!.durationDaysSnapshot,1);
  assert.equal(state.boxes[0]!.lensesRemaining,30);
});

test('each eye can use its own box; one daily answer still covers both eyes',()=>{
  const today='2026-11-16';
  const state0=transition(defaultState(),{type:'openPackages',ids:['r','l'],boxes:[{newBox:box('rb',30,['right'])},{newBox:box('lb',30,['left'])}],eyes:['right','left'],date:today,pairId:'p'},today);
  assert.deepEqual(state0.boxes.map(b=>[b.id,b.lensesRemaining]),[['rb',5],['lb',5]]);
  const state=transition(state0,{type:'dailyStatus',id:'d',date:today,status:'worn'},today);
  assert.equal(state.checkIns.filter(c=>c.date===today&&c.status==='worn').length,2);
});

test('deleting a mistaken replacement reopens the previous package for both eyes',()=>{
  const today='2026-11-16';
  let state=autoFill(pair(),today);
  state=transition(state,{type:'openPackages',ids:['r2','l2'],boxId:'old',eyes:['right','left'],date:'2026-11-14',pairId:'p2'},today);
  assert.equal(state.boxes[0]!.lensesRemaining,2);
  state=transition(state,{type:'deletePackage',id:'r2',withPair:true},today);
  assert.deepEqual(state.packages.map(p=>[p.id,p.closedOn]),[['r1',null],['l1',null]]);
  assert.equal(state.boxes[0]!.lensesRemaining,4);
  assert.equal(state.dailyStatuses.filter(d=>d.status==='worn').length,15);
  assert.equal(state.checkIns.filter(c=>c.packageId==='r1').length,15);
  assert.doesNotThrow(()=>validateState(JSON.parse(JSON.stringify(state))));
});

test('editing a pair updates both eyes together',()=>{
  const today='2026-11-16';
  const state=transition(pair(),{type:'editPackage',id:'r1',openedOn:'2026-11-02',durationDays:15,withPair:true},today);
  assert.deepEqual(state.packages.map(p=>[p.openedOn,p.durationDaysSnapshot]),[['2026-11-02',15],['2026-11-02',15]]);
});

test('owl level reacts only for 15-day and monthly packages',()=>{
  assert.deepEqual([9,10,15,16].map(d=>packageMascotLevel(15,d)),[1,2,2,3]);
  assert.deepEqual([19,20,30,31].map(d=>packageMascotLevel(30,d)),[1,2,2,3]);
  assert.deepEqual([packageMascotLevel(1,5),packageMascotLevel(90,120),packageMascotLevel(14,30)],[1,1,1]);
});

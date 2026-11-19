import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reminderDiff } from '../src/domain/notificationSync.ts';
import { widgetSnapshot } from '../src/domain/widget.ts';
import { transition } from '../src/domain/reducer.ts';
import { defaultState } from '../src/domain/types.ts';
test('notification reconciliation leaves existing unchanged jobs alone',()=>{
  const reminder={key:'one',date:new Date(2026,10,20,9),body:'Değişim günü'};
  const diff=reminderDiff([{id:'one',owner:'lens-takip',body:reminder.body}],[reminder]);
  assert.deepEqual(diff,{cancel:[],schedule:[],keep:['one']});
});
test('reminder reconciliation cancels only owned obsolete/changed jobs',()=>{
  const desired={key:'changed',date:new Date(),body:'Yeni tarih'};
  const diff=reminderDiff([{id:'other',owner:'other'},{id:'old',owner:'lens-takip'},{id:'changed',owner:'lens-takip',body:'Eski tarih'}],[desired]);
  assert.deepEqual(diff.cancel,['old','changed']);assert.deepEqual(diff.schedule,[desired]);
});
test('notification off removes all owned jobs',()=>{assert.deepEqual(reminderDiff([{id:'one',owner:'lens-takip'}],[]).cancel,['one']);});
test('Android widget snapshot contains no private notes or histories',()=>{
  const s=defaultState();s.journal=[{id:'secret',date:'2026-11-13',comfort:3,note:'private note',symptoms:[]}];s.stock.pieces=10;
  const json=JSON.stringify(widgetSnapshot(s));assert.ok(!json.includes('private'));assert.ok(!json.includes('journal'));assert.ok(!json.includes('secret'));
});
test('solution replacement cannot end a bottle before it was opened',()=>{
  const s=defaultState();s.auxiliary=[{id:'a',kind:'solution',start:'2026-11-10',due:'2026-12-10',completed:null,name:''}];
  assert.throws(()=>transition(s,{type:'auxiliary',entry:{id:'b',kind:'solution',start:'2026-11-09',due:'2026-12-09',completed:null,name:''}},'2026-11-13'));
});

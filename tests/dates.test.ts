import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, addMonths, dateOnly, getCycleProgress, getDaysRemaining, getLensStatus, getNextReplacementDate, getNotificationDates, parseDate, timeParts } from '../src/domain/dates.ts';
import type { Cycle, Plan } from '../src/domain/types.ts';
const monthly: Plan = { kind:'monthly',unit:'months',interval:1 };
const c: Cycle = { id:'one',profileId:'both',start:'2026-01-31',due:'2026-02-28',completed:null,plan:monthly };
test('31 January clamps to February, next cycle anchors to actual replacement',()=>{
  assert.equal(getNextReplacementDate('2026-01-31',monthly),'2026-02-28');
  assert.equal(getNextReplacementDate('2026-02-28',monthly),'2026-03-28');
});
test('leap years and 29 February',()=>{
  assert.equal(addMonths('2024-01-31',1),'2024-02-29');
  assert.equal(addMonths('2024-02-29',12),'2025-02-28');
});
test('30 days is not a calendar month',()=>{
  assert.equal(getNextReplacementDate('2026-01-31',{kind:'monthly',unit:'days',interval:30}),'2026-03-02');
  assert.notEqual(addDays('2026-02-01',30),addMonths('2026-02-01',1));
});
test('month/year boundaries',()=>{assert.equal(addMonths('2026-12-31',1),'2027-01-31');assert.equal(addMonths('2026-03-31',1),'2026-04-30');});
test('fortnight plan always counts fourteen calendar days',()=>assert.equal(getNextReplacementDate('2026-11-01',{kind:'fortnight',unit:'days',interval:14}),'2026-11-15'));
test('custom weeks and calendar months',()=>{assert.equal(getNextReplacementDate('2026-01-31',{kind:'custom',unit:'weeks',interval:2}),'2026-02-14');assert.equal(getNextReplacementDate('2026-01-31',{kind:'custom',unit:'months',interval:2}),'2026-03-31');});
test('daily disposable ends today, not tomorrow',()=>assert.equal(getNextReplacementDate('2026-11-13',{kind:'daily',unit:'days',interval:1}),'2026-11-13'));
test('due today and yesterday',()=>{assert.equal(getDaysRemaining(c.due,'2026-02-28'),0);assert.equal(getDaysRemaining(c.due,'2026-03-01'),-1);});
test('future cycle has no started progress',()=>{assert.equal(getLensStatus(c,'2026-01-01'),'future');assert.equal(getCycleProgress(c,'2026-01-01'),0);});
test('status thresholds',()=>{assert.equal(getLensStatus(c,'2026-02-24'),'normal');assert.equal(getLensStatus(c,'2026-02-25'),'soon');assert.equal(getLensStatus(c,'2026-02-27'),'tomorrow');assert.equal(getLensStatus(c,'2026-02-28'),'due');assert.equal(getLensStatus(c,'2026-03-01'),'overdue');});
test('progress bounds and real February duration',()=>{assert.equal(getCycleProgress(c,'2026-02-14'),.5);assert.equal(getCycleProgress(c,'2026-04-01'),1);});
test('invalid dates and interval rejected',()=>{for(const v of ['2026-02-29','2026-13-01','2026-1-01','nope','2026-04-31'])assert.throws(()=>parseDate(v));assert.throws(()=>getNextReplacementDate(c.start,{...monthly,interval:0}));assert.throws(()=>getNextReplacementDate(c.start,{...monthly,interval:1.5}));});
test('local midnight changes date',()=>{assert.equal(dateOnly(new Date(2026,10,13,23,59)),'2026-11-13');assert.equal(dateOnly(new Date(2026,10,14,0,1)),'2026-11-14');});
test('timezone and DST do not change calendar difference',()=>{
  const previous=process.env.TZ;
  for(const tz of ['Europe/Istanbul','America/New_York','Pacific/Honolulu','Pacific/Auckland']){
    process.env.TZ=tz; assert.equal(dateOnly(parseDate('2026-03-08')),'2026-03-08'); assert.equal(getDaysRemaining('2026-03-09','2026-03-07'),2); assert.equal(addDays('2026-03-08',1),'2026-03-09');
  }
  if(previous)process.env.TZ=previous;else delete process.env.TZ;
});
test('notifications exclude past time and deduplicate offsets',()=>{
  const result=getNotificationDates('2026-11-13',[3,3,1,0],'09:00',new Date(2026,10,10,10));
  assert.equal(result.length,2);assert.equal(dateOnly(result[0]!),'2026-11-12');assert.equal(result[0]!.getHours(),9);
  assert.equal(getNotificationDates('2026-11-13',[0],'09:00',new Date(2026,10,13,10)).length,0);
});
test('notification hour validation',()=>{for(const value of ['24:00','9:00','12:60','no'])assert.throws(()=>timeParts(value));assert.deepEqual(timeParts('09:30'),[9,30]);});

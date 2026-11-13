import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INITIAL_SCHEMA, UPDATE_STATE } from '../src/data/schema.ts';
import { defaultState } from '../src/domain/types.ts';
import { transition, validateState } from '../src/domain/reducer.ts';

test('SQLite schema persists a full state across close/reopen',()=>{
  const dir=mkdtempSync(join(tmpdir(),'lens-db-')); const path=join(dir,'test.db'); let db=new DatabaseSync(path);
  try {
    db.exec(INITIAL_SCHEMA); const initial=defaultState();
    db.prepare('INSERT INTO app_state VALUES (1,0,?)').run(JSON.stringify(initial));
    const next=transition(initial,{type:'setup',plan:{kind:'monthly',unit:'months',interval:1},start:'2026-01-31',id:'first'},'2026-02-01');
    db.exec('BEGIN IMMEDIATE'); const saved=db.prepare(UPDATE_STATE).run(JSON.stringify(next),next.revision,0); db.exec('COMMIT'); assert.equal(saved.changes,1);
    db.close(); db=new DatabaseSync(path);
    const row=db.prepare('SELECT payload FROM app_state WHERE id=1').get() as {payload:string};
    const loaded=validateState(JSON.parse(row.payload));assert.equal(loaded.cycles[0]!.due,'2026-02-28');assert.equal(loaded.onboarded,true);
    assert.equal(db.prepare('PRAGMA user_version').get()!.user_version,1);
  } finally {db.close();rmSync(dir,{recursive:true,force:true});}
});
test('optimistic revision prevents overwriting a newer transaction',()=>{
  const db=new DatabaseSync(':memory:');try {db.exec(INITIAL_SCHEMA);db.prepare('INSERT INTO app_state VALUES (1,3,?)').run('{}');assert.equal(db.prepare(UPDATE_STATE).run('{"bad":true}',4,2).changes,0);assert.equal(db.prepare('SELECT revision FROM app_state WHERE id=1').get()!.revision,3);}finally{db.close();}
});
test('SQLite rollback restores entire payload on error',()=>{
  const db=new DatabaseSync(':memory:');try{db.exec(INITIAL_SCHEMA);const original=JSON.stringify(defaultState());db.prepare('INSERT INTO app_state VALUES (1,0,?)').run(original);db.exec('BEGIN');db.prepare(UPDATE_STATE).run('{"partial":true}',1,0);db.exec('ROLLBACK');assert.equal(db.prepare('SELECT payload FROM app_state').get()!.payload,original);}finally{db.close();}
});
test('schema enforces single state row',()=>{
  const db=new DatabaseSync(':memory:');try{db.exec(INITIAL_SCHEMA);assert.throws(()=>db.prepare('INSERT INTO app_state VALUES(2,0,?)').run('{}'));}finally{db.close();}
});

// Exercise the exported Lensim web app and its IndexedDB-backed daily tracking.
// JSDOM verifies behavior; it does not replace visual browser/device QA.
const { JSDOM, VirtualConsole } = require('jsdom');
const { indexedDB, IDBKeyRange } = require('fake-indexeddb');
const assert = require('node:assert/strict');
const origin = process.env.LENS_TEST_URL || 'http://localhost:8082';
const errors = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(predicate, label) {
  for (let i=0;i<150;i++) { if (await predicate()) return; if(errors.length) throw errors[0]; await pause(100); }
  throw new Error('Timed out: '+label);
}
async function open(path) {
  const console = new VirtualConsole();
  console.on('jsdomError', e => { if (e.type === 'unhandled exception') errors.push(e); });
  return JSDOM.fromURL(origin+path, {
    runScripts:'dangerously', resources:'usable', pretendToBeVisual:true, virtualConsole:console,
    beforeParse(w) {
      Object.assign(w, { indexedDB, IDBKeyRange, structuredClone, TextDecoder, TextEncoder });
      w.fetch=(url,options)=>fetch(new URL(url,w.location.href),options);
      w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
      w.ResizeObserver=class {observe(){}unobserve(){}disconnect(){}};
      // Expo's web font loader checks this browser constructor. JSDOM has no
      // CSS font-face rule implementation, so provide the missing type for its
      // `instanceof` guard; actual font rendering is covered by browser QA.
      w.CSSFontFaceRule=class CSSFontFaceRule {};
      w.addEventListener('error', e=>errors.push(e.error ?? new Error(e.message)));
    },
  });
}
async function savedState() {
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('lens-takip-web-preview',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  try{return await new Promise((resolve,reject)=>{const r=db.transaction('state').objectStore('state').get(1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  finally{db.close();}
}
function button(dom, text) { return [...dom.window.document.querySelectorAll('[role="button"],button')].find(el=>el.textContent.includes(text)); }
(async()=>{
  let dom;
  try {
    dom=await open('/');
    await waitFor(()=>button(dom,'İlk paketi kaydet'),'first-package setup');
    button(dom,'İlk paketi kaydet').click();
    await waitFor(()=>button(dom,'Bugün taktım'),'home screen');
    const initial=await savedState();
    assert.equal(initial.packages.length,2,'onboarding opens both eyes');
    assert.equal(initial.boxes[0].lensesRemaining,4,'opening both eyes consumes two lenses');
    assert.equal(dom.window.document.body.textContent.includes('Bugün lens takmadım'),true,'shared daily choices include not-worn');

    button(dom,'Bugün taktım').click();
    await waitFor(async()=>{const s=await savedState();return s.checkIns.length===2&&s.checkIns.every(c=>c.status==='worn');},'shared worn answer saved for both eyes');
    button(dom,'Bugün lens takmadım').click();
    await waitFor(async()=>{const s=await savedState();return s.checkIns.length===2&&s.checkIns.every(c=>c.status==='notWorn');},'daily answer switched without duplicate records');

    dom.window.close();dom=await open('/');
    await waitFor(()=>button(dom,'Bugün lens takmadım'),'local state after page reload');
    assert.equal((await savedState()).checkIns.length,2,'answers persist after reload');
    assert.equal(errors.length,0,errors.map(e=>e.message).join('\n'));
    console.log('PASS: web onboarding, paired package creation, shared daily answer, status switch, IndexedDB persistence; no uncaught runtime errors.');
  } finally { dom?.window.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});

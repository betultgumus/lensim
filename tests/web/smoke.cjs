// Execute the actual exported web bundles and router, not mocked screen components.
// JSDOM verifies behavior; it does not replace visual browser/device QA.
const { JSDOM, VirtualConsole } = require('jsdom');
const { indexedDB, IDBKeyRange } = require('fake-indexeddb');
const assert = require('node:assert/strict');
const origin = process.env.LENS_TEST_URL || 'http://localhost:8081';
const errors = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(predicate, label) {
  for (let i=0;i<100;i++) { if (await predicate()) return; if(errors.length) throw errors[0]; await pause(100); }
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
      w.addEventListener('error', e=>errors.push(e.error ?? new Error(e.message)));
    },
  });
}
async function savedState() { const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('lens-takip-web-preview',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{return await new Promise((resolve,reject)=>{const r=db.transaction('state').objectStore('state').get(1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();} }
function button(dom, text) { return [...dom.window.document.querySelectorAll('[role="button"],button')].find(el=>el.textContent.includes(text)); }
(async()=>{
  let dom;
  try {
    dom=await open('/onboarding');
    await waitFor(()=>button(dom,'Hadi başlayalım'),'onboarding rendered');
    button(dom,'Hadi başlayalım').click();
    await waitFor(()=>button(dom,'Devam et'),'plan screen');button(dom,'Devam et').click();
    await waitFor(()=>button(dom,'Şimdilik geç'),'notification screen');button(dom,'Şimdilik geç').click();
    await waitFor(()=>button(dom,'Lenslerimi değiştirdim'),'home screen');
    dom.window.close();dom=await open('/');
    await waitFor(()=>button(dom,'Lenslerimi değiştirdim'),'saved state after reload');
    button(dom,'Lenslerimi değiştirdim').click();
    await waitFor(()=>button(dom,'Evet, kaydet'),'replacement confirmation');button(dom,'Evet, kaydet').click();
    await waitFor(()=>dom.window.document.body.textContent.includes('Harika! Yeni döngü başladı.'),'replacement success');
    assert.equal((await savedState()).cycles.length,2);
    button(dom,'Yanlışlıkla yaptım').click();
    await waitFor(async()=>(await savedState()).cycles.length===1,'undo persisted');
    assert.equal(errors.length,0,errors.map(e=>e.message).join('\n'));
    console.log('PASS: exported web onboarding, navigation, IndexedDB persistence, replacement and undo; no uncaught runtime errors.');
  } finally { dom?.window.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});

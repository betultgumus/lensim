import React,{useMemo,useState} from 'react';
import {Button,Card,Copy,Field,Screen,SegmentedControl} from '../../src/components/ui';
import {DurationPicker,LensTypePicker,NumberGrid,type LensType,numberKeys} from '../../src/components/LensForm';
import {useApp,uid} from '../../src/state/AppContext';
import {assertRxValues} from '../../src/domain/rx';
import type {Eye,LensBox} from '../../src/domain/types';

export default function NewBox(){
 const {state,dispatch}=useApp();const [name,setName]=useState('');const [brand,setBrand]=useState('');const [duration,setDuration]=useState('30');const [customDuration,setCustomDuration]=useState(false);const [total,setTotal]=useState('6');const [remaining,setRemaining]=useState('6');const [type,setType]=useState<LensType>('spherical');const [scope,setScope]=useState<'both'|Eye>('both');const [different,setDifferent]=useState(false);const [values,setValues]=useState<Record<string,string>>({});const [nameError,setNameError]=useState<string|null>(null);
 const eyes:Eye[]=scope==='both'?['right','left']:[scope];
 const keys=useMemo(()=>numberKeys(type),[type]);
 const nameKey=(value:string)=>value.trim().normalize('NFKC').toLocaleLowerCase('tr-TR');
 const eyeChange=(next:'both'|Eye)=>{if(next!=='both'&&different){setValues(old=>({...Object.fromEntries(keys.map(k=>[k,old[`${next}-${k}`]??old[k]??''])),Renk:old.Renk??''}));setDifferent(false);}setScope(next);};
 const save=async()=>{
  const cleanName=name.trim();if(!cleanName){setNameError('Kutunu diğerlerinden ayırt edecek bir isim yaz.');return;}
  if(state.boxes.some(b=>nameKey(b.name)===nameKey(cleanName))){setNameError('Bu isim başka bir lens kutusunda kullanılıyor. Farklı bir isim ver.');return;}
  const days=Number(duration),count=Number(total),left=Number(remaining);
  if(!Number.isInteger(days)||days<1||days>365)throw new Error('Kullanım süresini 1–365 gün arasında gir.');
  if(!Number.isInteger(count)||count<1||!Number.isInteger(left)||left<0||left>count)throw new Error('Kutudaki toplam ve kalan lens sayılarını kontrol et.');
  assertRxValues(values);
  const prescription:LensBox['prescription']={};
  for(const eye of eyes){const prefix=different&&eyes.length===2?`${eye}-`:'';const side=Object.fromEntries(keys.map(key=>[key,(values[`${prefix}${key}`]??'').trim().replace(',','.')]).filter(([,v])=>String(v)));if(Object.keys(side).length)prescription[eye]=side;}
  if(type==='colored'&&values.Renk?.trim())prescription.color=values.Renk.trim();
  await dispatch({type:'addBox',box:{id:uid(),name:cleanName,brand:brand.trim(),lensType:type,durationDays:days,lensesTotal:count,lensesRemaining:left,eyes,prescription}});
  const {router}=await import('expo-router');router.back();
 };
 return <Screen title="Yeni lens kutusu" subtitle="Her fiziksel kutu ayrı bir kayıt ve farklı bir isim alır." back>
  <Card><Copy bold>Kutunu tanımla</Copy><Field label="Kutu adı" tag={{text:'Zorunlu',required:true}} value={name} onChange={v=>{setName(v);setNameError(null);}} placeholder="Örn. Sağ göz · Acme aylık mavi kutu" error={nameError}/><Field label="Marka / model" tag={{text:'İsteğe bağlı'}} value={brand} onChange={setBrand} placeholder="Kutunun üzerindeki marka"/><Copy bold size={14}>Lens türü</Copy><LensTypePicker type={type} onChange={setType}/></Card>
  <Card><Copy bold>Kullanım ve stok</Copy><DurationPicker days={duration} custom={customDuration} onChange={(value,custom)=>{setDuration(value);setCustomDuration(custom);}}/><Field label="Kutudaki toplam lens" numeric value={total} onChange={setTotal}/><Field label="Kutuda kalan lens" numeric value={remaining} onChange={setRemaining}/></Card>
  <Card><Copy bold>Hangi göz için?</Copy><SegmentedControl label="Lens kutusunun gözü" selected={scope} onChange={value=>eyeChange(value as 'both'|Eye)} options={[{value:'both',title:'İki göz'},{value:'right',title:'Sağ göz'},{value:'left',title:'Sol göz'}]}/>{scope==='both'&&<><Copy bold size={14}>Sağ ve sol reçete</Copy><SegmentedControl label="Sağ ve sol numara" selected={different?'different':'same'} onChange={value=>{const split=value==='different';setValues(old=>split?{...Object.fromEntries(keys.flatMap(k=>[[`right-${k}`,old[`right-${k}`]??old[k]??''],[`left-${k}`,old[`left-${k}`]??old[k]??'']])),Renk:old.Renk??''}:{...Object.fromEntries(keys.map(k=>[k,old[k]||old[`right-${k}`]||old[`left-${k}`]||''])),Renk:old.Renk??''});setDifferent(split);}} options={[{value:'same',title:'Aynı'},{value:'different',title:'Farklı'}]}/></>}
   <Copy muted size={14}>Numara girmek isteğe bağlıdır. Bu kutunun reçetesi ayrı saklanır.</Copy><NumberGrid type={type} eyes={eyes} separate={different&&eyes.length===2} values={values} onChange={(key,value)=>setValues(old=>({...old,[key]:value}))}/>
  </Card>
  <Button title="Lens kutusunu kaydet" icon="save-outline" onPress={save}/>
  {state.boxes.length>0&&<Copy muted size={13}>Kayıtlı lens kutuları başka bir göze veya kutuya aktarılmaz. Yeni bir fiziksel kutu için yeni ve farklı bir ad kullan.</Copy>}
 </Screen>;
}

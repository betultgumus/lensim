import React, { useState } from 'react';
import { View } from 'react-native';
import { router, Redirect } from 'expo-router';
import { Button, Chip, Copy, Field, Screen, styles } from '../src/components/ui';
import { useApp, uid } from '../src/state/AppContext';
import type { Eye, LensBox } from '../src/domain/types';
import { addDays,dateOnly,isWithinEntryWindow } from '../src/domain/dates';
import { DateField } from '../src/components/DateField';
import { requestNotifications } from '../src/services/notifications';

export default function Onboarding(){
 const {state,dispatch,today}=useApp(); const [eye,setEye]=useState<'both'|Eye>('both'); const [defaultAnswer,setDefaultAnswer]=useState<'worn'|'notWorn'>('worn'); const [duration,setDuration]=useState('30'); const [name,setName]=useState(''); const [brand,setBrand]=useState(''); const [count,setCount]=useState('6'); const [type,setType]=useState<LensBox['lensType']>('spherical'); const [date,setDate]=useState(dateOnly()); const [values,setValues]=useState<Record<string,string>>({}); const [wantsNumbers,setWantsNumbers]=useState(false);const [separateNumbers,setSeparateNumbers]=useState(false); const [busy,setBusy]=useState(false);
 if(state.onboarded&&state.packages.length)return <Redirect href="/(tabs)"/>;
 const numberFields=type==='spherical'?['PWR','BC','DIA']:type==='toric'?['SPH','CYL','AXIS','BC','DIA']:type==='multifocal'?['SPH','ADD','BC','DIA']:['Renk','PWR','BC','DIA'];
 const save=async()=>{setBusy(true);try{
  const days=Number(duration),qty=Number(count); if(!isWithinEntryWindow(date,today))throw new Error(`Paket açılış tarihi ${addDays(today,-30)} ile ${today} arasında olmalı.`);if(!Number.isInteger(days)||days<1||days>365||!Number.isInteger(qty)||qty<(eye==='both'?2:1))throw new Error('Süreyi ve kutudaki lens sayısını kontrol et. İki göz için en az 2 lens gerekir.');
  const scope=eye==='both'?'both':eye;
  const makeRx=(side:'right'|'left')=>Object.fromEntries(numberFields.filter(k=>k!=='Renk').map(k=>[k,values[separateNumbers?`${side}-${k}`:k]??'']).filter(([,v])=>String(v).trim()));
  const eyes:Eye[]=eye==='both'?['right','left']:[eye];
  const box:LensBox={id:uid(),name:name||brand||'Lens kutum',brand,lensType:type,durationDays:days,lensesTotal:qty,lensesRemaining:qty,eyes:eye==='both'?['left','right']:[eye],prescription:{right:wantsNumbers?makeRx('right'):{},left:wantsNumbers?makeRx('left'):{},color:wantsNumbers&&type==='colored'?values.Renk:''}};
  await dispatch({type:'settings',patch:{defaultAnswer}});
  await dispatch({type:'openPackages',ids:eyes.map(()=>uid()),newBox:box,eyes,date,...(eyes.length===2?{pairId:uid()}:{})});
  try{const granted=await requestNotifications();if(granted)await dispatch({type:'settings',patch:{notifications:true}});}catch{}
  if(date<today)router.replace({pathname:'/(tabs)/calendar',params:{date,selectMultiple:'1'}});else router.replace('/(tabs)');
 }finally{setBusy(false);}};
 return <Screen title="Lensim" subtitle="İlk paketini ekle. Hesap oluşturmadan başlayabilirsin.">
  <View style={{padding:16,borderLeftWidth:4,borderLeftColor:'#0754C8',backgroundColor:'#E9F3FF',gap:6}}><Copy bold>Verilerin bu telefonda saklanır.</Copy><Copy muted>Yedeklemeyi daha sonra Ayarlar’dan açabilirsin.</Copy></View>
  <View style={{padding:14,borderWidth:1,borderColor:'#C6DCF6',borderRadius:8,backgroundColor:'#F8FBFF',gap:5}}><Copy bold>Lens kutunu aç, takibe başla</Copy><Copy muted>Takip bugünden varsayılan olarak başlar. Başka bir gün açtıysan aşağıdan gerçek açılış tarihini seç.</Copy></View>
  <Copy bold>Hangi göz?</Copy><View style={styles.wrap}>{(['both','right','left'] as const).map(v=><Chip key={v} title={v==='both'?'İkisi':v==='right'?'Sağ':'Sol'} selected={eye===v} onPress={()=>setEye(v)}/>)}</View>
  <Copy bold>Lens tipi</Copy><View style={styles.wrap}>{(['spherical','toric','multifocal','colored'] as const).map(v=><Chip key={v} title={{spherical:'Küresel',toric:'Torik',multifocal:'Multifokal',colored:'Renkli'}[v]} selected={type===v} onPress={()=>setType(v)}/>)}</View>
  <Field label="Kutu adı veya marka" value={name} onChange={setName} placeholder="Örn. Aylık lens"/><Field label="Marka (isteğe bağlı)" value={brand} onChange={setBrand}/>
  <View style={{padding:14,borderWidth:1,borderColor:'#C6DCF6',borderRadius:8,backgroundColor:'#F8FBFF',gap:9}}><Copy bold>Numara bilgisi ekle (isteğe bağlı)</Copy><Copy muted size={14}>İstersen aşağıdaki alanları doldur. Bilmiyorsan boş bırak; kutu yine kaydedilir.</Copy><View style={styles.wrap}><Chip title="Numara bilgilerini ekle" selected={wantsNumbers} onPress={()=>setWantsNumbers(true)}/><Chip title="Numarasız devam et" selected={!wantsNumbers} onPress={()=>setWantsNumbers(false)}/></View>{wantsNumbers&&<>{eye==='both'&&<View style={styles.wrap}><Chip title="İki göz aynı" selected={!separateNumbers} onPress={()=>{setValues(prev=>Object.fromEntries(numberFields.map(k=>[k,prev[k]??prev[`right-${k}`]??prev[`left-${k}`]??''])));setSeparateNumbers(false);}}/><Chip title="Sağ ve sol farklı" selected={separateNumbers} onPress={()=>{setValues(prev=>Object.fromEntries(numberFields.flatMap(k=>k==='Renk'?[[k,prev[k]??'']]:[[`right-${k}`,prev[`right-${k}`]??prev[k]??''],[`left-${k}`,prev[`left-${k}`]??prev[k]??'']])));setSeparateNumbers(true);}}/></View>}{numberFields.map(key=>{const label=key==='PWR'?'lens gücü':key==='SPH'?'lens numarası':key==='CYL'?'astigmat numarası':key==='AXIS'?'astigmat yönü':key==='ADD'?'yakın ek numarası':key==='BC'?'lens eğrisi':key==='DIA'?'lens çapı':'Renk';return separateNumbers&&eye==='both'&&key!=='Renk'?<View key={key} style={{gap:6}}><Field label={`Sağ · ${label} (${key})`} value={values[`right-${key}`]??''} onChange={v=>setValues(prev=>({...prev,[`right-${key}`]:v}))}/><Field label={`Sol · ${label} (${key})`} value={values[`left-${key}`]??''} onChange={v=>setValues(prev=>({...prev,[`left-${key}`]:v}))}/></View>:<Field key={key} label={`${label} (${key}) · isteğe bağlı`} value={values[key]??''} onChange={v=>setValues(prev=>({...prev,[key]:v}))}/>})}</>}</View>
  <View style={styles.wrap}>{[['1','Günlük'],['14','14 günlük'],['15','15 günlük'],['30','Aylık · 30 gün'],['90','3 aylık']].map(([n,label])=><Chip key={n} title={label!} selected={duration===n} onPress={()=>setDuration(n!)}/>)}</View>
  <Field label="Özel süre · gün" numeric value={duration} onChange={setDuration}/><Field label="Kutudaki lens sayısı" numeric value={count} onChange={setCount}/>
  <DateField label="Lens kutusunu açtığın tarih" value={date} onChange={setDate}/><Copy size={13} muted>En fazla 30 gün öncesine tarih girebilirsin ({addDays(today,-30)} – {today}).</Copy>
  <Copy bold>Bir gün cevap vermezsen o günü…</Copy><View style={styles.wrap}><Chip title="Taktım say" selected={defaultAnswer==='worn'} onPress={()=>setDefaultAnswer('worn')}/><Chip title="Takmadım say" selected={defaultAnswer==='notWorn'} onPress={()=>setDefaultAnswer('notWorn')}/></View>
  <Copy size={14} muted>Bu tercihi daha sonra Ayarlar’dan değiştirebilirsin. Takip günü saat 02.00’de değişir. Kaydettikten sonra günlük hatırlatma iznini isteyeceğiz; izin vermezsen uygulama çalışmaya devam eder.</Copy>
  <Button title={busy?'Kaydediliyor…':'İlk paketi kaydet'} disabled={busy} onPress={save}/>
 </Screen>;
}

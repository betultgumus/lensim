import React, { useState } from 'react';
import { View } from 'react-native';
import { router, Redirect } from 'expo-router';
import { Button, Chip, Copy, Field, Screen, SegmentedControl, styles, useColors } from '../src/components/ui';
import { useApp, uid } from '../src/state/AppContext';
import type { Eye, LensBox } from '../src/domain/types';
import { addDays, DURATION_OPTIONS, formatDate, isWithinEntryWindow } from '../src/domain/dates';
import { DateField } from '../src/components/DateField';
import { requestNotifications } from '../src/services/notifications';

const labels:Record<string,string>={PWR:'lens gücü',SPH:'lens numarası',CYL:'astigmat numarası',AXIS:'astigmat yönü',ADD:'yakın ek numarası',BC:'lens eğrisi',DIA:'lens çapı',Renk:'Renk'};
export default function Onboarding(){
 const {state,dispatch,today}=useApp();const t=useColors();
 const [eye,setEye]=useState<'both'|Eye>('both');const [defaultAnswer,setDefaultAnswer]=useState<'worn'|'notWorn'>('worn');
 const [duration,setDuration]=useState('30');const [custom,setCustom]=useState(false);
 const [name,setName]=useState('');const [brand,setBrand]=useState('');const [count,setCount]=useState('6');
 const [type,setType]=useState<LensBox['lensType']>('spherical');const [date,setDate]=useState(today);
 const [values,setValues]=useState<Record<string,string>>({});const [wantsNumbers,setWantsNumbers]=useState(false);const [separateNumbers,setSeparateNumbers]=useState(false);
 const [busy,setBusy]=useState(false);
 if(state.onboarded&&state.packages.length)return <Redirect href="/(tabs)"/>;
 const numberFields=type==='spherical'?['PWR','BC','DIA']:type==='toric'?['SPH','CYL','AXIS','BC','DIA']:type==='multifocal'?['SPH','ADD','BC','DIA']:['Renk','PWR','BC','DIA'];
 const split=separateNumbers&&eye==='both';
 const chooseEye=(value:'both'|Eye)=>{if(value!=='both'&&separateNumbers){setValues(prev=>Object.fromEntries(numberFields.map(k=>[k,prev[`${value}-${k}`]??prev[k]??''])));setSeparateNumbers(false);}setEye(value);};
 const save=async()=>{setBusy(true);try{
  const days=Number(duration),qty=Number(count);
  if(!isWithinEntryWindow(date,today))throw new Error(`Paket açılış tarihi ${formatDate(addDays(today,-30))} ile ${formatDate(today)} arasında olmalı.`);
  if(!Number.isInteger(days)||days<1||days>365||!Number.isInteger(qty)||qty<(eye==='both'?2:1))throw new Error('Süreyi ve kutudaki lens sayısını kontrol et. İki göz için en az 2 lens gerekir.');
  const makeRx=(side:Eye)=>Object.fromEntries(numberFields.filter(k=>k!=='Renk').map(k=>[k,(values[split?`${side}-${k}`:k]??'').trim().replace(',','.')]).filter(([,v])=>String(v)));
  const eyes:Eye[]=eye==='both'?['right','left']:[eye];
  const box:LensBox={id:uid(),name:name.trim()||brand.trim()||'Lens kutum',brand:brand.trim(),lensType:type,durationDays:days,lensesTotal:qty,lensesRemaining:qty,eyes:[...eyes],prescription:{right:wantsNumbers&&eyes.includes('right')?makeRx('right'):{},left:wantsNumbers&&eyes.includes('left')?makeRx('left'):{},color:wantsNumbers&&type==='colored'?values.Renk??'':''}};
  await dispatch({type:'settings',patch:{defaultAnswer}});
  await dispatch({type:'openPackages',ids:eyes.map(()=>uid()),newBox:box,eyes,date,...(eyes.length===2?{pairId:uid()}:{})});
  try{const granted=await requestNotifications();if(granted)await dispatch({type:'settings',patch:{notifications:true}});}catch{}
  if(date<today)router.replace({pathname:'/days',params:{date,selectMultiple:'1'}});else router.replace('/(tabs)');
 }finally{setBusy(false);}};
 return <Screen title="Lensim" subtitle="İlk lens paketini ekle. Hesap gerekmez.">
  <View style={{padding:16,borderLeftWidth:4,borderLeftColor:t.accent,backgroundColor:t.soft,gap:6}}><Copy bold>Verilerin yalnızca bu telefonda saklanır.</Copy><Copy muted>Telefon değiştirirken Ayarlar → Yedek bölümünden yedek dosyası alabilirsin.</Copy></View>
  <Copy bold>Hangi göz?</Copy>
  <SegmentedControl label="Göz" selected={eye} onChange={v=>chooseEye(v as 'both'|Eye)} options={[{value:'both',title:'İkisi'},{value:'right',title:'Sağ'},{value:'left',title:'Sol'}]}/>
  <Copy bold>Kullanım süresi</Copy>
  <View style={styles.wrap}>{DURATION_OPTIONS.map(([n,label])=><Chip key={n} title={label} selected={!custom&&duration===String(n)} onPress={()=>{setCustom(false);setDuration(String(n));}}/>)}<Chip title="Özel" selected={custom} onPress={()=>setCustom(true)}/></View>
  {custom&&<Field label="Özel kullanım süresi · gün" numeric value={duration} onChange={setDuration}/>}
  <Field label="Kutudaki lens sayısı" numeric value={count} onChange={setCount}/>
  <DateField label="Lens kutusunu açtığın tarih" value={date} onChange={setDate}/>
  <Copy size={14} muted>Bugün açtıysan değiştirme. En fazla 30 gün öncesini seçebilirsin.</Copy>
  <Copy bold>Bir gün cevap vermezsen o gün…</Copy>
  <SegmentedControl label="Varsayılan cevap" selected={defaultAnswer} onChange={v=>setDefaultAnswer(v as 'worn'|'notWorn')} options={[{value:'worn',title:'Taktım sayılsın'},{value:'notWorn',title:'Takmadım sayılsın'}]}/>
  <Copy size={14} muted>Otomatik sayılan günler takvimde soluk görünür; istediğin zaman düzeltebilirsin. Takip günü saat 02.00’de değişir.</Copy>
  <Copy bold>Kutu bilgisi (isteğe bağlı)</Copy>
  <View style={styles.wrap}>{(['spherical','toric','multifocal','colored'] as const).map(v=><Chip key={v} title={{spherical:'Küresel',toric:'Torik',multifocal:'Multifokal',colored:'Renkli'}[v]} selected={type===v} onPress={()=>setType(v)}/>)}</View>
  <Field label="Kutu adı" value={name} onChange={setName} placeholder="Örn. Aylık lens"/><Field label="Marka" value={brand} onChange={setBrand}/>
  <View style={{padding:14,borderWidth:1,borderColor:t.border,borderRadius:14,backgroundColor:t.surface,gap:10}}>
   <Copy bold>Numara bilgisi (isteğe bağlı)</Copy><Copy muted size={14}>Bilmiyorsan boş bırak; takip yine çalışır.</Copy>
   <SegmentedControl label="Numara girişi" selected={wantsNumbers?'yes':'no'} onChange={v=>setWantsNumbers(v==='yes')} options={[{value:'yes',title:'Girmek istiyorum'},{value:'no',title:'Şimdi geç'}]}/>
   {wantsNumbers&&<>
    {eye==='both'&&<SegmentedControl label="Sağ ve sol" selected={separateNumbers?'different':'same'} onChange={v=>{const separate=v==='different';setValues(prev=>separate?Object.fromEntries(numberFields.flatMap(k=>k==='Renk'?[[k,prev[k]??'']]:[[`right-${k}`,prev[`right-${k}`]??prev[k]??''],[`left-${k}`,prev[`left-${k}`]??prev[k]??'']])):Object.fromEntries(numberFields.map(k=>[k,prev[k]||prev[`right-${k}`]||prev[`left-${k}`]||''])));setSeparateNumbers(separate);}} options={[{value:'same',title:'İki göz aynı'},{value:'different',title:'Farklı'}]}/>}
    {numberFields.map(key=>{const label=`${labels[key]}${key==='Renk'?'':` (${key})`}`;const prefix=eye==='right'?'Sağ · ':eye==='left'?'Sol · ':'';
     if(split&&key!=='Renk')return <View key={key} style={{gap:6}}><Field signed label={`Sağ · ${label}`} value={values[`right-${key}`]??''} onChange={v=>setValues(prev=>({...prev,[`right-${key}`]:v}))}/><Field signed label={`Sol · ${label}`} value={values[`left-${key}`]??''} onChange={v=>setValues(prev=>({...prev,[`left-${key}`]:v}))}/></View>;
     return <Field key={key} signed={key!=='Renk'} label={`${key==='Renk'?'':prefix}${label}`} value={values[key]??''} onChange={v=>setValues(prev=>({...prev,[key]:v}))}/>;})}
   </>}
  </View>
  <Copy size={14} muted>Kaydettikten sonra günlük hatırlatma izni istenir. İzin vermezsen uygulama yine çalışır.</Copy>
  <Button title={busy?'Kaydediliyor…':'İlk paketi kaydet'} disabled={busy} onPress={save}/>
 </Screen>;
}

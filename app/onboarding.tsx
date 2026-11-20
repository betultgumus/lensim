import React, { useState } from 'react';
import { Platform, Switch, View } from 'react-native';
import { router, Redirect } from 'expo-router';
import { Button, Copy, Field, Screen, SegmentedControl, useColors, switchColors, switchThumb } from '../src/components/ui';
import { useApp, uid } from '../src/state/AppContext';
import type { Eye, LensBox } from '../src/domain/types';
import { addDays, formatDate, isWithinEntryWindow } from '../src/domain/dates';
import { DateField } from '../src/components/DateField';
import { DurationPicker, LensTypePicker, NumberGrid, numberKeys } from '../src/components/LensForm';
import { assertRxValues } from '../src/domain/rx';
import { notificationAccess, requestNotifications } from '../src/services/notifications';
import { TimePicker } from '../src/components/TimePicker';

/** Light card that groups one question with its options and note (same look as the number section). */
function Section({ children }: React.PropsWithChildren) {
  const t = useColors();
  return <View style={{ padding: 14, borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.surface, gap: 10 }}>{children}</View>;
}
function ReminderRow({ title, detail, value, onChange }: { title: string; detail: string; value: boolean; onChange: (v: boolean) => void }) {
  const t = useColors();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}>
    <View style={{ flex: 1, gap: 2 }}><Copy bold size={15} style={{ lineHeight: 20 }}>{title}</Copy><Copy size={14} muted style={{ lineHeight: 19 }}>{detail}</Copy></View>
    <Switch accessibilityLabel={title} value={value} onValueChange={onChange} {...switchColors} thumbColor={switchThumb(value)}/>
  </View>;
}

export default function Onboarding(){
 const {state,dispatch,today}=useApp();const t=useColors();
 const [eye,setEye]=useState<'both'|Eye>('both');const [defaultAnswer,setDefaultAnswer]=useState<'worn'|'notWorn'>('worn');
 const [duration,setDuration]=useState('30');const [custom,setCustom]=useState(false);
 const [name,setName]=useState('');const [nameError,setNameError]=useState<string|null>(null);const [brand,setBrand]=useState('');const [count,setCount]=useState('6');
 const [type,setType]=useState<LensBox['lensType']>('spherical');const [date,setDate]=useState(today);
 const [values,setValues]=useState<Record<string,string>>({});const [wantsNumbers,setWantsNumbers]=useState(false);const [separateNumbers,setSeparateNumbers]=useState(false);
 const [dailyReminder,setDailyReminder]=useState(false);const [dailyTime,setDailyTime]=useState<string|null>(state.settings.notificationTime);const [timeError,setTimeError]=useState(false);const [nightReminder,setNightReminder]=useState(false);
 const [busy,setBusy]=useState(false);
 if(state.onboarded&&state.packages.length)return <Redirect href="/(tabs)"/>;
 const keys=numberKeys(type);
 const split=separateNumbers&&eye==='both';
 const chooseEye=(value:'both'|Eye)=>{if(value!=='both'&&separateNumbers){setValues(prev=>({...Object.fromEntries(keys.map(k=>[k,prev[`${value}-${k}`]??prev[k]??''])),Renk:prev.Renk??''}));setSeparateNumbers(false);}setEye(value);};
 const nameMissing='Kutu adı zorunlu. Paketini ayırt etmeni sağlayacak bir ad yaz (ör. “1.5 numara mavi kap”).';
 const save=async()=>{
  if(!name.trim()){setNameError(nameMissing);return;}
  if(dailyReminder&&!dailyTime){setTimeError(true);return;}
  setBusy(true);try{
  const days=Number(duration),qty=Number(count);
  if(!isWithinEntryWindow(date,today))throw new Error(`Paket açılış tarihi ${formatDate(addDays(today,-30))} ile ${formatDate(today)} arasında olmalı.`);
  if(!Number.isInteger(days)||days<1||days>365)throw new Error('Kullanım süresini 1 ile 365 gün arasında seç veya yaz.');
  if(!Number.isInteger(qty)||qty<(eye==='both'?2:1))throw new Error(eye==='both'?'Kutudaki lens sayısını kontrol et. İki göz için en az 2 lens gerekir.':'Kutudaki lens sayısını kontrol et; en az 1 olmalı.');
  // Wrong number values stop the save with a clear message; nothing is stored.
  if(wantsNumbers)assertRxValues(Object.fromEntries(Object.entries(values).filter(([k])=>k!=='Renk')));
  const makeRx=(side:Eye)=>Object.fromEntries(keys.map(k=>[k,(values[split?`${side}-${k}`:k]??'').trim().replace(',','.')]).filter(([,v])=>String(v)));
  const eyes:Eye[]=eye==='both'?['right','left']:[eye];
  const box:LensBox={id:uid(),name:name.trim(),brand:brand.trim(),lensType:type,durationDays:days,lensesTotal:qty,lensesRemaining:qty,eyes:[...eyes],prescription:{right:wantsNumbers&&eyes.includes('right')?makeRx('right'):{},left:wantsNumbers&&eyes.includes('left')?makeRx('left'):{},color:type==='colored'?(values.Renk??'').trim():''}};
  // The chosen time is the same setting as Ayarlar → Hatırlatmalar → “Günlük soru saati”.
  await dispatch({type:'settings',patch:{defaultAnswer,...(dailyReminder&&dailyTime?{notificationTime:dailyTime}:{})}});
  await dispatch({type:'openPackages',ids:eyes.map(()=>uid()),newBox:box,eyes,date,...(eyes.length===2?{pairId:uid()}:{})});
  // Permission is asked only for the reminders chosen above; each keeps its own on/off and time.
  if(dailyReminder||nightReminder){try{// The web preview has no permission to ask: the choice is saved as on the Hatırlatmalar screen.
   const granted=(await notificationAccess())==='unavailable'||await requestNotifications();if(granted)await dispatch({type:'settings',patch:{notifications:dailyReminder,nightReminder}});}catch{/* Tracking works without reminders; they can be turned on in Ayarlar. */}}
  router.replace(date<today?{pathname:'/(tabs)',params:{mark:date}}:'/(tabs)');
 }finally{setBusy(false);}};
 return <Screen title="Lensim" subtitle="İlk lens paketini ekle. Hesap gerekmez.">
  <View style={{padding:16,borderLeftWidth:4,borderLeftColor:t.accent,backgroundColor:t.soft,borderRadius:12,gap:6}}><Copy bold>{Platform.OS==='web'?'Verilerin yalnızca bu tarayıcıda saklanır.':'Verilerin yalnızca bu telefonda saklanır.'}</Copy><Copy muted>Lensim lens paketlerini, değişim zamanını ve günlük “taktım / takmadım” kayıtlarını tutar ve istersen hatırlatma kurar. Hesap, giriş veya internet bağlantısı gerekmez; kayıtların hiçbir sunucuya gönderilmez. Hesap ve bulut yedeği isteğe bağlıdır ve yalnızca sen ayrıca onaylarsan açılır.</Copy><Copy muted size={14}>{Platform.OS==='web'?'Tarayıcı verisini silersen kayıtlar da silinir.':'Telefon değiştirirsen veya uygulamayı silersen kayıtlar kendiliğinden geri gelmez;'} Ayarlar → Veri yedeği’nden .json yedek dosyası alabilir, Ayarlar → Gizlilik ve veriler’den bütün kayıtlarını silebilirsin. Lensim tıbbi cihaz değildir; lens kullanımıyla ilgili kararlar için göz hekimine danış.</Copy></View>
  <SegmentedControl label="Göz" selected={eye} onChange={v=>chooseEye(v as 'both'|Eye)} options={[{value:'both',title:'İkisi'},{value:'right',title:'Sağ'},{value:'left',title:'Sol'}]}/>
  <Copy bold>Kullanım süresi</Copy>
  <DurationPicker days={duration} custom={custom} onChange={(d,c)=>{setDuration(d);setCustom(c);}}/>
  <Field label="Kutudaki lens sayısı" numeric value={count} onChange={setCount}/>
  <DateField label="Lens kutusunu açtığın tarih" value={date} onChange={setDate}/>
  <Copy size={14} muted>Bugün açtıysan değiştirme. En fazla 30 gün öncesini seçebilirsin.</Copy>
  <Section>
   <Copy bold>Bir gün cevap vermezsen o gün…</Copy>
   <SegmentedControl label="Varsayılan cevap" selected={defaultAnswer} onChange={v=>setDefaultAnswer(v as 'worn'|'notWorn')} options={[{value:'worn',title:'Taktım sayılsın'},{value:'notWorn',title:'Takmadım sayılsın'}]}/>
   <Copy size={14} muted>Otomatik sayılan günler takvimde soluk görünür; istediğin zaman düzeltebilirsin. Takip günü saat 02.00’de değişir.</Copy>
  </Section>
  <Copy bold>Kutu bilgisi</Copy>
  <Field label="Kutu adı" tag={{text:'Zorunlu',required:true}} value={name} onChange={v=>{setName(v);if(v.trim())setNameError(null);}} placeholder="Örn. 1.5 numara mavi kap" error={nameError}/>
  <Field label="Marka" tag={{text:'İsteğe bağlı'}} value={brand} onChange={setBrand} placeholder="Örn. kutunun üzerindeki marka"/>
  <Section>
   <View style={{gap:2}}><Copy bold>Numara bilgisi</Copy><Copy muted size={14}>İsteğe bağlı. Bilmiyorsan boş bırak; takip yine çalışır.</Copy></View>
   <View style={{gap:8}}><Copy bold size={14}>Lens türü</Copy><LensTypePicker type={type} onChange={setType}/></View>
   <View style={{height:1,backgroundColor:t.border}}/>
   <Copy bold size={14}>Numara değerleri</Copy>
   <SegmentedControl label="Numara girişi" selected={wantsNumbers?'yes':'no'} onChange={v=>setWantsNumbers(v==='yes')} options={[{value:'yes',title:'Numara gir'},{value:'no',title:'Şimdi geç'}]}/>
   {wantsNumbers&&<>
    {eye==='both'&&<SegmentedControl label="Sağ ve sol" selected={separateNumbers?'different':'same'} onChange={v=>{const separate=v==='different';setValues(prev=>separate?{...Object.fromEntries(keys.flatMap(k=>[[`right-${k}`,prev[`right-${k}`]??prev[k]??''],[`left-${k}`,prev[`left-${k}`]??prev[k]??'']])),Renk:prev.Renk??''}:{...Object.fromEntries(keys.map(k=>[k,prev[k]||prev[`right-${k}`]||prev[`left-${k}`]||''])),Renk:prev.Renk??''});setSeparateNumbers(separate);}} options={[{value:'same',title:'İki göz aynı'},{value:'different',title:'Farklı'}]}/>}
    <NumberGrid type={type} eyes={eye==='both'?['right','left']:[eye]} separate={split} values={values} onChange={(k,v)=>setValues(prev=>({...prev,[k]:v}))}/>
   </>}
  </Section>
  <Section>
   <View style={{gap:2}}><Copy bold>Hatırlatmalar</Copy><Copy muted size={14}>Günlük soru, takvim kaydını hatırlatır; lens değişim uyarıları da seçtiğin saatte gelir. İzin isteği yalnızca hatırlatıcı kurmayı seçersen çıkar. Sonra Ayarlar’dan değiştirebilirsin.</Copy></View>
   <View style={{flexDirection:'row',gap:8}}><View style={{flex:1}}><Button title="Hatırlatıcıları ayarla" secondary outlined onPress={()=>setDailyReminder(true)}/></View><View style={{flex:1}}><Button title="Şimdi değil" secondary onPress={()=>setDailyReminder(false)}/></View></View>
   {dailyReminder&&<Copy size={14} muted>Her gün “Bugün lens taktın mı?” diye sorar. Paket değişim uyarıları da seçtiğin saatte gelir.</Copy>}
   {dailyReminder&&<TimePicker label="Günlük soru saati" value={dailyTime??''} presets={['08:00','12:00','18:00','20:00','21:00','22:00']} onChange={time=>{setDailyTime(time);if(time)setTimeError(false);}}/>}
   <View style={{height:1,backgroundColor:t.border}}/>
   <ReminderRow title="“Lenslerini çıkardın mı?”" detail={`Lensle uyumamak için her gece saat ${state.settings.nightReminderTime}’te hatırlatır.`} value={nightReminder} onChange={setNightReminder}/>
  </Section>
  {!!nameError&&<Copy size={14} style={{color:t.danger}}>Kaydetmek için yukarıdaki “Kutu adı” alanını doldur.</Copy>}
  {timeError&&<Copy size={14} style={{color:t.danger}}>Günlük soru saatini SS:DD biçiminde gir ya da hazır saatlerden birini seç.</Copy>}
  <Button title={busy?'Kaydediliyor…':'İlk paketi kaydet'} disabled={busy} onPress={save}/>
 </Screen>;
}

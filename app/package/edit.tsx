import React,{useState} from 'react';
import {View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Button,Chip,Copy,Field,Screen,SegmentedControl,styles} from '../../src/components/ui';
import {DateField} from '../../src/components/DateField';
import {useApp} from '../../src/state/AppContext';
import {DURATION_OPTIONS,isPresetDuration} from '../../src/domain/dates';

export default function EditPackage(){
 const {id}=useLocalSearchParams<{id:string}>();const {state,dispatch,today}=useApp();
 const pack=state.packages.find(p=>p.id===id);const box=state.boxes.find(b=>b.id===pack?.boxId);
 const partner=pack?.pairId?state.packages.find(p=>p.pairId===pack.pairId&&p.id!==pack.id):undefined;
 const [date,setDate]=useState(pack?.openedOn??today);const initial=pack?.durationDaysSnapshot??box?.durationDays??30;
 const [duration,setDuration]=useState(String(initial));const [custom,setCustom]=useState(!isPresetDuration(initial));
 const [withPair,setWithPair]=useState(true);
 if(!pack||!box)return <Screen title="Paket bulunamadı" back/>;
 const daily=initial===1;
 const save=async()=>{const days=Number(duration);if(!Number.isInteger(days)||days<1||days>365)throw new Error('Süreyi 1–365 gün arasında gir.');await dispatch({type:'editPackage',id:pack.id,openedOn:date,durationDays:days,withPair:!!partner&&withPair});router.back();};
 return <Screen title="Paketi düzenle" subtitle="Açılış tarihi ve kullanım süresi" back>
  {partner&&<><Copy bold>Hangi gözler değişsin?</Copy><SegmentedControl label="Düzenlenecek gözler" selected={withPair?'both':'one'} onChange={v=>setWithPair(v==='both')} options={[{value:'both',title:'İki göz'},{value:'one',title:pack.eye==='right'?'Yalnız sağ':'Yalnız sol'}]}/></>}
  <DateField label="Lens kutusunu açtığın tarih" value={date} onChange={setDate}/>
  {daily?<Copy muted>Günlük lens paketinin süresi değişmez.</Copy>:<><Copy bold>Kullanım süresi</Copy><View style={styles.wrap}>{DURATION_OPTIONS.filter(([n])=>n>1).map(([n,label])=><Chip key={n} title={label} selected={!custom&&duration===String(n)} onPress={()=>{setCustom(false);setDuration(String(n));}}/>)}<Chip title="Özel" selected={custom} onPress={()=>setCustom(true)}/></View>{custom&&<Field label="Özel kullanım süresi · gün" numeric value={duration} onChange={setDuration}/>}</>}
  <Copy size={14} muted>Takvimdeki cevapların korunur. Kutudaki lens adedini kutu düzenleme ekranından değiştirebilirsin.</Copy>
  <Button title="Değişiklikleri kaydet" icon="save-outline" onPress={save}/>
 </Screen>;
}

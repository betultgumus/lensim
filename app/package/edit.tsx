import React,{useEffect,useState} from 'react';
import {View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Button,Copy,Screen,SegmentedControl} from '../../src/components/ui';
import {DurationPicker} from '../../src/components/LensForm';
import {DateField} from '../../src/components/DateField';
import {useApp} from '../../src/state/AppContext';
import {isPresetDuration} from '../../src/domain/dates';

export default function EditPackage(){
 const {id}=useLocalSearchParams<{id:string}>();const {state,dispatch,today}=useApp();
 const pack=state.packages.find(p=>p.id===id);const box=state.boxes.find(b=>b.id===pack?.boxId);
 const partner=pack?.pairId?state.packages.find(p=>p.pairId===pack.pairId&&p.id!==pack.id):undefined;
 const [date,setDate]=useState(pack?.openedOn??today);const initial=pack?.durationDaysSnapshot??box?.durationDays??30;
 const [duration,setDuration]=useState(String(initial));const [custom,setCustom]=useState(!isPresetDuration(initial));
 const [withPair,setWithPair]=useState(true);
 // The saved package can change while this screen is open (e.g. its opening moved from the calendar): show the saved values.
 useEffect(()=>{if(pack){setDate(pack.openedOn);const d=pack.durationDaysSnapshot??box?.durationDays??30;setDuration(String(d));setCustom(!isPresetDuration(d));}},[pack?.openedOn,pack?.durationDaysSnapshot]);// eslint-disable-line react-hooks/exhaustive-deps
 if(!pack)return <Screen title="Paket bulunamadı" back/>;
 const daily=initial===1;
 const save=async()=>{const days=Number(duration);if(!Number.isInteger(days)||days<1||days>365)throw new Error('Süreyi 1–365 gün arasında gir.');await dispatch({type:'editPackage',id:pack.id,openedOn:date,durationDays:days,withPair:!!partner&&withPair});router.back();};
 return <Screen title="Paketi düzenle" subtitle="Açılış tarihi ve kullanım süresi" back>
  {partner&&<><Copy bold>Hangi gözler değişsin?</Copy><SegmentedControl label="Düzenlenecek gözler" selected={withPair?'both':'one'} onChange={v=>setWithPair(v==='both')} options={[{value:'both',title:'İki göz'},{value:'one',title:pack.eye==='right'?'Yalnız sağ':'Yalnız sol'}]}/></>}
  <DateField label="Lens kutusunu açtığın tarih" value={date} onChange={setDate}/>
  {!box||!daily?<><Copy bold>Kullanım süresi</Copy><DurationPicker days={duration} custom={custom} onChange={(d,c)=>{setDuration(d);setCustom(c);}}/></>:<Copy muted>Günlük lens paketinin süresi kutu stoğu hesabı nedeniyle değişmez.</Copy>}
  <Copy size={14} muted>Takvimdeki cevapların korunur. Kutudaki lens adedini kutu düzenleme ekranından değiştirebilirsin.</Copy>
  <Button title="Değişiklikleri kaydet" icon="save-outline" onPress={save}/>
 </Screen>;
}

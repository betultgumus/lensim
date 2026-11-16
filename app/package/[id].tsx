import React, { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Chip, Copy, Screen, styles } from '../../src/components/ui';
import { useApp, uid } from '../../src/state/AppContext';
import { addDays, getDaysRemaining, isWithinEntryWindow } from '../../src/domain/dates';
import { eyeLabel } from '../../src/domain/types';

export default function PackageDetail() {
  const { id }=useLocalSearchParams<{id:string}>(); const {state,today,dispatch}=useApp();
  const pack=state.packages.find(p=>p.id===id); const box=state.boxes.find(b=>b.id===pack?.boxId);
  const [selected,setSelected]=useState(today);
  const dates=useMemo(()=>{if(!pack)return[];const end=pack.closedOn??today;const result:string[]=[];for(let d=pack.openedOn;d<=end&&result.length<366;d=addDays(d,1))result.push(d);return result;},[pack?.id,pack?.openedOn,pack?.closedOn,today]);
  if(!pack||!box)return <Screen title="Paket bulunamadı" back><Copy>Bu kayıt taşınmış ya da silinmiş olabilir.</Copy></Screen>;
  const duration=pack.durationDaysSnapshot??box.durationDays;const lensType=pack.lensTypeSnapshot??box.lensType;const rx=pack.prescriptionSnapshot??box.prescription;
  const entries=state.checkIns.filter(c=>c.packageId===pack.id); const worn=entries.filter(c=>c.status==='worn').length;
  const openDays=Math.max(1,getDaysRemaining(pack.closedOn??today,pack.openedOn)+1); const left=Math.max(0,duration-openDays);
  const selectedEntry=entries.find(c=>c.date===selected); const reserveDays=Math.floor(box.lensesRemaining/Math.max(1,box.eyes.length))*duration; const reserveCopy=reserveDays>=30?`yaklaşık ${Math.floor(reserveDays/30)} ay yeter`:`yaklaşık ${reserveDays} gün yeter`;
  const saveDay=async(status:'worn'|'notWorn'|'glasses')=>{if(!isWithinEntryWindow(selected,today))throw new Error('Geçmiş kullanım kaydı en fazla 30 gün geriye girilebilir.');const applicable=state.packages.find(p=>p.openedOn<=selected&&(!p.closedOn||selected<=p.closedOn));if(applicable)await dispatch({type:'checkIn',id:uid(),packageId:applicable.id,date:selected,status,automatic:false});};
  return <Screen title={`${eyeLabel(pack.eye)} göz`} subtitle={`${box.name}${box.brand?` · ${box.brand}`:''}`} back>
    <Card style={{borderRadius:6,padding:16,gap:8}}>
      <Copy size={14} bold>{lensType==='spherical'?'KÜRESEL':lensType==='toric'?'TORİK':lensType==='multifocal'?'MULTİFOKAL':'RENKLİ'} LENS</Copy>
      {duration===1?<Copy size={48} bold>{state.checkIns.filter(c=>c.packageId===pack.id&&c.status==='worn'&&c.date.slice(0,7)===today.slice(0,7)).length} <Copy size={17}>bu ay takılan gün</Copy></Copy>:<Copy size={48} bold>{openDays}<Copy size={22}>/{duration}</Copy></Copy>}
      <Copy>{duration===1?`Kutuda ${box.lensesRemaining} lens · ${reserveCopy}`:`${openDays} gündür açık · ${worn} gün taktın · ${left} gün kaldı`}</Copy>
      {!!box.brand&&<Copy muted>Marka: {box.brand}</Copy>}
      {Object.entries(rx[pack.eye]??{}).map(([k,v])=><Copy key={k} muted>{k}: {v}</Copy>)}
      {rx.color&&<Copy muted>Renk: {rx.color}</Copy>}
      <Button title="Kutuyu düzenle" secondary icon="create-outline" onPress={()=>router.push({pathname:'/box/[id]',params:{id:box.id}})}/>
      <Button title="Paketi düzenle" secondary icon="create-outline" onPress={()=>router.push({pathname:'/package/edit',params:{id:pack.id}})}/>
      <Button title="Paketi sil" secondary danger icon="trash-outline" onPress={()=>Alert.alert('Paket silinsin mi?','Bu paketin geçmiş kayıtları kaldırılır. Kutudaki yedek lens sayısı geri eklenir.',[{text:'Vazgeç',style:'cancel'},{text:'Paketi sil',style:'destructive',onPress:()=>dispatch({type:'deletePackage',id:pack.id}).then(()=>router.replace('/(tabs)'))}])}/>
      {!pack.closedOn&&<Button title="Bu paketi bitir, yenisini aç" icon="add" onPress={()=>router.push({pathname:'/package/new',params:{eye:pack.eye}})}/>}
    </Card>
    <Copy size={20} bold>Kullanım takvimi</Copy>
    <View style={styles.wrap}>{dates.map(date=>{const entry=entries.find(c=>c.date===date);const selectedDay=selected===date;const tone=entry?.automatic?'#D98219':entry?.status==='worn'?'#0754C8':entry?'#83BDEB':'#D7DEE8';return <Chip key={date} title={date.slice(8)+ (entry?.automatic?' ·':'')} selected={selectedDay} onPress={()=>setSelected(date)} />})}</View>
    <Card style={{borderRadius:6}}><Copy bold>{selected}</Copy><Copy>{selectedEntry?selectedEntry.status==='worn'?'Lens taktın':selectedEntry.status==='glasses'?'Gözlük taktın':'Lens takmadın':'Bu gün için cevaplanmadı'}</Copy>{selectedEntry?.automatic&&<Copy muted>Bu gün cevapsız kaldığı için varsayılan seçimin “{selectedEntry.status==='worn'?'lens taktın':'lens takmadın'}” ile dolduruldu. Gerçekten taktın mı?</Copy>}{isWithinEntryWindow(selected,today)&&<View style={styles.wrap}>{(['worn','notWorn','glasses'] as const).map(s=><Chip key={s} title={s==='worn'?'Lens taktım':s==='notWorn'?'Lens takmadım':'Gözlük taktım'} selected={selectedEntry?.status===s&&!selectedEntry.automatic} onPress={()=>saveDay(s)}/>)}</View>}{selected<addDays(today,-30)&&<Copy size={13} muted>30 günden eski kayıtları görüntüleyebilirsin; değiştiremezsin.</Copy>}</Card>
    {pack.closedOn&&<Copy muted>Paket {pack.openedOn} tarihinde açıldı, {pack.closedOn} tarihinde kapandı.</Copy>}
  </Screen>;
}

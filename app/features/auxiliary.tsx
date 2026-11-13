import React, { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Button, Card, Copy, Field, Screen } from '../../src/components/ui';
import { useApp, uid } from '../../src/state/AppContext';
import { dateOnly, formatDate, getDaysRemaining } from '../../src/domain/dates';
export default function AuxiliaryScreen() {
  const params=useLocalSearchParams<{kind:string}>(); const kind=params.kind==='case' ? 'case' : 'solution';
  const { state,dispatch,today }=useApp(); const [start,setStart]=useState(dateOnly); const [due,setDue]=useState(''); const [name,setName]=useState('');
  const current=state.auxiliary.find(e=>e.kind===kind && !e.completed); const title=kind==='case' ? 'Lens kabım' : 'Solüsyonum';
  if(!state.modules[kind])return <Screen title={`${title} kapalı`} back><Copy>Özellikler ekranından açabilirsin. Kayıtların korunuyor.</Copy></Screen>;
  return <Screen title={title} subtitle="Ürün talimatına göre, kendi takviminde." back>
    {current ? <Card><Copy bold size={22}>{current.name || title}</Copy><Copy size={34} bold>{getDaysRemaining(current.due,today)} <Copy size={16}>gün</Copy></Copy><Copy muted>Değişim: {formatDate(current.due)}</Copy><Copy muted size={12}>Açılış: {formatDate(current.start)}</Copy></Card> : <Card><Copy bold>İlk kaydını ekleyelim.</Copy><Copy muted>Değişim tarihini ürün talimatına göre seç.</Copy></Card>}
    <Copy bold>{current ? (kind==='case' ? 'Yeni lens kabı kullanmaya başladım' : 'Yeni solüsyon açtım') : 'İlk kayıt'}</Copy>
    <Field label="Marka / isim (isteğe bağlı)" value={name} onChange={setName}/><Field label="Açılış tarihi · YYYY-AA-GG" value={start} onChange={setStart}/><Field label="Değişim tarihi · YYYY-AA-GG" value={due} onChange={setDue} placeholder="Ürün talimatına göre seç"/>
    <Copy size={12} muted>Her ürün için aynı kullanım süresi varsayılmaz. Yeni kayıt önceki kaydı geçmişe taşır. Modül kapatılırsa bu hatırlatıcı iptal edilir.</Copy>
    <Button title="Kaydı başlat" onPress={async()=>{ await dispatch({ type:'auxiliary',entry:{ id:uid(),kind,name,start,due,completed:null } }); setName(''); setDue(''); }}/>
    <Copy bold>Önceki kayıtlar</Copy>{state.auxiliary.filter(e=>e.kind===kind && e.completed).reverse().map(e=><Card key={e.id}><Copy bold>{e.name || title}</Copy><Copy size={12} muted>{formatDate(e.start,true)} → {formatDate(e.completed!,true)}</Copy></Card>)}
  </Screen>;
}

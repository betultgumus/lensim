import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card, Copy, PagedList, Screen, Sheet, Button, Chip, styles, useColors } from '../../src/components/ui';
import { DateField } from '../../src/components/DateField';
import { useApp } from '../../src/state/AppContext';
import { addDays, addMonths, dateOnly, formatDate, parseDate, planLabel } from '../../src/domain/dates';
import { activeCycles } from '../../src/domain/reducer';
import { scopeLabel } from '../../src/domain/types';

export default function Calendar() {
  const { state, today, dispatch } = useApp(); const t = useColors();
  const [correction,setCorrection]=useState<{id:string;date:string}|null>(null);
  const [month, setMonth] = useState(today.slice(0,7)+'-01'); const [selected, setSelected] = useState<string | null>(null); const [history, setHistory] = useState(false);
  const first = parseDate(month); const offset = (first.getDay()+6)%7; const start = addDays(month,-offset);
  const days = Array.from({ length:42 },(_,i) => addDays(start,i)); const active = activeCycles(state);
  const events = (day:string) => [
    ...state.cycles.filter(c => c.completed === day).map(c => ({ key:c.id, title:`${scopeLabel(c.profileId)} · ${c.plan.kind === 'daily' ? 'Lens atıldı' : 'Değiştirildi'}`, detail:`${formatDate(c.start,true)} → ${formatDate(c.completed!,true)}`, planned:false })),
    ...active.filter(c => c.due === day).map(c => ({ key:`due-${c.id}`, title:`${scopeLabel(c.profileId)} · Planlanan değişim`, detail:planLabel(c.plan), planned:true })),
    ...active.filter(c => c.start === day).map(c => ({ key:`start-${c.id}`, title:`${scopeLabel(c.profileId)} · Başlangıç`, detail:planLabel(c.plan), planned:false })),
  ];
  return <Screen title="Takvimin" subtitle="Her yeni başlangıç burada.">
    <View style={styles.wrap}><Chip title="Takvim" selected={!history} onPress={() => setHistory(false)}/><Chip title="Geçmiş" selected={history} onPress={() => setHistory(true)}/></View>
    {!history ? <Card>
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}><Pressable accessibilityLabel="Önceki ay" accessibilityRole="button" style={styles.icon} onPress={() => setMonth(addMonths(month,-1))}><Ionicons name="chevron-back" size={22} color={t.accent}/></Pressable><Copy size={18} bold>{first.toLocaleDateString('tr-TR',{ month:'long',year:'numeric' })}</Copy><Pressable accessibilityLabel="Sonraki ay" accessibilityRole="button" style={styles.icon} onPress={() => setMonth(addMonths(month,1))}><Ionicons name="chevron-forward" size={22} color={t.accent}/></Pressable></View>
      <View style={{ flexDirection:'row' }}>{['Pt','Sa','Ça','Pe','Cu','Ct','Pz'].map(d => <View key={d} style={{ flex:1, alignItems:'center' }}><Copy muted size={12}>{d}</Copy></View>)}</View>
      <View style={{ flexDirection:'row', flexWrap:'wrap' }}>{days.map(day => { const list = events(day); return <Pressable key={day} accessibilityRole="button" accessibilityLabel={`${formatDate(day)}, ${list.length ? list.map(e=>e.title).join(', ') : 'Kayıt yok'}`} onPress={() => setSelected(day)} style={{ width:'14.2857%', minHeight:48, alignItems:'center', justifyContent:'center', borderRadius:12, backgroundColor:day === today ? t.soft : undefined, opacity:day.slice(0,7) === month.slice(0,7) ? 1 : .3 }}><Copy bold={day === today} size={15}>{Number(day.slice(-2))}</Copy><Copy size={10} style={{ color:t.accent, height:15 }}>{list.some(e=>e.planned) ? '◇' : list.length ? '●' : ''}</Copy></Pressable>; })}</View>
      <Copy size={11} muted>● Başlangıç / gerçekleşen değişim   ◇ Planlanan değişim</Copy>
      <Button title="Bugüne dön" secondary onPress={() => setMonth(today.slice(0,7)+'-01')}/>
    </Card> : <>
      <Copy muted size={13}>Son kayıtlar önce gösterilir. Aktif döngünün tarihi lens planından düzeltilebilir.</Copy>
      {state.cycles.filter(c=>c.completed).length === 0 && <Card><Copy bold>İlk yeni başlangıcın burada görünecek.</Copy><Copy muted>Henüz tamamlanan lens döngüsü yok.</Copy></Card>}
      {/* Twenty records per page keep history bounded on small devices. */}
      <PagedList items={state.cycles.filter(c=>c.completed).reverse()} renderItem={c => <Card style={{ marginBottom:12 }}><Copy bold>{scopeLabel(c.profileId)} · {planLabel(c.plan)}</Copy><Copy size={13}>Başlangıç: {formatDate(c.start)}</Copy><Copy muted size={13}>Planlanan: {formatDate(c.due)}</Copy><Copy size={13}>Gerçekleşen: {formatDate(c.completed!)}</Copy><Button title="Gerçekleşen tarihi düzelt" secondary onPress={()=>setCorrection({id:c.id,date:c.completed!})}/></Card>}/>
    </>}
    <Copy size={18} bold>Sıradaki başlangıçlar</Copy>
    {active.length === 0 ? <Copy muted>Yeni lens açtığında planın burada görünecek.</Copy> : active.map(c => <Card key={c.id}><Copy bold>{scopeLabel(c.profileId)} · {formatDate(c.due)}</Copy><Copy muted size={13}>Planlanan değişim</Copy><Button secondary title="Tarihi / planı düzelt" onPress={() => router.push({ pathname:'/lens', params:{ scope:c.profileId } })}/></Card>)}
    <Sheet visible={!!selected} title={selected ? formatDate(selected) : ''} onClose={() => setSelected(null)}>{selected && events(selected).length ? events(selected).map(e => <Card key={e.key}><Copy bold>{e.title}</Copy><Copy muted>{e.detail}</Copy></Card>) : <Copy muted>Bu tarihte kayıt yok.</Copy>}</Sheet>
    <Sheet visible={!!correction} title="Geçmiş tarihini düzelt" onClose={()=>setCorrection(null)}>{correction && <><Copy muted>Bağlı bir sonraki döngünün başlangıcı, hesaplanan değişim günü ve stok hareket tarihi de güncellenir.</Copy><DateField label="Gerçek değişim tarihi" value={correction.date} onChange={date=>setCorrection({...correction,date})}/><Button title="Düzeltmeyi kaydet" onPress={async()=>{await dispatch({type:'correctHistory',cycleId:correction.id,date:correction.date});setCorrection(null);}}/></>}</Sheet>
  </Screen>;
}

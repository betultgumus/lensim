import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button, Card, Copy, Field, Row, Screen, Sheet, useColors } from '../../src/components/ui';
import { Countdown } from '../../src/components/Countdown';
import { Mascot } from '../../src/components/Mascot';
import { useApp, uid } from '../../src/state/AppContext';
import { activeCycles } from '../../src/domain/reducer';
import { dateOnly, formatDate, getDaysRemaining } from '../../src/domain/dates';
import { scopeLabel, type AppState, type Cycle } from '../../src/domain/types';

export default function Home() {
  const { state, dispatch, today, syncWarning, resync } = useApp(); const t = useColors();
  const [selected, setSelected] = useState<Cycle | null>(null); const [date, setDate] = useState(dateOnly);
  const [success, setSuccess] = useState<{ previous:AppState; revision:number; daily:boolean; due?:string } | null>(null);
  useEffect(() => { if (!success) return; const timer = setTimeout(() => setSuccess(null), 12000); return () => clearTimeout(timer); }, [success]);
  const cycles = activeCycles(state); const hour = new Date().getHours();
  const replace = async () => {
    if (!selected) return;
    const previous = state; const next = await dispatch({ type:'replace', cycleId:selected.id, date, id:uid() });
    setSuccess({ previous, revision:next.revision, daily:selected.plan.kind === 'daily', due:activeCycles(next).find(c => c.profileId === selected.profileId)?.due }); setSelected(null);
    if (state.settings.haptics) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };
  return <Screen>
    <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}><View><Copy bold size={14} style={{ color:t.accent }}>◉  Lens Takip</Copy><Copy size={27} bold>{hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar'} <Copy size={23}>☀</Copy></Copy></View><Pressable accessibilityRole="button" accessibilityLabel="Ayarları aç" onPress={() => router.push('/(tabs)/settings')} style={{ width:44, height:44, borderRadius:16, backgroundColor:t.surface, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:t.border }}><Ionicons name="options-outline" size={22} color={t.accent}/></Pressable></View>
    <Copy muted size={13} style={{ marginTop:-12 }}>Kendine ayırdığın küçük bir an.</Copy>
    {cycles.map(cycle => <View key={cycle.id} style={{ gap:16 }}>
      {state.modules.separate && <Copy size={18} bold>{scopeLabel(cycle.profileId)}</Copy>}
      <Countdown cycle={cycle}/>
      <Button title={cycle.plan.kind === 'daily' ? 'Lensimi attım' : state.modules.separate ? `${scopeLabel(cycle.profileId)} lensimi değiştirdim` : 'Lenslerimi değiştirdim'} icon="checkmark-circle-outline" disabled={cycle.start > today} onPress={() => { setDate(today); setSelected(cycle); }}/>
      <View style={{ flexDirection:'row', gap:12 }}><Card style={{ flex:1, gap:6, padding:16 }}><Copy size={11} muted>BAŞLANGIÇ</Copy><Copy bold size={14}>{formatDate(cycle.start,true)}</Copy></Card><Card style={{ flex:1, gap:6, padding:16 }}><Copy size={11} muted>DEĞİŞİM GÜNÜ</Copy><Copy bold size={14}>{formatDate(cycle.due,true)}</Copy></Card></View>
      <Row title="Lens planını düzenle" detail="Tarih, süre ve isteğe bağlı bilgiler" icon="create-outline" onPress={() => router.push({ pathname:'/lens', params:{ scope:cycle.profileId } })}/>
    </View>)}
    {state.profiles.filter(p => (state.modules.separate ? p.id !== 'both' : p.id === 'both') && !cycles.some(c => c.profileId === p.id)).map(p => <Card key={p.id}><Copy size={21} bold>Yeni bir başlangıç.</Copy><Copy muted>{scopeLabel(p.id)} için etkin lens kaydı yok. Yalnızca gerçekten lens açtığında kaydet.</Copy><Button title="Yeni lens açtım" onPress={() => dispatch({ type:'openLens', scope:p.id, date:today, id:uid() })}/><Button title="Lens planını düzenle" secondary onPress={()=>router.push({pathname:'/lens',params:{scope:p.id}})}/></Card>)}
    {state.modules.stock && <Card><Row title={`${state.stock.unit === 'pairs' ? state.stock.pieces / 2 : state.stock.pieces} ${state.stock.unit === 'pairs' ? 'çift' : 'lens'} stokta`} detail={state.stock.pieces <= 2 ? 'Stok azaldı, kontrol etmeyi unutma.' : 'Yeni başlangıçlara hazırsın.'} icon="cube-outline" onPress={() => router.push('/features/stock')}/></Card>}
    {(['solution','case'] as const).filter(k => state.modules[k]).map(kind => { const entry = state.auxiliary.find(e => e.kind === kind && !e.completed); return <Card key={kind}><Row title={kind === 'solution' ? 'Solüsyonum' : 'Lens kabım'} detail={entry ? `${formatDate(entry.due,true)} · ${getDaysRemaining(entry.due,today)} gün` : 'İlk kaydını ekle'} icon={kind === 'solution' ? 'water-outline' : 'albums-outline'} onPress={() => router.push({ pathname:'/features/auxiliary', params:{ kind } })}/></Card>; })}
    {state.modules.journal && <Card><Row title="Bugün nasıl hissediyorsun?" detail="Göz günlüğüne küçük bir not bırak." icon="heart-outline" onPress={() => router.push('/features/journal')}/></Card>}
    <View style={{ flexDirection:'row', alignItems:'center', gap:9, paddingHorizontal:8 }}><Ionicons name="leaf-outline" size={18} color={t.accent}/><Copy size={12} muted style={{ flex:1 }}>Küçük alışkanlıklar, güzel bir günlük rutin.</Copy></View>
    {syncWarning && <Card><Copy size={12}>{syncWarning}</Copy><Button title="Yeniden eşitle" secondary onPress={resync}/></Card>}
    <Sheet visible={!!selected} title={selected?.plan.kind === 'daily' ? 'Lensini attın mı?' : 'Yeni bir başlangıç'} onClose={() => setSelected(null)}>
      <Copy muted>{selected?.plan.kind === 'daily' ? 'Bu kullanım geçmişe kaydedilir. Yeni bir lens açılana kadar günlük takip başlamaz.' : 'Yeni lenslerini kullanmaya başladığın tarihi kaydedelim.'}</Copy>
      <Field label="Gerçek değişim tarihi · YYYY-AA-GG" value={date} onChange={setDate}/>
      {state.modules.stock && state.stock.autoDeduct && selected?.plan.kind !== 'daily' && <Copy size={12} muted>Stoktan {selected?.profileId === 'both' ? '2 lens (1 çift)' : '1 lens'} düşülecek.</Copy>}
      <Button title="Evet, kaydet" onPress={replace}/>
    </Sheet>
    <Sheet visible={!!success} title={success?.daily ? 'Kullanımın kaydedildi.' : 'Harika! Yeni döngü başladı.'} onClose={() => setSuccess(null)}>
      <View style={{ alignItems:'center' }}><Mascot size={150} celebrating/><Copy size={24}>✦  ✧  ✦</Copy></View>
      <Copy style={{ textAlign:'center' }}>{success?.due ? `Bir sonraki değişim: ${formatDate(success.due)}` : 'Yeni bir lens açtığında kaydetmeyi unutma.'}</Copy>
      <Button title="Tamamdır" onPress={() => setSuccess(null)}/><Button title="Yanlışlıkla yaptım · geri al" secondary onPress={async () => { if (success) await dispatch({ type:'undo', expectedRevision:success.revision, previous:success.previous }); setSuccess(null); }}/>
    </Sheet>
  </Screen>;
}

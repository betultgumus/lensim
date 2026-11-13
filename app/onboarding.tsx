import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Button, Card, Copy, Screen, useColors } from '../src/components/ui';
import { Mascot } from '../src/components/Mascot';
import { PlanForm, type PlanDraft } from '../src/components/PlanForm';
import { useApp, uid } from '../src/state/AppContext';
import { dateOnly, getNextReplacementDate, parseDate } from '../src/domain/dates';
import { requestNotifications } from '../src/services/notifications';

export default function Onboarding() {
  const { state, dispatch, syncWarning, resync } = useApp(); const t = useColors(); const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<PlanDraft>({ plan:{ kind:'monthly', unit:'months', interval:1 }, start:dateOnly(), due:dateOnly(), manual:false, brand:'', power:'' });
  if (state.onboarded) return <Redirect href="/(tabs)"/>;
  const complete = async (notify: boolean) => {
    let granted = false;
    if (notify) { granted = await requestNotifications(); if (!granted) Alert.alert('Sorun değil', 'Bildirim izni olmadan da lenslerini takip edebilirsin. Daha sonra Ayarlar’dan açabilirsin.'); }
    await dispatch({ type:'settings', patch:{ notifications:granted } });
    await dispatch({ type:'setup', plan:draft.plan, start:draft.start, due:draft.manual ? draft.due : undefined, id:uid() });
    router.replace('/(tabs)');
  };
  return <Screen>
    {syncWarning && <Card><Copy size={12}>{syncWarning}</Copy><Button title="Yeniden eşitle" secondary onPress={resync}/></Card>}
    <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}><Copy bold style={{ color:t.accent }}>◉  Lens Takip</Copy><Copy size={12} muted>{step + 1} / 3</Copy></View>
    <View style={{ flexDirection:'row', gap:6 }}>{[0,1,2].map(i => <View key={i} style={{ height:4, borderRadius:4, flex:1, backgroundColor:i <= step ? t.accent : t.border }}/>)}</View>
    {step === 0 ? <>
      <View style={{ alignItems:'center', paddingVertical:34 }}><View style={{ width:260, height:260, borderRadius:130, backgroundColor:t.soft, alignItems:'center', justifyContent:'center' }}><Mascot size={235}/></View></View>
      <Copy size={38} bold style={{ textAlign:'center', lineHeight:45 }}>Küçük bir hatırlatma.{ '\n' }Kendine güzel bir özen.</Copy>
      <Copy muted style={{ textAlign:'center', paddingHorizontal:16 }}>Lenslerini unutma, gözlerini sev. Değişim tarihin, sevimli bir dostunla hep yanında.</Copy>
      <View style={{ flex:1 }}/><Button title="Hadi başlayalım" icon="arrow-forward" onPress={() => setStep(1)}/><Copy size={12} muted style={{ textAlign:'center' }}>Hesap yok. İnternet gerekmez. Sadece sen.</Copy>
    </> : step === 1 ? <>
      <Copy size={30} bold>Lensini tanıyalım.</Copy><Copy muted>İki küçük bilgiyle takibe hazırız.</Copy>
      <PlanForm value={draft} onChange={setDraft}/>
      <Button title="Devam et" onPress={() => { const due = draft.manual && draft.plan.kind !== 'daily' ? draft.due : getNextReplacementDate(draft.start, draft.plan); parseDate(due); if (due < draft.start) throw new Error('Değişim tarihi başlangıçtan önce olamaz.'); setStep(2); }}/>
      <Button title="Geri" secondary onPress={() => setStep(0)}/>
    </> : <>
      <View style={{ alignItems:'center', paddingTop:24 }}><Mascot size={180}/></View><Copy size={32} bold>Birlikte hatırlayalım mı?</Copy><Copy muted>3 gün kala, 1 gün kala ve değişim gününde saat 09.00’da nazik bir hatırlatma.</Copy>
      <Card><Copy bold>Kontrol her zaman sende.</Copy><Copy muted>İstediğin zaman saatini değiştirebilir veya bildirimleri kapatabilirsin. Sayacın ve widget’ın her durumda çalışır.</Copy></Card>
      <Button title="Bana hatırlat" icon="notifications-outline" onPress={() => complete(true)}/><Button title="Şimdilik geç" secondary onPress={() => complete(false)}/><Button title="Geri" secondary onPress={() => setStep(1)}/>
    </>}
  </Screen>;
}

import React from 'react';
import { router } from 'expo-router';
import { Card, Copy, Row, Screen } from '../../src/components/ui';
export default function Settings() {
  return <Screen title="Ayarlar" subtitle="Küçük dokunuşlar, tamamen senin.">
    <Card><Row title="Görünüm ve maskot" detail="Renkler, tema ve sevimli dostun" icon="color-palette-outline" onPress={()=>router.push('/settings/appearance')}/><Row title="Hatırlatıcılar" detail="İzinler, saat ve günler" icon="notifications-outline" onPress={()=>router.push('/settings/notifications')}/><Row title="Ana ekran widget’ı" detail="Stil, önizleme ve ekleme rehberi" icon="phone-portrait-outline" onPress={()=>router.push('/settings/widgets')}/></Card>
    <Card><Row title="Özelliklerimi yönet" icon="grid-outline" onPress={()=>router.push('/(tabs)/features')}/><Row title="Gizlilik ve veriler" icon="shield-checkmark-outline" onPress={()=>router.push('/settings/privacy')}/></Card>
    <Copy muted size={12} style={{ textAlign:'center' }}>Lens Takip · 1.0.0{ '\n' }Lenslerini unutma, gözlerini sev. 💜</Copy>
    <Copy muted size={12}>Bu uygulama bir hatırlatıcıdır. Lens kullanım süresini ürün talimatına ve göz uzmanının önerisine göre belirle.</Copy>
  </Screen>;
}

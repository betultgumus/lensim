import React from 'react';
import { Linking, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Copy, Screen, useColors } from '../src/components/ui';
import { MEDICAL_DISCLAIMER } from '../src/domain/legal';
import release from '../release.config.json';

export default function About() {
  const t = useColors(); const version = Constants.expoConfig?.version ?? '—';
  return <Screen title="Hakkında" back>
    <Card style={{ gap: 6 }}>
      <Copy bold>Lensim hakkında</Copy>
      <Copy size={15}>Lensim, kontakt lens kullanımını kaydetmen, değişim zamanını görmen ve kendi hatırlatmalarını kurman için bir kişisel takip uygulamasıdır.</Copy>
    </Card>
    <View accessibilityRole="summary" style={{ padding: 16, borderRadius: 14, borderLeftWidth: 4, borderLeftColor: t.accent, backgroundColor: t.soft, gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Ionicons name="medical-outline" size={20} color={t.accent}/><Copy bold>Tıbbi cihaz değildir</Copy></View>
      <Copy size={15}>{MEDICAL_DISCLAIMER}</Copy>
    </View>
    <Card style={{ gap: 6 }}>
      <Copy bold>Göz hekimine danış</Copy>
      <Copy size={15}>Lens kullanım süresi kutu talimatına ve göz hekiminin önerisine göre belirlenir; Lensim’in sayaçları ve hatırlatmaları bunun yerine geçmez. Kızarıklık, ağrı, bulanık görme veya ışığa hassasiyet olursa lensi çıkar ve göz hekimine başvur.</Copy>
      <Button title="Yardım ve lens güvenliği" secondary icon="help-circle-outline" onPress={() => router.push('/help')}/>
    </Card>
    <Card style={{ gap: 6 }}>
      <Copy bold>Sürüm</Copy>
      <Copy size={15} mono>{version}</Copy>
      {!!release.publisherName && <Copy size={15}>Yayıncı: {release.publisherName}</Copy>}
    </Card>
    <Card style={{ gap: 8 }}>
      <Copy bold>İletişim ve destek</Copy>
      {release.supportEmail ? <Button title={release.supportEmail} secondary icon="mail-outline" onPress={() => Linking.openURL(`mailto:${release.supportEmail}`)}/> : <Copy size={14} muted>Destek adresi henüz eklenmedi.</Copy>}
      {!!release.supportUrl && <Button title="Destek sayfası" secondary icon="open-outline" onPress={() => Linking.openURL(release.supportUrl)}/>}
    </Card>
  </Screen>;
}

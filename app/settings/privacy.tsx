import React from 'react';
import { Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Copy, Screen } from '../../src/components/ui';
import { useApp, errorText } from '../../src/state/AppContext';
import { privacySections } from '../../src/domain/privacy';
import release from '../../release.config.json';
export default function Privacy() {
  const { dispatch }=useApp();
  return <Screen title="Sadece sana ait." subtitle="Gizlilik, en başından." back>
    <Copy bold>Lens Takip Gizlilik Politikası</Copy><Copy muted size={12}>Son güncelleme: 13 Kasım 2026</Copy>
    {privacySections.map(section=><Card key={section.title}><Copy bold>{section.title}</Copy><Copy muted>{section.body}</Copy></Card>)}
    {!!release.publisherName && <Copy>Yayıncı: {release.publisherName}</Copy>}
    {!!release.supportEmail && <Button title="Gizlilik / destek için iletişim" secondary onPress={()=>Linking.openURL(`mailto:${release.supportEmail}`)}/>}
    {!!release.privacyUrl && <Button title="Gizlilik politikasını web’de aç" secondary onPress={()=>Linking.openURL(release.privacyUrl)}/>}
    <Copy muted size={12}>Bir özelliği kapatmak verilerini silmez. Aşağıdaki işlem bütün lens, stok, solüsyon, lens kabı ve günlük kayıtlarını kalıcı olarak siler; bildirimleri iptal eder ve widget’ı sıfırlar.</Copy>
    <Button title="Tüm verilerimi sil" danger secondary onPress={()=>Alert.alert('Bütün kayıtların silinsin mi?','Bu işlem geri alınamaz. Uygulama ilk kuruluma döner.',[{ text:'Vazgeç',style:'cancel' },{ text:'Evet, tümünü sil',style:'destructive',onPress:()=>dispatch({ type:'reset' }).then(()=>router.replace('/onboarding')).catch(e=>Alert.alert('Silinemedi',errorText(e))) }])}/>
  </Screen>;
}

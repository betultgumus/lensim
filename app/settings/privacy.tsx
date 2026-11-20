import React, { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Copy, Row, Screen, SegmentedControl, useColors } from '../../src/components/ui';
import { useApp } from '../../src/state/AppContext';
import { useAuth } from '../../src/state/AuthContext';
import { CloudBackupCard } from '../../src/components/CloudBackupCard';

/**
 * Ayarlar → Gizlilik ve veriler. Everything about data in one screen: where records are ("Verilerim"), cloud
 * backup on/off, the policy and KVKK texts (readable without an account), and the delete actions.
 */
export default function Privacy() {
  const { dispatch, state } = useApp(); const auth = useAuth(); const t = useColors();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const place = Platform.OS === 'web' ? 'bu tarayıcıda' : 'bu telefonda';
  const wipe = () => Alert.alert('Cihazındaki bütün Lensim kayıtları silinsin mi?',
    `${place[0]!.toUpperCase()}${place.slice(1)} kayıtlı bütün lens, kutu, takvim, numara ve günlük kayıtları kalıcı olarak silinir, hatırlatıcılar iptal edilir${auth.session ? ' ve bu cihazdaki oturumun kapatılır. Hesabın ve buluttaki kopyan silinmez; onlar için Hesap yönetimi → Hesabımı sil' : ''}. Geri alınamaz.`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Evet, tümünü sil', style: 'destructive', onPress: () => { void auth.wipeDevice().then(() => router.replace('/onboarding')).catch(() => setResult({ ok: false, text: 'Kayıtlar silinemedi; hiçbir şey silinmiş sayılmadı. Uygulamayı kapatıp açarak yeniden dene.' })); } },
  ]);
  const records = state.packages.length + state.dailyStatuses.length + state.prescriptionHistory.length + state.journal.length;
  return <Screen title="Gizlilik ve veriler" subtitle="Kayıtların nerede, kimler görüyor, nasıl silinir." back>
    <Copy bold size={18}>Verilerim</Copy>
    <Card style={{ gap: 6 }}>
      <Copy bold>Kayıtların {place}</Copy>
      <Copy size={14} muted>{state.packages.length} paket, {state.dailyStatuses.length} günlük kayıt, {state.prescriptionHistory.length} numara kaydı{state.journal.length ? `, ${state.journal.length} günlük notu` : ''}. {Platform.OS === 'web' ? 'Tarayıcının bu siteye ayrılan deposunda saklanır.' : 'Uygulamanın cihazdaki özel alanında saklanır; Android uygulama yedeklemesi kapalıdır.'}</Copy>
      <Copy size={14} muted>Hesap: {auth.session ? auth.session.user.email ?? 'bağlı' : 'yok (misafir)'}</Copy>
    </Card>
    <CloudBackupCard/>
    <Card style={{ paddingVertical: 4 }}>
      <Row title="Gizlilik politikası" detail="Hesap gerekmeden okunur" icon="document-text-outline" onPress={() => router.push('/settings/policy')}/>
      <Row title="KVKK aydınlatma metni" detail="Hangi veri, hangi amaçla, nerede" icon="information-circle-outline" onPress={() => router.push('/settings/kvkk')}/>
      {!!auth.session && <Row title="Hesap yönetimi" detail="Oturumu kapat · Hesabımı sil" icon="person-circle-outline" onPress={() => router.push('/account')}/>}
    </Card>
    <Copy bold size={18}>Veri işleme tercihleri</Copy>
    <Card style={{ gap: 8 }}>
      <Copy size={14} muted>Lensim’in çalışması için gereken işlemler (cihazda kayıt tutma, yerel hatırlatmalar) bir tercihe bağlı değildir. Reklam kişiselleştirme ve analiz yoktur; bu yüzden onlar için bir izin istenmez. İsteğe bağlı tek veri işlemi bulut yedeğidir ve yukarıdan açılıp kapatılır.</Copy>
      <Copy bold size={15}>Araştırma için anonim kullanım</Copy>
      <Copy muted size={13}>Bu tercih yalnızca bu cihazda saklanır. Lensim şu an araştırma için hiçbir veri toplamıyor veya paylaşmıyor; böyle bir özellik açılmadan önce ayrıca bilgilendirme ve onay sunulur.</Copy>
      <SegmentedControl label="Araştırma verisi tercihi" selected={state.settings.researchSharing} onChange={value => dispatch({ type: 'settings', patch: { researchSharing: value as 'undecided' | 'yes' | 'no' } })} options={[{ value: 'undecided', title: 'Sonra karar ver' }, { value: 'no', title: 'Paylaşma' }, { value: 'yes', title: 'İlgileniyorum' }]}/>
    </Card>
    <Copy bold size={18}>Cihazımdaki tüm verileri sil</Copy>
    <View style={{ gap: 8 }}>
      <Copy muted size={14}>{place[0]!.toUpperCase()}{place.slice(1)} kayıtlı {records ? 'bütün ' : ''}Lensim kayıtlarını kalıcı olarak siler ve hatırlatıcıları iptal eder. Geri alınamaz; önce Ayarlar → Veri yedeği’nden dosya yedeği almak isteyebilirsin.{auth.session ? ' Hesabın ve buluttaki kopyan bu işlemle silinmez.' : ''}</Copy>
      <Button title="Cihazımdaki tüm verileri sil" danger secondary icon="trash-outline" onPress={wipe}/>
      {result && <Copy size={14} style={{ color: result.ok ? t.text : t.danger }}>{result.text}</Copy>}
    </View>
  </Screen>;
}

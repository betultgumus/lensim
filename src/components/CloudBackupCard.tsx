import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, Card, Copy, Sheet, useColors } from './ui';
import { useAuth } from '../state/AuthContext';
import { CLOUD_DATA_LIST } from '../domain/cloudConsent';
import release from '../../release.config.json';

/** Unticked by default; only the person can tick it. */
export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const t = useColors();
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} aria-checked={checked} accessibilityLabel={label} onPress={() => onChange(!checked)} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', minHeight: 44, paddingVertical: 4 }}>
    <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={24} color={checked ? t.accent : t.muted}/>
    <Copy size={14} style={{ flex: 1 }}>{label}</Copy>
  </Pressable>;
}

/** What is sent, where, and how to stop it — shown BEFORE anything is uploaded. */
function EnableSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const auth = useAuth(); const [agreed, setAgreed] = useState(false);
  const close = () => { setAgreed(false); onClose(); };
  return <Sheet visible={visible} title="Bulut yedeğini aç" onClose={close}>
    <Copy size={14}>Açarsan bu telefondaki şu Lensim kayıtların hesabına bağlı bulut veritabanına kopyalanır ve sonraki değişikliklerin otomatik eşitlenir:</Copy>
    {CLOUD_DATA_LIST.map(item => <Copy key={item} size={14}>• {item}</Copy>)}
    <Copy size={13} muted>Lens kullanım geçmişin ve göz numaraların sağlıkla ilişkili bilgi sayılabilir. Hizmet sağlayıcı: Supabase{release.cloudRegion ? ` · sunucu bölgesi: ${release.cloudRegion}` : ''}. Lensim bu verileri reklam veya analiz için kullanmaz, kimseye satmaz.</Copy>
    <Copy size={13} muted>Bulut yedeğini istediğin zaman kapatabilir, buluttaki kopyayı silebilirsin. Kapatman uygulamanın diğer özelliklerini etkilemez.</Copy>
    <Pressable accessibilityRole="link" onPress={() => { close(); router.push('/settings/kvkk'); }} style={{ minHeight: 40, justifyContent: 'center' }}><Copy size={14} bold style={{ textDecorationLine: 'underline' }}>KVKK aydınlatma metnini oku</Copy></Pressable>
    <Checkbox checked={agreed} onChange={setAgreed} label="Yukarıda listelenen Lensim kayıtlarımın bulut yedeği için hesabıma aktarılmasını onaylıyorum."/>
    <Button title="Onayla ve bulut yedeğini aç" icon="cloud-upload-outline" disabled={!agreed} onPress={async () => { await auth.enableCloudBackup(); close(); }}/>
    <Button title="Vazgeç" secondary onPress={close}/>
  </Sheet>;
}

/** Cloud backup status and on/off for a signed-in account. Guests see a short pointer to the account screen. */
export function CloudBackupCard() {
  const auth = useAuth(); const t = useColors(); const [enabling, setEnabling] = useState(false); const [note, setNote] = useState<string | null>(null);
  if (!auth.session) return <Card style={{ gap: 6 }}>
    <Copy bold>Bulut yedeği: kapalı</Copy>
    <Copy size={14} muted>Misafir olarak kullanıyorsun; hiçbir kaydın sunucuya gönderilmiyor. Bulut yedeği için önce isteğe bağlı bir hesap açman, ardından ayrıca onay vermen gerekir.</Copy>
    <Button title="Hesap yönetimi" secondary onPress={() => router.push('/account')}/>
  </Card>;
  const off = () => Alert.alert('Bulut yedeği kapatılsın mı?', 'Yeni kayıtların artık buluta gönderilmez. Bu telefondaki kayıtların silinmez.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Kapat, buluttaki kopya kalsın', onPress: () => { void auth.disableCloudBackup(false).then(() => setNote('Bulut yedeği kapatıldı. Buluttaki son kopya duruyor; istersen aşağıdan silebilirsin.')).catch(() => setNote('Bulut yedeği kapatılamadı. Yeniden dene.')); } },
    { text: 'Kapat ve buluttaki kopyayı sil', style: 'destructive', onPress: () => { void auth.disableCloudBackup(true).then(() => setNote('Bulut yedeği kapatıldı ve buluttaki kopyan silindi.')).catch(() => setNote('Bulut yedeği kapatıldı ama buluttaki kopya silinemedi. İnternet bağlantını kontrol edip “Buluttaki kopyayı sil” ile yeniden dene.')); } },
  ]);
  const deleteCopy = () => Alert.alert('Buluttaki kopya silinsin mi?', 'Hesabındaki bulut yedeği ve önceki arşiv kopyaları kalıcı olarak silinir. Bu telefondaki kayıtlar ve hesabın kalır.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Buluttaki kopyayı sil', style: 'destructive', onPress: () => { void auth.disableCloudBackup(true).then(() => setNote('Buluttaki kopyan silindi.')).catch(() => setNote('Buluttaki kopya silinemedi. Hiçbir şey silinmiş sayılmadı; bağlantını kontrol edip yeniden dene.')); } },
  ]);
  return <Card style={{ gap: 8 }}>
    <Copy bold>Bulut yedeği: {auth.cloudBackup === null ? 'kontrol ediliyor…' : auth.cloudBackup ? 'açık' : 'kapalı'}</Copy>
    {auth.cloudBackup ? <>
      <Copy size={14} muted>Kayıtların hesabınla ({auth.session.user.email ?? 'hesabın'}) eşitleniyor. Yeni bir cihazda aynı hesaba girip bulut yedeğini açtığında geri gelir.</Copy>
      {auth.syncing && <Copy size={14}>Kayıtlar eşitleniyor…</Copy>}
      {auth.lastSyncedAt && <Copy muted size={13}>Son eşitleme: {new Date(auth.lastSyncedAt).toLocaleString('tr-TR')}</Copy>}
      {auth.syncError && <Copy size={14} style={{ color: t.danger }}>{auth.syncError}</Copy>}
      <Button title={auth.syncing ? 'Eşitleniyor…' : 'Şimdi eşitle'} icon="sync-outline" secondary outlined disabled={auth.syncing} onPress={auth.syncNow}/>
      <Button title="Bulut yedeğini kapat" secondary onPress={off}/>
    </> : <>
      <Copy size={14} muted>Hesabın açık ama kayıtların buluta gönderilmiyor; yalnızca bu telefonda duruyor. Açarsan neyin gönderileceğini önce gösteririz.</Copy>
      <Button title="Bulut yedeğini aç" icon="cloud-upload-outline" secondary outlined disabled={auth.cloudBackup === null} onPress={() => setEnabling(true)}/>
      <Button title="Buluttaki kopyayı sil" danger secondary onPress={deleteCopy}/>
    </>}
    {note && <Copy size={14} bold>{note}</Copy>}
    <EnableSheet visible={enabling} onClose={() => setEnabling(false)}/>
  </Card>;
}

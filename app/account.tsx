import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Copy, Field, Screen, SegmentedControl, Sheet, useColors } from '../src/components/ui';
import { useAuth } from '../src/state/AuthContext';
import { Checkbox, CloudBackupCard } from '../src/components/CloudBackupCard';

type Mode = 'signin' | 'signup' | 'reset' | 'setpassword';
function authMessage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('invalid login credentials')) return 'E-posta veya parola doğru değil.';
  if (message.includes('already registered') || message.includes('user already registered')) return 'Bu e-posta ile hesap zaten var. Giriş yapmayı dene.';
  if (message.includes('password') && (message.includes('least') || message.includes('weak'))) return 'Daha güçlü bir parola seç; en az 8 karakter kullan.';
  if (message.includes('email not confirmed')) return 'Önce e-posta adresine gönderdiğimiz doğrulama bağlantısını aç.';
  return 'İşlem tamamlanamadı. Bağlantını ve girdiğin bilgileri kontrol edip tekrar dene.';
}
const providerName = (provider: unknown) => provider === 'google' ? 'Google' : provider === 'email' ? 'E-posta ve parola' : 'Diğer';

/** Hesabımı sil: what is deleted, a separate confirmation, and a success message only after the server confirmed it. */
function DeleteAccountSheet({ visible, onClose, onDone }: { visible: boolean; onClose: () => void; onDone: (message: string) => void }) {
  const auth = useAuth(); const t = useColors();
  const [keep, setKeep] = useState<'keep' | 'delete'>('keep'); const [sure, setSure] = useState(false); const [error, setError] = useState<string | null>(null);
  const close = () => { setSure(false); setError(null); onClose(); };
  const run = async () => {
    setError(null);
    try {
      await auth.deleteAccount(keep === 'keep');
      setSure(false); onClose();
      onDone(keep === 'keep' ? 'Hesabın ve buluttaki bütün Lensim verilerin silindi. Bu telefondaki kayıtların misafir kaydı olarak duruyor.' : 'Hesabın, buluttaki bütün Lensim verilerin ve bu telefondaki kayıtların silindi.');
      if (keep === 'delete') router.replace('/onboarding');
    } catch {
      setError('Hesap silinemedi; hiçbir şey silinmiş sayılmadı. İnternet bağlantını kontrol edip yeniden dene. Sorun sürerse destek adresine yaz.');
    }
  };
  return <Sheet visible={visible} title="Hesabımı sil" onClose={close}>
    <Copy size={14}>Bu işlem geri alınamaz. Silinecekler:</Copy>
    <Copy size={14}>• Lensim hesabın (e-posta adresin ve giriş bilgilerin, Google bağlantın)</Copy>
    <Copy size={14}>• Buluttaki lens kullanım geçmişin, göz numaraların ve diğer yedek kayıtların</Copy>
    <Copy size={14}>• Önceki eşitlemelerden kalan arşiv kopyaları ve oturum kayıtları</Copy>
    <Copy size={13} muted>Bu telefondaki kayıtlar için seç:</Copy>
    <SegmentedControl label="Bu telefondaki kayıtlar" selected={keep} onChange={v => setKeep(v as 'keep' | 'delete')} options={[{ value: 'keep', title: 'Telefonda kalsın' }, { value: 'delete', title: 'Telefondan da sil' }]}/>
    <Checkbox checked={sure} onChange={setSure} label="Hesabımın ve buluttaki verilerimin kalıcı olarak silineceğini anladım."/>
    {error && <Copy size={14} style={{ color: t.danger }}>{error}</Copy>}
    <Button title="Hesabımı kalıcı olarak sil" danger disabled={!sure} onPress={run}/>
    <Button title="Vazgeç" secondary onPress={close}/>
  </Sheet>;
}

export default function Account() {
  const auth = useAuth(); const t = useColors(); const params = useLocalSearchParams<{ recovery?: string }>();
  const [mode, setMode] = useState<Mode>('signin'); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => { if (params.recovery === '1') { setMode('setpassword'); setMessage('Yeni parolanı belirle.'); } }, [params.recovery]);
  const run = async (action: () => Promise<void>) => { setBusy(true); setError(null); setMessage(null); try { await action(); } catch (e) { setError(authMessage(e)); } finally { setBusy(false); } };
  const submit = () => run(async () => {
    if (!email.trim() || (mode !== 'reset' && password.length < 8)) { setError(mode === 'reset' ? 'E-posta adresini yaz.' : 'E-posta adresini ve en az 8 karakterli parolanı gir.'); return; }
    if (mode === 'signin') { await auth.signIn(email, password); setMessage('Giriş yapıldı. Bulut yedeği sen açmadıkça kapalı kalır.'); }
    else if (mode === 'signup') { const hasSession = await auth.signUp(email, password); setMessage(hasSession ? 'Hesabın oluşturuldu. Kayıtların henüz buluta gönderilmedi; istersen aşağıdan bulut yedeğini açabilirsin.' : 'Hesabını doğrulamak için e-posta kutuna gönderdiğimiz bağlantıyı aç.'); }
    else { await auth.sendPasswordReset(email); setMessage('Parola yenileme bağlantısı e-posta adresine gönderildi.'); setMode('signin'); }
  });
  const saveNewPassword = () => run(async () => {
    if (password.length < 8) { setError('En az 8 karakterli bir parola seç.'); return; }
    await auth.updatePassword(password); setMode('signin'); setPassword(''); setMessage('Parolan güncellendi.');
  });
  const doSignOut = () => Alert.alert('Oturum kapatılsın mı?', auth.cloudBackup
    ? 'Önce bu telefondaki kayıtlar bulut yedeğine eşitlenir, ardından bu telefondaki Lensim verileri temizlenir. Hesabına tekrar girip bulut yedeğini açtığında geri gelir.'
    : 'Bulut yedeğin kapalı; kayıtların bu telefonda misafir kaydı olarak kalır. Hesabın silinmez.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: auth.cloudBackup ? 'Eşitle ve oturumu kapat' : 'Oturumu kapat', style: 'destructive', onPress: () => { void run(async () => { await auth.signOut(); setMessage('Oturum kapatıldı.'); }); } },
  ]);
  const user = auth.session?.user;
  return <Screen title="Hesap yönetimi" subtitle="Hesap isteğe bağlıdır; misafir olarak kullanmaya devam edebilirsin." back>
    {user ? <>
      <Card style={{ gap: 4 }}>
        <Copy bold>Hesap bilgileri</Copy>
        <Copy size={15}>E-posta: {user.email ?? '—'}</Copy>
        <Copy size={15}>Giriş yöntemi: {providerName(user.app_metadata?.provider)}</Copy>
        {!!user.created_at && <Copy size={15}>Oluşturulma: {new Date(user.created_at).toLocaleDateString('tr-TR')}</Copy>}
      </Card>
      <CloudBackupCard/>
      <Button title="Oturumu kapat" secondary outlined icon="log-out-outline" onPress={doSignOut}/>
      <Card style={{ gap: 8 }}>
        <Copy bold>Hesabımı sil</Copy>
        <Copy size={14} muted>Hesabını ve buluttaki bütün Lensim verilerini kalıcı olarak siler. Uygulama dışından silme talebi için gizlilik politikasındaki iletişim yolunu da kullanabilirsin.</Copy>
        <Button title="Hesabımı sil" danger secondary icon="trash-outline" onPress={() => setDeleting(true)}/>
      </Card>
      <DeleteAccountSheet visible={deleting} onClose={() => setDeleting(false)} onDone={setMessage}/>
    </> : <>
      <Card><Copy bold>Misafir olarak kullan</Copy><Copy>Lens kutularını, günlük takibini ve geçmişini hesap açmadan kullanabilirsin. Misafir kayıtların yalnızca bu telefonda saklanır ve hiçbir sunucuya gönderilmez.</Copy><Copy size={14} muted>Telefon değiştirirsen veya uygulamayı silersen misafir kayıtları kendiliğinden geri gelmez; Ayarlar → Veri yedeği’nden dosya yedeği alabilirsin.</Copy></Card>
      <Card><Copy bold>Hesap açarsan ne değişir?</Copy><Copy size={14}>Hesap, istersen kayıtlarını bulut yedeğinde tutmanı ve yeni bir cihazda geri almanı sağlar. Hesap açmak kayıtlarını kendiliğinden göndermez: bulut yedeği, giriş yaptıktan sonra neyin gönderileceğini görüp ayrıca onay verdiğinde başlar.</Copy><Copy size={13} muted>Hesap için e-posta adresin (Google ile girişte Google’ın paylaştığı ad ve profil bilgileri) hesap hizmeti sağlayıcısında saklanır.</Copy></Card>
      {!auth.configured && <Card><Copy bold>Hesap bağlantısı hazırlanıyor</Copy><Copy muted size={14}>Misafir kullanımı hazır. Hesap açmayı etkinleştirmek için Supabase proje bilgileri ve Google OAuth kurulumu gerekiyor.</Copy></Card>}
      <Button title="Google ile devam et" icon="logo-google" disabled={!auth.configured || busy} onPress={()=>run(auth.signInWithGoogle)}/>
      <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}><View style={{ flex:1, height:1, backgroundColor:t.border }}/><Copy muted size={13}>veya e-posta ile</Copy><View style={{ flex:1, height:1, backgroundColor:t.border }}/></View>
      <View style={{ flexDirection:'row', gap:8 }}>
        <View style={{flex:1}}><Button title="Giriş yap" secondary outlined disabled={mode==='signin'} onPress={()=>{setMode('signin');setMessage(null);setError(null);}}/></View>
        <View style={{flex:1}}><Button title="Hesap oluştur" secondary outlined disabled={mode==='signup'} onPress={()=>{setMode('signup');setMessage(null);setError(null);}}/></View>
      </View>
      <Field label="E-posta" value={email} onChange={setEmail} keyboardType="email-address" autoComplete="email" placeholder="ornek@eposta.com"/>
      {mode !== 'reset' && <Field label={mode==='setpassword'?'Yeni parola':'Parola'} value={password} onChange={setPassword} secureTextEntry autoComplete={mode==='signin'?'current-password':'new-password'} placeholder="En az 8 karakter"/>}
      {mode === 'reset' ? <Button title="Parola yenileme bağlantısı gönder" disabled={!auth.configured || busy} onPress={submit}/> : mode==='setpassword' ? <Button title="Yeni parolayı kaydet" disabled={!auth.configured || busy} onPress={saveNewPassword}/> : <Button title={mode==='signup'?'Hesap oluştur':'E-posta ile giriş yap'} disabled={!auth.configured || busy} onPress={submit}/>}
      {mode==='signin' && <Button title="Parolamı unuttum" secondary onPress={()=>{setMode('reset');setMessage(null);setError(null);}}/>}
      {mode==='signup' && <Copy muted size={13}>Hesap açınca mevcut misafir kayıtların silinmez ve sen bulut yedeğini açmadıkça buluta gönderilmez.</Copy>}
      <Button title="Gizlilik politikası" secondary onPress={() => router.push('/settings/policy')}/>
    </>}
    {error && <Copy style={{ color:t.danger }}>{error}</Copy>}
    {message && <Copy bold>{message}</Copy>}
  </Screen>;
}

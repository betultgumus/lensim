import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Copy, Screen, useColors } from '../src/components/ui';

const reviewed = '19 Kasım 2026';
const sources = [
  { title: 'FDA · Lens solüsyonları ve ürünleri', url: 'https://www.fda.gov/medical-devices/contact-lenses/contact-lens-solutions-and-products' },
  { title: 'CDC · Lensleri suya maruz bırakmama', url: 'https://www.cdc.gov/contact-lenses/about/healthy-habits-keeping-water-away-from-contact-lenses.html' },
  { title: 'CDC · Her saklamada taze solüsyon', url: 'https://www.cdc.gov/contact-lenses/about/about-cleaning-disinfecting-and-storing-contact-lenses.html' },
  { title: 'AAO · Lens bakımı ve uyarı belirtileri', url: 'https://www.aao.org/eye-health/glasses-contacts/contact-lens-care' },
];

function HelpItem({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return <Card style={{ gap: 7, padding: 14, borderRadius: 14 }}><Copy bold size={16}>{title}</Copy><Copy size={14}>{children}</Copy></Card>;
}

export default function HelpScreen() {
  const t = useColors();
  return <Screen title="Yardım ve lens güvenliği" subtitle="Genel bilgilendirme · kişisel tıbbi öneri değildir." back>
    <HelpItem title="Solüsyon yoksa lensi suyla veya tükürükle temizleme ya da saklama.">
      Su steril değildir; tükürük de steril bir lens solüsyonu değildir. Lens bakımında yalnızca lensin ve bakım sisteminin talimatlarında önerilen ürünü kullan. Uygun solüsyonun yoksa lensi yeniden takma veya ev yapımı karışımla saklama; gözlük kullanıp lens uzmanına danış.
    </HelpItem>
    <HelpItem title="Lensleri saklarken solüsyonu her seferinde yenile.">
      Kullanılmış solüsyonu boşalt; üzerine taze solüsyon ekleme veya eski solüsyonu tekrar kullanma. Lensini ve kutusunu, kendi lens bakım ürününün talimatlarına göre temizle ve sakla.
    </HelpItem>
    <HelpItem title="Ağrı veya belirgin rahatsızlık varsa yardım al.">
      Kızarıklık, ağrı, sulanma, ışığa hassasiyet veya görmede değişiklik varsa lensi çıkar ve gecikmeden göz sağlığı uzmanına başvur. Şiddetli ya da hızla kötüleşen belirtilerde bulunduğun yerdeki uygun acil sağlık hizmetini ara. Bu ekran tanı koymaz ve “sorun yok” güvencesi vermez.
    </HelpItem>
    <Card style={{ gap: 8, padding: 14, borderRadius: 14 }}>
      <Copy bold size={15}>Kaynaklar</Copy>
      {sources.map(source => <SourceLink key={source.url} title={source.title} url={source.url}/>)}
      <Copy size={12} muted>Son gözden geçirme: {reviewed}. Ürün ve uzman talimatları önceliklidir.</Copy>
    </Card>
    <Copy size={13} muted>Uygulama içi yardım arama motorlarında herkese açık web içeriği sayılmaz. Web SEO ve mağaza ASO çalışmaları ayrı kapsamdır; arama sırası veya indirme sonucu garanti edilmez.</Copy>
  </Screen>;
}

function SourceLink({ title, url }: { title: string; url: string }) {
  const t = useColors();
  return <Pressable accessibilityRole="link" accessibilityLabel={`${title}, web sayfasını aç`} onPress={() => Linking.openURL(url)} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <Ionicons name="open-outline" size={17} color={t.accent}/><Copy size={14} style={{ flex: 1, color: t.accent, textDecorationLine: 'underline' }}>{title}</Copy>
  </Pressable>;
}

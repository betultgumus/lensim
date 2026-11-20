import React from 'react';
import { Linking } from 'react-native';
import { Button, Card, Copy, Screen } from '../../src/components/ui';
import { privacySections } from '../../src/domain/privacy';
import release from '../../release.config.json';

/** Full privacy policy inside the app: no account or network needed. The web copy opens only if its URL is set. */
export default function Policy() {
  return <Screen title="Gizlilik politikası" subtitle="Son güncelleme: 20 Kasım 2026" back>
    {privacySections.map(section => <Card key={section.title} style={{ gap: 6 }}><Copy bold>{section.title}</Copy><Copy size={15}>{section.body}</Copy></Card>)}
    {!!release.privacyUrl && <Button title="Gizlilik politikasını web’de aç" secondary icon="open-outline" onPress={() => Linking.openURL(release.privacyUrl)}/>}
    {!!release.supportEmail && <Button title="Gizlilik sorusu gönder" secondary icon="mail-outline" onPress={() => Linking.openURL(`mailto:${release.supportEmail}`)}/>}
  </Screen>;
}

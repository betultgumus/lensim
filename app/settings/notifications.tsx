import React from 'react';
import { Button, Card, Copy, Screen } from '../../src/components/ui';
import { ReminderCards, ReminderSummary, useNotificationAccess } from '../../src/components/ReminderSettings';
import { useApp } from '../../src/state/AppContext';
import { openNotificationSettings } from '../../src/services/notifications';

/** Same screen on the phone and in the web preview; only the phone asks for permission and sends notifications. */
export default function NotificationSettings() {
  const { resync } = useApp(); const notifications = useNotificationAccess(); const { access } = notifications;
  return <Screen title="Hatırlatmalar" subtitle="İki hatırlatma birbirinden bağımsızdır; her birinin saati ayrı." back>
    <ReminderSummary notifications={notifications}/>
    {access !== 'unavailable' && <Card style={{ gap: 8 }}>
        <Copy bold size={15}>Telefon bildirim izni</Copy>
        <Copy muted size={14}>{access === null ? 'İzin kontrol ediliyor…' : access === 'granted' ? 'Açık. Açtığın hatırlatmalar yukarıdaki saatlerde gelir.' : 'Kapalı. Hatırlatmalar gelmez; sayaç ve takvim çalışmaya devam eder. Bir hatırlatmayı açtığında izin istenir.'}</Copy>
        {access === 'blocked' && <Button title="Sistem ayarlarını aç" secondary onPress={openNotificationSettings}/>}
      </Card>}
    <ReminderCards/>
    {access !== 'unavailable' && <>
      <Copy muted size={13}>Geçmiş saate bildirim kurulmaz. Telefonun pil ve odak ayarları teslim saatini birkaç dakika geciktirebilir.</Copy>
      <Button title="Hatırlatıcıları yeniden eşitle" secondary onPress={resync}/>
    </>}
  </Screen>;
}

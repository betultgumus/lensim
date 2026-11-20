import React from 'react';
import { Button, Copy, Screen } from '../../src/components/ui';
import { NotificationsPrompt, ReminderCards, ReminderSummary, useNotificationAccess } from '../../src/components/ReminderSettings';
import { useApp } from '../../src/state/AppContext';

/**
 * Same screen on the phone and in the web preview; only the phone asks for permission and sends notifications.
 * A permission card appears only when something stops the reminders (phone permission or exact alarms off).
 */
export default function NotificationSettings() {
  const { resync } = useApp(); const notifications = useNotificationAccess(); const { access } = notifications;
  return <Screen title="Hatırlatmalar" subtitle="İki hatırlatma birbirinden bağımsızdır; her birinin saati ayrı." back>
    <NotificationsPrompt notifications={notifications} permissionOnly/>
    <ReminderSummary notifications={notifications}/>
    <ReminderCards/>
    {access !== 'unavailable' && <>
      <Copy muted size={13}>Geçmiş saate bildirim kurulmaz. Telefonun pil ve odak ayarları teslim saatini birkaç dakika geciktirebilir.</Copy>
      <Button title="Hatırlatıcıları yeniden eşitle" secondary onPress={resync}/>
    </>}
  </Screen>;
}

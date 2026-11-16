import React, { useEffect, useState } from 'react';
import { AppState, Linking, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Button, Card, Chip, Copy, Field, Screen, Toggle, styles } from '../../src/components/ui';
import { useApp } from '../../src/state/AppContext';
import { requestNotifications } from '../../src/services/notifications';
import { timeParts } from '../../src/domain/dates';
export default function NotificationSettings() {
  const { state,dispatch,resync } = useApp(); const [time,setTime] = useState(state.settings.notificationTime); const [allowed,setAllowed] = useState<boolean | null>(null);
  useEffect(()=>{ const update=()=>Notifications.getPermissionsAsync().then(p=>setAllowed(p.granted || p.ios?.status===Notifications.IosAuthorizationStatus.PROVISIONAL)); void update(); const sub=AppState.addEventListener('change',s=>{ if(s==='active')void update(); }); return()=>sub.remove(); },[]);
  return <Screen title="Nazik hatırlatmalar" subtitle="Ne zaman hatırlatalım?" back>
    <Card><Toggle title="Hatırlatıcılar" value={state.settings.notifications} onChange={async enabled=>{ if(enabled) { const ok=await requestNotifications(); setAllowed(ok); if(!ok) return; } await dispatch({ type:'settings',patch:{ notifications:enabled } }); }}/><Copy muted size={14}>{allowed === null ? 'İzin kontrol ediliyor…' : allowed ? 'Sistem bildirim izni açık.' : 'Sistem bildirim izni kapalı. Sayaç ve takvim çalışmaya devam eder.'}</Copy>{allowed === false && <Button title="Sistem ayarlarını aç" secondary onPress={()=>Linking.openSettings()}/>}</Card>
    <Field label="Hatırlatma saati · SS:DD" value={time} onChange={setTime}/><Button title="Saati kaydet" secondary onPress={async()=>{ timeParts(time); await dispatch({ type:'settings',patch:{ notificationTime:time } }); }}/>
    <Copy bold>Hangi günlerde?</Copy><View style={styles.wrap}>{[3,1,0].map(offset=><Chip key={offset} title={offset===0 ? 'Değişim günü' : `${offset} gün kala`} selected={state.settings.offsets.includes(offset)} onPress={()=>dispatch({ type:'settings',patch:{ offsets:state.settings.offsets.includes(offset) ? state.settings.offsets.filter(n=>n!==offset) : [...state.settings.offsets,offset] } })}/>)}</View>
    <Copy muted size={14}>Günlük tek kullanımlık lensler yalnızca kullanım gününde hatırlatılır. Geçmiş saate bildirim kurulmaz. Cihazın pil ve odak ayarları teslim saatini etkileyebilir.</Copy>
    <Button title="Hatırlatıcıları yeniden eşitle" secondary onPress={resync}/>
  </Screen>;
}

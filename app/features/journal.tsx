import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Card, Chip, Copy, Field, PagedList, Screen, styles } from '../../src/components/ui';
import { useApp, uid, errorText } from '../../src/state/AppContext';
import { dateOnly, formatDate } from '../../src/domain/dates';
import {DateField} from '../../src/components/DateField';
export default function Journal() {
  const { state,dispatch }=useApp(); const [date,setDate]=useState(dateOnly); const [note,setNote]=useState(''); const [comfort,setComfort]=useState(3); const [symptoms,setSymptoms]=useState<string[]>([]);
  if(!state.modules.journal)return <Screen title="Göz günlüğü kapalı" back><Copy>Özellikler ekranından açabilirsin. Önceki notların korunuyor.</Copy></Screen>;
  return <Screen title="Bugün nasılsın?" subtitle="Sadece sana ait, küçük bir günlük." back>
    <DateField label="Tarih" value={date} onChange={setDate}/><Copy bold>Konforunu nasıl tarif edersin?</Copy><Copy size={12} muted>1: Rahatsız hissediyorum · 5: Rahat hissediyorum. Bu bir sağlık puanı değildir.</Copy><View style={styles.wrap}>{[1,2,3,4,5].map(n=><Chip key={n} title={String(n)} selected={comfort===n} onPress={()=>setComfort(n)}/>)}</View>
    <Copy bold>Eklemek istediğin bir his var mı?</Copy><View style={styles.wrap}>{['Kuruluk','Kızarıklık','Ağrı','Görme değişikliği'].map(s=><Chip key={s} title={s} selected={symptoms.includes(s)} onPress={()=>setSymptoms(symptoms.includes(s) ? symptoms.filter(x=>x!==s) : [...symptoms,s])}/>)}</View>
    {symptoms.some(s=>['Ağrı','Kızarıklık','Görme değişikliği'].includes(s)) && <Card><Copy>Lensi çıkarıp göz sağlığı uzmanına başvur. Uygulama belirtileri değerlendiremez veya tanı koyamaz.</Copy></Card>}
    <Field label="Kendine bir not (isteğe bağlı)" value={note} onChange={setNote} multiline/>
    <Button title="Günlüğüme kaydet" onPress={async()=>{ await dispatch({ type:'journal',entry:{ id:uid(),date,comfort,symptoms,note } }); setNote(''); setSymptoms([]); }}/>
    <Copy size={12} muted>Notların cihazında tutulur. İstediğin kaydı tek tek silebilirsin.</Copy><Copy size={20} bold>Önceki notların</Copy>
    {!state.journal.length ? <Copy muted>Henüz not yok. Yazmak istersen buradayız.</Copy> : <PagedList items={[...state.journal].reverse()} renderItem={e=><Card style={{ marginBottom:12 }}><Copy bold>{formatDate(e.date)}</Copy><Copy size={13}>Konfor: {e.comfort}/5{e.symptoms.length ? ` · ${e.symptoms.join(', ')}` : ''}</Copy>{!!e.note && <Copy>{e.note}</Copy>}<Button title="Bu notu sil" secondary danger onPress={()=>Alert.alert('Not silinsin mi?','Bu işlem geri alınamaz.',[{ text:'Vazgeç',style:'cancel' },{ text:'Sil',style:'destructive',onPress:()=>dispatch({ type:'deleteJournal',id:e.id }).catch(err=>Alert.alert('Silinemedi',errorText(err))) }])}/></Card>}/>}
  </Screen>;
}

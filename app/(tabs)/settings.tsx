import React from 'react';
import { View } from 'react-native';
import {router} from 'expo-router';
import {Card,Chip,Copy,Row,Screen,SegmentedControl} from '../../src/components/ui';
import {useApp} from '../../src/state/AppContext';
export default function Settings(){const {state,dispatch}=useApp();return <Screen title="Ayarlar" subtitle="Takip şeklini ve yedeklerini yönet.">
 <Card><Copy bold>Bir günü cevapsız bırakırsan</Copy><Copy muted size={14}>Ertesi gün 02.00’de seçiminle otomatik tamamlanır.</Copy><SegmentedControl label="Cevapsız gün varsayılanı" selected={state.settings.defaultAnswer} onChange={value=>dispatch({type:'settings',patch:{defaultAnswer:value as 'worn'|'notWorn'}})} options={[{value:'worn',title:'Taktım say'},{value:'notWorn',title:'Takmadım say',selectedColor:'#D9ECFF',selectedTextColor:'#10265A'}]}/></Card>
 <Card><Copy bold>Takvim görünümü</Copy><Copy size={14} muted>İstersen sağ ve sol paketlerin açılış günlerini takvimde ayrı işaretlerle gör.</Copy><SegmentedControl label="Göz takvimi görünümü" selected={state.settings.separateEyeCalendars?'separate':'combined'} onChange={value=>dispatch({type:'settings',patch:{separateEyeCalendars:value==='separate'}})} options={[{value:'combined',title:'Birleşik'},{value:'separate',title:'Sağ · Sol ayrı'}]}/></Card>
 <Card style={{borderRadius:6}}><Row title="Göz numaralarım" detail="Lens ve gözlük reçeteleri, tarihçesiyle" icon="glasses-outline" onPress={()=>router.push('/prescriptions')}/><Row title="Lens kutularım" detail="Lens adedini, kutu adını ve süreyi düzenle" icon="albums-outline" onPress={()=>router.push('/settings/boxes')}/><Row title="Veri yedeği" detail="Dosyaya aktar ve geri yükle" icon="cloud-download-outline" onPress={()=>router.push('/settings/backup')}/><Row title="Hatırlatmalar" detail="Günlük onay saati ve paket uyarıları" icon="notifications-outline" onPress={()=>router.push('/settings/notifications')}/><Row title="Görünüm" detail="Açık, koyu veya sistem teması" icon="color-palette-outline" onPress={()=>router.push('/settings/appearance')}/></Card>
 <Copy size={12} muted>Lensim · Çevrimdışı kullanım desteklenir. Lens süresini kutu talimatına ve göz uzmanının önerisine göre belirle.</Copy>
 <Row title="Gizlilik ve veriler" detail="Veri kullanımı ve kayıtları silme" icon="shield-checkmark-outline" onPress={()=>router.push('/settings/privacy')}/>
 </Screen>}

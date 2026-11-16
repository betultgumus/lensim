import React,{useState} from 'react';
import {View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Button,Chip,Copy,Screen,styles} from '../../src/components/ui';
import {DateField} from '../../src/components/DateField';
import {useApp} from '../../src/state/AppContext';
const options=[[1,'Günlük'],[14,'14 günlük'],[15,'15 günlük'],[30,'Aylık · 30 gün'],[90,'3 aylık']] as const;
export default function EditPackage(){const {id}=useLocalSearchParams<{id:string}>();const {state,dispatch,today}=useApp();const pack=state.packages.find(p=>p.id===id);const box=state.boxes.find(b=>b.id===pack?.boxId);const [date,setDate]=useState(pack?.openedOn??today);const initial=pack?.durationDaysSnapshot??box?.durationDays??30;const [duration,setDuration]=useState(initial);if(!pack||!box)return <Screen title="Paket bulunamadı" back/>;
 return <Screen title="Paketi düzenle" subtitle="Paketin kutu ve açılış bilgileri" back><Copy muted>Günlük lens ile yedekli lens arasındaki tür değişimi, yedek sayımını etkilediği için paketi açtıktan sonra değiştirilemez. Kutudaki gerçek lens adedini ayrıca kutu düzenleme ekranından güncelleyebilirsin.</Copy><DateField label="Lens kutusunu açtığın tarih" value={date} onChange={setDate}/><Copy bold>Lens kullanım süresi</Copy><ViewWrap>{options.filter(([n])=>(initial===1)===(n===1)).map(([n,label])=><Chip key={n} title={label} selected={duration===n} onPress={()=>setDuration(n)}/>)}</ViewWrap><Button title="Paket değişikliklerini kaydet" icon="save-outline" onPress={async()=>{await dispatch({type:'editPackage',id:pack.id,openedOn:date,durationDays:duration});router.back();}}/></Screen>;
}
function ViewWrap({children}:{children:React.ReactNode}){return <View style={styles.wrap}>{children}</View>}

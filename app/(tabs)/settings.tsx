import React,{useState} from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {router} from 'expo-router';
import {Button,Card,Copy,Screen,SegmentedControl,Sheet,useColors} from '../../src/components/ui';
import {useApp,showError} from '../../src/state/AppContext';
import {shortDate} from '../../src/domain/dates';
import {palette} from '../../src/design/dayTone';
import {NotificationsPrompt,ReminderSummary,useNotificationAccess} from '../../src/components/ReminderSettings';
import {useAuth} from '../../src/state/AuthContext';

/** Screen-local sizes: cards share one radius and a tighter padding; a section is title + secondary line, then its control. */
const card={borderRadius:14,padding:14,gap:10} as const;
const listCard={borderRadius:14,paddingVertical:4,paddingHorizontal:14,gap:0} as const;
/** Settings-only navigation row: same order and targets as before, quieter type, 56 px touch height. */
function NavRow({title,detail,icon,onPress}:{title:string;detail:string;icon:keyof typeof Ionicons.glyphMap;onPress:()=>void}){
  const t=useColors();
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={detail} onPress={onPress} style={({pressed})=>({flexDirection:'row',alignItems:'center',gap:12,minHeight:56,paddingVertical:6,opacity:pressed?.7:1})}>
    <View style={{width:36,height:36,borderRadius:12,backgroundColor:t.soft,alignItems:'center',justifyContent:'center'}}><Ionicons name={icon} size={19} color={t.accent}/></View>
    <View style={{flex:1,minWidth:0,gap:1}}><Copy bold size={15} style={{lineHeight:20}}>{title}</Copy><Hint>{detail}</Hint></View>
    <Ionicons name="chevron-forward" color={t.muted} size={17}/>
  </Pressable>;
}
/** Secondary one-line hint: small, muted, never wraps (ellipsis only as a last resort on very narrow screens). */
function Hint({children}:{children:string}){
  const t=useColors();
  return <Text numberOfLines={1} ellipsizeMode="tail" style={{fontFamily:'Archivo_400Regular',fontSize:12,lineHeight:16,color:t.muted}}>{children}</Text>;
}
function SectionHead({title,detail}:{title:string;detail:string}){
  return <View style={{gap:2}}><Copy bold size={16} style={{lineHeight:21}}>{title}</Copy><Hint>{detail}</Hint></View>;
}

/**
 * Changing the "unanswered day" default: apply it only from now on, or also to the days filled automatically
 * before. Drawn by the app (not a system dialog), so both choices work the same on the web and on Android.
 */
function DefaultChoice({value,days,current,onChoose,onCancel}:{value:'worn'|'notWorn'|null;days:string[];current:'worn'|'notWorn';onChoose:(past:'update'|'keep')=>Promise<unknown>;onCancel:()=>void}){
  if(!value||!days.length)return null;
  const name=(v:'worn'|'notWorn')=>v==='worn'?'Taktım':'Takmadım';
  const range=days.length===1?shortDate(days[0]!):`${shortDate(days[0]!)} – ${shortDate(days.at(-1)!)}`;
  return <Sheet visible title={`Cevapsız günler “${name(value)}” sayılsın`} onClose={onCancel}>
    <Copy size={15}>Bundan sonra cevap vermediğin günler “{name(value)}” sayılacak. Daha önce otomatik doldurulan <Copy size={15} bold>{days.length} gün</Copy> ({range}) şu an “{name(current)}” görünüyor; takvimde kesik çizgili günler bunlardır.</Copy>
    <Copy size={14} muted>Kendi seçtiğin günler hangi seçeneği seçersen seç değişmez.</Copy>
    <View style={{gap:10}}>
      <Button title="Yalnızca bundan sonraki günlerde uygula" secondary outlined onPress={()=>onChoose('keep')}/>
      <Copy size={13} muted>Bu {days.length} gün “{name(current)}” olarak kalır; sayaçlar değişmez.</Copy>
      <Button title="Geçmiş günleri de güncelle" icon="refresh" onPress={()=>onChoose('update')}/>
      <Copy size={13} muted>Bu {days.length} gün ({range}) “{name(value)}” olur; takvim ve lens sayaçları buna göre güncellenir.</Copy>
      <Button title="Vazgeç" secondary onPress={onCancel}/>
    </View>
  </Sheet>;
}

export default function Settings(){const {state,dispatch}=useApp();const auth=useAuth();const notifications=useNotificationAccess();
 type Answer='worn'|'notWorn';
 // Days filled automatically that would change with the new default. "Taktım" needs an open package on that day,
 // the same rule the save uses. Days the person answered themselves are never in this list.
 const changingDays=(target:Answer)=>state.dailyStatuses.filter(d=>d.automatic&&d.status!==target&&(target!=='worn'||state.packages.some(p=>p.openedOn<=d.date&&(!p.closedOn||d.date<=p.closedOn)))).map(d=>d.date).sort();
 const [pending,setPending]=useState<Answer|null>(null);
 const save=(value:Answer,pastAutomatic:'update'|'keep')=>dispatch({type:'settings',patch:{defaultAnswer:value},pastAutomatic}).then(()=>setPending(null));
 const changeDefault=(value:Answer)=>{
  if(value===state.settings.defaultAnswer)return;
  // Nothing filled automatically would change: there is nothing to choose, save at once.
  if(!changingDays(value).length){void save(value,'keep').catch(e=>showError(e));return;}
  setPending(value);
 };
 const autoTotal=state.dailyStatuses.filter(d=>d.automatic).length;
 return <Screen>
 <View style={{gap:4}}><Copy bold size={26} style={{lineHeight:32}}>Ayarlar</Copy><Copy muted size={14} style={{lineHeight:20}}>Takip şeklini ve yedeklerini yönet.</Copy></View>
 <NotificationsPrompt notifications={notifications}/>
 <ReminderSummary notifications={notifications} onEdit={()=>router.push('/settings/notifications')}/>
 <Card style={card}><SectionHead title="Bir günü cevapsız bırakırsan" detail="Ertesi gün 02.00’de otomatik tamamlanır."/><SegmentedControl label="Cevapsız gün varsayılanı" selected={state.settings.defaultAnswer} onChange={value=>changeDefault(value as 'worn'|'notWorn')} options={[{value:'worn',title:'Taktım say'},{value:'notWorn',title:'Takmadım say'}]}/>{autoTotal>0&&<Copy size={13} muted style={{lineHeight:18}}>Şu an {autoTotal} gün otomatik dolu. Varsayılanı değiştirirken bu günlerin de güncellenip güncellenmeyeceğini sen seçersin; kendi seçtiğin günler hiç değişmez.</Copy>}</Card>
 <DefaultChoice value={pending} days={pending?changingDays(pending):[]} current={state.settings.defaultAnswer} onChoose={(past)=>save(pending!,past)} onCancel={()=>setPending(null)}/>
 <Card style={card}><SectionHead title="Takvim görünümü" detail="Sağ ve sol paketlerin açılışını ayrı işaretle."/><SegmentedControl label="Göz takvimi görünümü" selected={state.settings.separateEyeCalendars?'separate':'combined'} onChange={value=>dispatch({type:'settings',patch:{separateEyeCalendars:value==='separate'}})} options={[{value:'combined',title:'Birleşik'},{value:'separate',title:'Sağ · Sol ayrı'}]}/></Card>
 <Card style={listCard}><NavRow title="Hesap yönetimi" detail={auth.session?(auth.syncing?'Veriler eşitleniyor':auth.cloudBackup?'Bulut yedeği açık · oturum · hesabı sil':'Bulut yedeği kapalı · oturum · hesabı sil'):'İsteğe bağlı · misafir kullanımı sürer'} icon="person-circle-outline" onPress={()=>router.push('/account')}/><NavRow title="Yardım ve lens güvenliği" detail="Sık sorular ve güvenilir kaynaklar" icon="help-circle-outline" onPress={()=>router.push('/help')}/><NavRow title="Göz numaralarım" detail="Lens ve gözlük reçeteleri" icon="glasses-outline" onPress={()=>router.push('/prescriptions')}/><NavRow title="Lens kutularım" detail="Her kutu ayrı kaydedilir" icon="albums-outline" onPress={()=>router.push('/settings/boxes')}/><NavRow title="Veri yedeği" detail="Dosyaya yedekle ve geri yükle" icon="save-outline" onPress={()=>router.push('/settings/backup')}/></Card>
 <Copy size={13} muted style={{lineHeight:18}}>Lens süresini kutu talimatına ve göz hekiminin önerisine göre belirle.</Copy>
 <Card style={listCard}><NavRow title="Gizlilik ve veriler" detail="Verilerim · politika · KVKK · silme" icon="shield-checkmark-outline" onPress={()=>router.push('/settings/privacy')}/><NavRow title="Hakkında" detail="Tıbbi cihaz değildir · sürüm · destek" icon="information-circle-outline" onPress={()=>router.push('/about')}/></Card>
 </Screen>}

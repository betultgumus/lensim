import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {router} from 'expo-router';
import {Card,Copy,Screen,SegmentedControl,useColors} from '../../src/components/ui';
import {useApp} from '../../src/state/AppContext';
import {palette} from '../../src/design/dayTone';

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

export default function Settings(){const {state,dispatch}=useApp();return <Screen>
 <View style={{gap:4}}><Copy bold size={26} style={{lineHeight:32}}>Ayarlar</Copy><Copy muted size={14} style={{lineHeight:20}}>Takip şeklini ve yedeklerini yönet.</Copy></View>
 <Card style={card}><SectionHead title="Bir günü cevapsız bırakırsan" detail="Ertesi gün 02.00’de otomatik tamamlanır."/><SegmentedControl label="Cevapsız gün varsayılanı" selected={state.settings.defaultAnswer} onChange={value=>dispatch({type:'settings',patch:{defaultAnswer:value as 'worn'|'notWorn'}})} options={[{value:'worn',title:'Taktım say'},{value:'notWorn',title:'Takmadım say',selectedColor:palette.notWornSelected}]}/></Card>
 <Card style={card}><SectionHead title="Takvim görünümü" detail="Sağ ve sol paketlerin açılışını ayrı işaretle."/><SegmentedControl label="Göz takvimi görünümü" selected={state.settings.separateEyeCalendars?'separate':'combined'} onChange={value=>dispatch({type:'settings',patch:{separateEyeCalendars:value==='separate'}})} options={[{value:'combined',title:'Birleşik'},{value:'separate',title:'Sağ · Sol ayrı'}]}/></Card>
 <Card style={listCard}><NavRow title="Göz numaralarım" detail="Lens ve gözlük reçeteleri" icon="glasses-outline" onPress={()=>router.push('/prescriptions')}/><NavRow title="Lens kutularım" detail="Adet, kutu adı ve süre" icon="albums-outline" onPress={()=>router.push('/settings/boxes')}/><NavRow title="Veri yedeği" detail="Yedek kaydet ve geri yükle" icon="save-outline" onPress={()=>router.push('/settings/backup')}/><NavRow title="Hatırlatmalar" detail="Onay saati ve paket uyarıları" icon="notifications-outline" onPress={()=>router.push('/settings/notifications')}/></Card>
 <Copy size={13} muted style={{lineHeight:18}}>Lensim · Çevrimdışı kullanım desteklenir. Lens süresini kutu talimatına ve göz uzmanının önerisine göre belirle.</Copy>
 <Card style={listCard}><NavRow title="Gizlilik ve veriler" detail="Veri kullanımı ve silme" icon="shield-checkmark-outline" onPress={()=>router.push('/settings/privacy')}/></Card>
 </Screen>}

import React from 'react';
import { Platform, View } from 'react-native';
import { Card, Chip, Copy, Screen, Toggle, styles, useColors } from '../../src/components/ui';
import { Mascot } from '../../src/components/Mascot';
import { useApp } from '../../src/state/AppContext';
import { widgetProps } from '../../src/domain/effects';
export default function WidgetSettings() {
  const { state,dispatch,today }=useApp(); const t=useColors(); const props=widgetProps(state,today);
  return <Screen title="Bir bakışta, yanında." subtitle="Uygulamayı açmadan değişim tarihini gör." back>
    <Card style={{ backgroundColor:t.soft }}><Copy size={11} muted>GERÇEK VERİLERİNLE ÖNİZLEME</Copy><View style={{ flexDirection:'row',alignItems:'center' }}><View style={{ flex:1 }}><Copy bold size={13}>Lens Takip</Copy><Copy bold size={40}>{props.value}</Copy><Copy>{props.label}</Copy><Copy muted size={12}>{props.due}</Copy></View>{props.mascot && <Mascot size={110}/>}</View>{props.summary && <Copy size={12}>{props.summary}</Copy>}{props.stock && <Copy size={12}>{props.stock}</Copy>}</Card>
    <View style={styles.wrap}>{(['mascot','minimal'] as const).map(widgetStyle=><Chip key={widgetStyle} title={widgetStyle==='mascot' ? 'Maskotlu' : 'Minimal'} selected={state.settings.widgetStyle===widgetStyle} onPress={()=>dispatch({ type:'settings',patch:{ widgetStyle } })}/>)}</View>
    {state.modules.separate && <><Copy bold>Widget’ta göster</Copy><View style={styles.wrap}>{(['summary','left','right'] as const).map(widgetScope=><Chip key={widgetScope} title={{ summary:'İki göz özeti',left:'Sol göz',right:'Sağ göz' }[widgetScope]} selected={state.settings.widgetScope===widgetScope} onPress={()=>dispatch({ type:'settings',patch:{ widgetScope } })}/>)}</View></>}
    {state.modules.stock && <Toggle title="Stok bilgimi de göster" value={state.settings.widgetStock} onChange={widgetStock=>dispatch({ type:'settings',patch:{ widgetStock } })}/>}
    <Card><Copy size={20} bold>Ana ekranına ekle</Copy>{Platform.OS==='ios' ? <Copy>1. Ana ekranda boş bir yere basılı tut.{ '\n\n' }2. Düzenle → Widget Ekle’ye dokun.{ '\n\n' }3. Lens Takip’i bul; küçük veya orta boy seç.{ '\n\n' }4. Widget Ekle’ye dokun.</Copy> : <Copy>1. Ana ekranda boş bir yere basılı tut.{ '\n\n' }2. Widget’lar menüsünü aç.{ '\n\n' }3. Lens Takip’in küçük veya orta widget’ını sürükleyip bırak.</Copy>}</Card>
    <Copy muted size={12}>Günlük yenileme cihazın pil yönetimine bağlı olarak gecikebilir. Sabit değişim tarihi her zaman görünür. Widget’a dokunarak uygulamayı açıp güncelleyebilirsin.</Copy>
  </Screen>;
}

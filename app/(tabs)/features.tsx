import React from 'react';
import { Alert, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Copy, Screen, Toggle } from '../../src/components/ui';
import { useApp, errorText } from '../../src/state/AppContext';
import type { ModuleKey } from '../../src/domain/types';
export const featureInfo = [
  { key:'separate', title:'İki göz, iki ayrı plan', description:'Sağ ve sol lensini kendi takviminde takip et.', icon:'◉' },
  { key:'stock', title:'Lens stoğum', description:'Kaç lensin kaldığını bil, hazırlıksız yakalanma.', icon:'◈' },
  { key:'solution', title:'Solüsyonum', description:'Şişeni açtığın günü ve değişim tarihini hatırla.', icon:'◒' },
  { key:'journal', title:'Göz günlüğüm', description:'Nasıl hissettiğine dair sadece sana ait küçük notlar.', icon:'♡' },
  { key:'case', title:'Lens kabım', description:'Lens kabının değişim tarihini de hatırla.', icon:'▣' },
] as const;
export default function Features() {
  const { state, dispatch } = useApp();
  const toggle = (key:ModuleKey, enabled:boolean) => {
    if (key === 'separate') {
      Alert.alert(enabled ? 'Ayrı takibe geç' : 'Birlikte takibe dön', enabled ? 'İlk geçişte mevcut iki göz döngüsü sağ ve sola kopyalanır. Daha önce ayrı takip yaptıysan kayıtların kaldığı yerden açılır. Stok düşülmez.' : 'Sağ/sol kayıtların korunur ve gizlenir. Önceki birlikte takip döngün yeniden gösterilir. Tarihini kontrol et.', [{ text:'Vazgeç',style:'cancel' },{ text:'Devam et',onPress:() => dispatch({ type:'separate',enabled,copy:true }).catch(e=>Alert.alert('Geçiş yapılamadı',errorText(e))) }]); return;
    }
    return dispatch({ type:'module',key,enabled });
  };
  const open = (key:ModuleKey) => { if (key === 'separate') router.push('/(tabs)'); else if (key === 'solution' || key === 'case') router.push({ pathname:'/features/auxiliary',params:{ kind:key } }); else router.push(key === 'stock' ? '/features/stock' : '/features/journal'); };
  return <Screen title="Sana göre şekillensin." subtitle="İhtiyacın kadar özellik. Hepsi senin seçimin.">
    <Card><Copy size={13} muted>Lens sayacın her zaman açık. Diğer özellikleri dilediğinde ekle; kapatınca kayıtların silinmez.</Copy></Card>
    {featureInfo.map(f => <Card key={f.key}><View style={{ flexDirection:'row',alignItems:'center',gap:12 }}><Copy size={30}>{f.icon}</Copy><View style={{ flex:1 }}><Toggle title={f.title} value={state.modules[f.key]} onChange={v=>toggle(f.key,v)}/></View></View><Copy muted size={13}>{f.description}</Copy>{state.modules[f.key] && <Button title="Özelliği aç" secondary onPress={()=>open(f.key)}/>}</Card>)}
  </Screen>;
}

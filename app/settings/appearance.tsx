import React from 'react';
import { View } from 'react-native';
import { Card, Chip, Copy, Screen, Toggle, styles } from '../../src/components/ui';
import { Mascot } from '../../src/components/Mascot';
import { useApp } from '../../src/state/AppContext';
import { palettes } from '../../src/design/theme';
import type { Settings } from '../../src/domain/types';
export default function Appearance() {
  const { state,dispatch } = useApp(); const settings = state.settings;
  const set = (patch:Partial<Settings>) => dispatch({ type:'settings',patch });
  return <Screen title="Senin renklerin." subtitle="Her gün bakmak isteyeceğin bir küçük köşe." back>
    <Card><View style={{ alignItems:'center' }}><Mascot size={170}/><Copy bold>Merhaba, ben {settings.mascot === 'minti' ? 'Minti' : settings.mascot === 'pufi' ? 'Pufi' : 'Lumi'}!</Copy></View></Card>
    <Copy bold>Renk paletin</Copy><View style={styles.wrap}>{(Object.keys(palettes) as Settings['theme'][]).map(key => <Chip key={key} title={palettes[key].name} selected={settings.theme === key} onPress={()=>set({ theme:key })}/>)}</View>
    <Copy bold>Ekran görünümü</Copy><View style={styles.wrap}>{(['system','light','dark'] as const).map(mode => <Chip key={mode} title={{ system:'Sistem',light:'Açık',dark:'Koyu' }[mode]} selected={settings.mode === mode} onPress={()=>set({ mode })}/>)}</View>
    <Copy bold>Küçük dostunu seç</Copy><View style={styles.wrap}>{(['lumi','minti','pufi','none'] as const).map(mascot => <Chip key={mascot} title={{ lumi:'Lumi',minti:'Minti',pufi:'Pufi',none:'Sade grafik' }[mascot]} selected={settings.mascot === mascot} onPress={()=>set({ mascot })}/>)}</View>
    <Card><Toggle title="Hareketi azalt" description="Sistem tercihin de her zaman dikkate alınır." value={settings.reduceMotion} onChange={reduceMotion=>set({ reduceMotion })}/><Toggle title="Dokunsal geri bildirim" value={settings.haptics} onChange={haptics=>set({ haptics })}/></Card>
  </Screen>;
}

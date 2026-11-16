import React from 'react';
import {Pressable,View} from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import { useApp } from '../../src/state/AppContext';
import { Copy,useColors } from '../../src/components/ui';
import { HomePagerProvider,useHomePager,type HomePage } from '../../src/state/HomePagerContext';

function SyncedTabBar({state}:{state:{index:number;routes:Array<{name:string}>}}){
  const t=useColors();const insets=useSafeAreaInsets();const {page,goToPage}=useHomePager();const route=state.routes[state.index]?.name;
  const active=route==='settings'?'settings':page;
  const items=[{key:'today',title:'Bugün',icon:'home-outline' as const},{key:'calendar',title:'Takvim',icon:'calendar-outline' as const},{key:'settings',title:'Ayarlar',icon:'options-outline' as const}];
  const select=(key:string)=>{if(key==='settings'){import('expo-router').then(({router})=>router.navigate('/(tabs)/settings'));return;}const target=key as HomePage;goToPage(target);if(route!=='index')import('expo-router').then(({router})=>router.navigate('/(tabs)'));};
  return <View style={{flexDirection:'row',paddingTop:6,paddingBottom:Math.max(insets.bottom,6),paddingHorizontal:10,backgroundColor:t.surface,borderTopWidth:1,borderTopColor:t.border}}>{items.map(item=>{const selected=active===item.key;return <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{selected}} accessibilityLabel={item.title} onPress={()=>select(item.key)} style={{flex:1,minHeight:52,borderRadius:999,alignItems:'center',justifyContent:'center',gap:1,backgroundColor:selected?t.soft:'transparent'}}><Ionicons name={item.icon} color={selected?t.accent:t.muted} size={22}/><Copy size={14} bold={selected} style={{color:selected?t.accent:t.muted}}>{item.title}</Copy></Pressable>})}</View>;
}
export default function TabLayout() {
  const { state } = useApp(); const t = useColors();
  if (!state.onboarded) return <Redirect href="/onboarding"/>;
  return <HomePagerProvider><Tabs tabBar={props=><SyncedTabBar state={props.state}/> } screenOptions={{ headerShown:false, tabBarActiveTintColor:t.accent, tabBarInactiveTintColor:t.muted, tabBarStyle:{ backgroundColor:t.surface, borderTopColor:t.border, paddingTop:8 }, tabBarLabelStyle:{ fontSize:14, fontWeight:'600', fontFamily:'Archivo_700Bold' }, sceneStyle:{ backgroundColor:t.background } }}>
    <Tabs.Screen name="index" options={{ title:'Bugün', tabBarIcon:({ focused,size }) => <Ionicons name="home-outline" color={focused ? t.accent : t.muted} size={size}/> }}/>
    <Tabs.Screen name="settings" options={{ title:'Ayarlar', tabBarIcon:({ focused,size }) => <Ionicons name="options-outline" color={focused ? t.accent : t.muted} size={size}/> }}/>
  </Tabs></HomePagerProvider>;
}

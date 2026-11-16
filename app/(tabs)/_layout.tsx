import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/state/AppContext';
import { useColors } from '../../src/components/ui';
export default function TabLayout() {
  const { state } = useApp(); const t = useColors();
  if (!state.onboarded) return <Redirect href="/onboarding"/>;
  return <Tabs screenOptions={{ headerShown:false, tabBarActiveTintColor:t.accent, tabBarInactiveTintColor:t.muted, tabBarStyle:{ backgroundColor:t.surface, borderTopColor:t.border, paddingTop:8 }, tabBarLabelStyle:{ fontSize:14, fontWeight:'600', fontFamily:'Archivo_700Bold' }, sceneStyle:{ backgroundColor:t.background } }}>
    <Tabs.Screen name="index" options={{ title:'Bugün', tabBarIcon:({ focused,size }) => <Ionicons name="home-outline" color={focused ? t.accent : t.muted} size={size}/> }}/>
    <Tabs.Screen name="calendar" options={{ title:'Takvim', tabBarIcon:({ focused,size }) => <Ionicons name="calendar-outline" color={focused ? t.accent : t.muted} size={size}/> }}/>
    <Tabs.Screen name="features" options={{ href:null }}/>
    <Tabs.Screen name="settings" options={{ title:'Ayarlar', tabBarIcon:({ focused,size }) => <Ionicons name="options-outline" color={focused ? t.accent : t.muted} size={size}/> }}/>
  </Tabs>;
}

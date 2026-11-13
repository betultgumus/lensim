import '../src/services/alerts';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '../src/state/AppContext';
import { Button, Copy, Screen, useColors } from '../src/components/ui';

function Routes() {
  const { loading, error, retry } = useApp(); const t = useColors();
  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:t.background }}><ActivityIndicator color={t.accent}/><Copy>Lens Takip açılıyor…</Copy></View>;
  if (error) return <Screen title="Verilerin korunuyor"><Copy>{error}</Copy><Button title="Yeniden dene" onPress={retry}/><Copy muted>Uygulamayı silmeden yeniden başlatmayı dene. Kayıtların otomatik sıfırlanmadı.</Copy></Screen>;
  return <>{Platform.OS === 'web' && <View style={{padding:8,backgroundColor:t.soft}}><Copy size={12} style={{textAlign:'center'}}>Web önizlemesi · Kayıtlar bu tarayıcıda saklanır. Bildirimler ve ana ekran widget’ları mobil uygulamada çalışır.</Copy></View>}<StatusBar style={t.dark ? 'light' : 'dark'}/><Stack screenOptions={{ headerShown:false, contentStyle:{ backgroundColor:t.background }, animation:'fade' }}/></>;
}
export default function Layout() { return <SafeAreaProvider><AppProvider><Routes/></AppProvider></SafeAreaProvider>; }

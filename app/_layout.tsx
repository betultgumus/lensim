import '../src/services/alerts';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Archivo_400Regular } from '@expo-google-fonts/archivo/400Regular';
import { Archivo_700Bold } from '@expo-google-fonts/archivo/700Bold';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono/600SemiBold';
import { AppProvider, useApp } from '../src/state/AppContext';
import { AuthProvider } from '../src/state/AuthContext';
import { Button, Copy, Screen, useColors } from '../src/components/ui';

function Routes() {
  const { loading, error, retry } = useApp(); const t = useColors();
  const [fontsLoaded] = useFonts({Archivo_400Regular,Archivo_700Bold,IBMPlexMono_400Regular,IBMPlexMono_600SemiBold});
  if (!fontsLoaded) return <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:t.background }}><ActivityIndicator color={t.accent}/><Copy>Lensim hazırlanıyor…</Copy></View>;
  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:t.background }}><ActivityIndicator color={t.accent}/><Copy>Lensim açılıyor…</Copy></View>;
  if (error) return <Screen title="Verilerin korunuyor"><View style={{ padding:16, borderRadius:16, borderWidth:1, borderColor:t.border, backgroundColor:t.surface, gap:8 }}><Copy bold>Ne oldu?</Copy><Copy>{error}</Copy></View><View style={{ padding:16, borderRadius:16, backgroundColor:t.soft, gap:6 }}><Copy bold>Kayıtların güvende</Copy><Copy size={15}>Lensim hiçbir kaydını silmedi veya sıfırlamadı; bilgilerin bu telefonda duruyor.</Copy><Copy size={15}>“Yeniden dene” kayıtları yalnızca tekrar okur, hiçbir şeyi değiştirmez. Sorun sürerse uygulamayı tamamen kapatıp yeniden aç. Uygulamayı silme; silersen kayıtlar da silinir.</Copy></View><Button title="Yeniden dene" icon="refresh" onPress={retry}/></Screen>;
  return <>{Platform.OS === 'web' && <View style={{paddingVertical:4,paddingHorizontal:12,backgroundColor:t.soft}}><Copy size={12} muted style={{textAlign:'center',lineHeight:16}}>Web önizlemesi · Kayıtlar bu tarayıcıda saklanır. Bildirimler yalnızca mobil uygulamada çalışır.</Copy></View>}<StatusBar style={t.dark ? 'light' : 'dark'}/><Stack screenOptions={{ headerShown:false, contentStyle:{ backgroundColor:t.background }, animation:'fade' }}/></>;
}
export default function Layout() { return <SafeAreaProvider><AppProvider><AuthProvider><Routes/></AuthProvider></AppProvider></SafeAreaProvider>; }

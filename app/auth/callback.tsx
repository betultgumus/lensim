import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Copy, Screen, useColors } from '../../src/components/ui';
import { useAuth } from '../../src/state/AuthContext';

export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; error_description?: string; type?: string }>();
  const auth = useAuth(); const colors = useColors(); const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const code = typeof params.code === 'string' ? params.code : '';
    if (!code) { setError(typeof params.error_description === 'string' ? params.error_description : 'Doğrulama bağlantısı eksik veya süresi dolmuş.'); return; }
    const callback = `lenstakip://auth/callback?code=${encodeURIComponent(code)}`;
    void auth.completeAuthRedirect(callback).then(() => {
      if (active) router.replace(params.type === 'recovery' ? '/account?recovery=1' : '/account');
    }).catch(() => { if (active) setError('Bağlantı doğrulanamadı. Yeni bir e-posta bağlantısı isteyip tekrar dene.'); });
    return () => { active = false; };
  }, [params.code, params.error_description, params.type, auth.completeAuthRedirect]);
  return <Screen title="Hesap doğrulanıyor" back>{error ? <Copy style={{ color:'#A33A42' }}>{error}</Copy> : <View style={{ alignItems:'center', gap:12 }}><ActivityIndicator color={colors.accent}/><Copy>Güvenli bağlantı kuruluyor…</Copy></View>}</Screen>;
}

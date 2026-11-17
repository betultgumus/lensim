import React, { useEffect } from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useCalmMotion } from '../design/motion';
import { Copy } from './ui';

export type OwlLevel = 1 | 2 | 3;
const looks = {
  1: { image: require('../../assets/owl-1-lively.png'), tag: 'Neşeli', tagBg: '#E3F1FF', tagText: '#0754C8', mark: '#F2B33D', line: '#3C8BE8' },
  2: { image: require('../../assets/owl-2-cheek-sleepy.png'), tag: 'Uykulu', tagBg: '#FFF1DC', tagText: '#8A4D0B', mark: '#9B86C9', line: '#D79A45' },
  3: { image: require('../../assets/owl-3-red-eyes.png'), tag: 'Uyarı', tagBg: '#FDE4E6', tagText: '#A3172C', mark: '#D9364A', line: '#D9364A' },
} as const;

/** Owl with small reaction marks (stars, z's or alert lines) and a mood tag, readable at a glance. */
export function OwlBadge({ level, label, size = 96 }: { level: OwlLevel; label: string; size?: number }) {
  const motion = useCalmMotion(); const look = looks[level];
  const bob = useSharedValue(0); const twinkle = useSharedValue(1); const tilt = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(bob); cancelAnimation(twinkle); cancelAnimation(tilt);
    bob.value = 0; twinkle.value = 1; tilt.value = 0;
    if (!motion) return;
    const slow = level === 2 ? 3600 : 2600;
    bob.value = withRepeat(withTiming(1, { duration: slow, easing: Easing.inOut(Easing.sin) }), -1, true);
    twinkle.value = withRepeat(withTiming(0.45, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true);
    // The warning owl wiggles a few times when the state appears, then stays still.
    if (level === 3) tilt.value = withSequence(...[0, 1, 2].flatMap(() => [withTiming(-4, { duration: 120 }), withTiming(4, { duration: 120 })]), withTiming(0, { duration: 140 }));
    return () => { cancelAnimation(bob); cancelAnimation(twinkle); cancelAnimation(tilt); };
  }, [motion, level, bob, twinkle, tilt]);
  const owlStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -3 * bob.value }, { rotate: `${tilt.value}deg` }] }));
  const markStyle = useAnimatedStyle(() => ({ opacity: twinkle.value, transform: [{ scale: 0.9 + 0.12 * twinkle.value }] }));
  return <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: size + 24, alignItems: 'center' }}>
    <View style={{ width: size + 24, height: size }}>
      <Animated.View style={[{ position: 'absolute', left: 12, top: 0, width: size, height: size }, owlStyle]}>
        <Image source={look.image} resizeMode="contain" style={{ width: size, height: size }}/>
      </Animated.View>
      {/* Reaction lines beside the head */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: size * 0.16, width: 14, height: 26 }}>
        {[-35, 0, 35].map((deg, i) => <View key={deg} style={{ position: 'absolute', left: i === 1 ? 0 : 3, top: i * 9, width: 9, height: 2.5, borderRadius: 2, backgroundColor: look.line, transform: [{ rotate: `${deg}deg` }] }}/>)}
      </View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', right: 0, top: 0, alignItems: 'center' }, markStyle]}>
        {level === 1 && <><Ionicons name="sparkles" size={16} color={look.mark}/><Ionicons name="star" size={9} color={look.mark} style={{ marginTop: 2, marginRight: 10 }}/></>}
        {level === 2 && <><Copy bold size={15} style={{ color: look.mark, lineHeight: 16 }}>Z</Copy><Copy bold size={11} style={{ color: look.mark, lineHeight: 12, marginRight: 10 }}>z</Copy></>}
        {level === 3 && <><Ionicons name="alert-circle" size={17} color={look.mark}/><Ionicons name="star" size={8} color={look.mark} style={{ marginTop: 2, marginRight: 10 }}/></>}
      </Animated.View>
    </View>
    <View style={{ marginTop: 2, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, backgroundColor: look.tagBg }}>
      <Copy bold size={12} style={{ color: look.tagText, lineHeight: 16 }}>{look.tag}</Copy>
    </View>
  </View>;
}

import React, { useEffect } from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useCalmMotion } from '../design/motion';

export type OwlLevel = 1 | 2 | 3;
const looks = {
  1: { image: require('../../assets/owl-1-lively.png'), mark: '#F2B33D' },
  /** Change day is near: an orange-amber reminder mark (no sleepy z's). */
  2: { image: require('../../assets/owl-2-cheek-sleepy.png'), mark: '#F08C00' },
  3: { image: require('../../assets/owl-3-red-eyes.png'), mark: '#D9364A' },
} as const;

/** Owl with one reaction mark above the head (sparkles, an amber reminder "!" or a red alert) and, when lively, a small star low on the left. The mood is carried by the artwork and the accessibility label; there is no text tag. */
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
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', right: 0, top: 0, alignItems: 'center' }, markStyle]}>
        {level === 1 && <Ionicons name="sparkles" size={Math.round(size * 0.17)} color={look.mark}/>}
        {level === 2 && <View style={{ width: Math.round(size * 0.2), height: Math.round(size * 0.2), borderRadius: 999, backgroundColor: '#FFB020', borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#C46A00', shadowOpacity: .35, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 }}><Ionicons name="alert" size={Math.round(size * 0.15)} color="#7A3E00"/></View>}
        {level === 3 && <Ionicons name="alert-circle" size={Math.round(size * 0.18)} color={look.mark}/>}
      </Animated.View>
      {/* Small star low on the left balances the marks above the head. */}
      {level === 1 && <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 2, bottom: size * 0.12 }, markStyle]}><Ionicons name="star" size={Math.round(size * 0.09)} color={look.mark}/></Animated.View>}
    </View>
  </View>;
}

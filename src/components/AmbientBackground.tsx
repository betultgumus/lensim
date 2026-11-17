import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useIsFocused } from 'expo-router';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useCalmMotion } from '../design/motion';

/**
 * Very slow, low-amplitude blue glow and wave behind the home screen.
 * One shared value drives three transformed layers on the UI thread; it stops while the
 * screen is out of focus and stays still when reduce motion is on.
 */
export function AmbientBackground() {
  const motion = useCalmMotion(); const focused = useIsFocused();
  const p = useSharedValue(0);
  useEffect(() => {
    if (!motion || !focused) { cancelAnimation(p); return; }
    p.value = withRepeat(withTiming(1, { duration: 18000, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(p);
  }, [motion, focused, p]);
  const glowA = useAnimatedStyle(() => ({ opacity: 0.5 + 0.25 * p.value, transform: [{ translateX: -24 + 48 * p.value }, { translateY: 14 * p.value }, { scale: 1 + 0.05 * p.value }] }));
  const glowB = useAnimatedStyle(() => ({ opacity: 0.6 - 0.2 * p.value, transform: [{ translateX: 30 - 56 * p.value }, { translateY: -18 * p.value }] }));
  const wave = useAnimatedStyle(() => ({ transform: [{ translateX: -120 * p.value }, { translateY: 6 * p.value }] }));
  return <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
    <Animated.View style={[styles.glow, { top: -150, left: -130, width: 420, height: 420, borderRadius: 210, backgroundColor: '#D3E6FD' }, glowA]}>
      <View style={{ position: 'absolute', top: 70, left: 70, width: 280, height: 280, borderRadius: 140, backgroundColor: '#C6DEFB', opacity: 0.6 }}/>
    </Animated.View>
    <Animated.View style={[styles.glow, { top: 330, right: -190, width: 460, height: 460, borderRadius: 230, backgroundColor: '#DCEBFF' }, glowB]}/>
    <Animated.View style={[{ position: 'absolute', top: 150, left: -20, width: 1400, height: 120 }, wave]}>
      <Svg width={1400} height={120} viewBox="0 0 1400 120">
        <Path d="M0 60 C 116 20 233 20 350 60 S 583 100 700 60 S 933 20 1050 60 S 1283 100 1400 60 L 1400 120 L 0 120 Z" fill="#D7E8FD" opacity={0.45}/>
        <Path d="M0 74 C 116 44 233 44 350 74 S 583 104 700 74 S 933 44 1050 74 S 1283 104 1400 74" stroke="#BFD9FA" strokeWidth={1.5} fill="none" opacity={0.7}/>
      </Svg>
    </Animated.View>
  </View>;
}
const styles = StyleSheet.create({ glow: { position: 'absolute' } });

import React, { useEffect, useRef } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useCalmMotion } from '../design/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Pressable with a short press-in / spring-back scale. The animation runs on the UI thread,
 * so `onPress` (and saving) is never delayed. `popOn` plays a small pop when it turns true.
 */
export function PressScale({ style, pressedScale = 0.95, popOn, onPressIn, onPressOut, ...rest }: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; pressedScale?: number; popOn?: boolean }) {
  const motion = useCalmMotion();
  const scale = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (popOn && motion) scale.value = withSequence(withTiming(1.04, { duration: 110 }), withSpring(1, { damping: 12, stiffness: 240, mass: 0.6 }));
  }, [popOn, motion, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <AnimatedPressable
    {...rest}
    onPressIn={e => { if (motion) scale.value = withTiming(pressedScale, { duration: 90 }); onPressIn?.(e); }}
    onPressOut={e => { if (motion) scale.value = withSpring(1, { damping: 14, stiffness: 260, mass: 0.6 }); onPressOut?.(e); }}
    style={[style, animated]}
  />;
}

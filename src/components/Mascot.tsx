import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import Svg, { Defs, RadialGradient, Stop, Ellipse, Path, Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, cancelAnimation, ReduceMotion } from 'react-native-reanimated';
import { useApp } from '../state/AppContext';
import type { LensStatus, Settings } from '../domain/types';

export function Mascot({ size = 150, status = 'normal', variant, celebrating = false }: { size?: number; status?: LensStatus; variant?: Settings['mascot']; celebrating?: boolean }) {
  const { state } = useApp(); const selected = variant ?? state.settings.mascot;
  const focused = useIsFocused(); const [reduced, setReduced] = useState(false); const [active, setActive] = useState(true);
  const y = useSharedValue(0);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduced); const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced); const foreground = AppState.addEventListener('change', s => setActive(s === 'active')); return () => { listener.remove(); foreground.remove(); }; }, []);
  useEffect(() => {
    cancelAnimation(y); y.value = 0;
    if (focused && active && !reduced && !state.settings.reduceMotion) y.value = withRepeat(withSequence(withTiming(celebrating ? -12 : -4, { duration: celebrating ? 280 : 2100, reduceMotion: ReduceMotion.System }), withTiming(0, { duration: celebrating ? 280 : 2100, reduceMotion: ReduceMotion.System })), celebrating ? 3 : -1, false);
    return () => cancelAnimation(y);
  }, [focused, active, reduced, state.settings.reduceMotion, celebrating, y]);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const color = status === 'due' || status === 'overdue' ? '#F3B6B7' : status === 'soon' || status === 'tomorrow' ? '#FFD5B9' : selected === 'minti' ? '#B9F1D2' : selected === 'pufi' ? '#F4C6DE' : '#CFBFFA';
  if (selected === 'none') return null;
  return <Animated.View accessible={false} importantForAccessibility="no-hide-descendants" style={[{ width: size, height: size }, animated]}>
    <Svg viewBox="0 0 180 180" width={size} height={size}>
      <Defs><RadialGradient id="lens" cx="35%" cy="25%" r="85%"><Stop offset="0" stopColor="#FFFFFF" stopOpacity=".95"/><Stop offset={0.5} stopColor={color}/><Stop offset="1" stopColor={color} stopOpacity=".85"/></RadialGradient></Defs>
      <Ellipse cx="90" cy="160" rx="40" ry="5" fill={color} opacity=".2"/>
      <Path d="M29 101 Q8 100 19 88 M151 101 Q172 97 162 84" stroke={color} strokeWidth="9" strokeLinecap="round" fill="none"/>
      <Path d="M68 141 Q60 156 69 155 M111 141 Q120 157 110 154" stroke={color} strokeWidth="9" strokeLinecap="round" fill="none"/>
      <Path d="M90 24 C133 24 158 56 155 96 C152 133 129 147 90 147 C51 147 28 132 25 96 C22 56 47 24 90 24Z" fill="url(#lens)" stroke={color} strokeWidth="2"/>
      <Path d="M45 62 Q54 39 78 37" stroke="white" strokeWidth="7" strokeLinecap="round" opacity=".8" fill="none"/>
      <Ellipse cx="52" cy="103" rx="11" ry="6" fill="#EF9AB2" opacity=".4"/><Ellipse cx="128" cy="103" rx="11" ry="6" fill="#EF9AB2" opacity=".4"/>
      {celebrating ? <><Path d="M58 87 Q66 77 74 87 M106 87 Q114 77 122 87" stroke="#44354E" strokeWidth="4" strokeLinecap="round" fill="none"/><Path d="M78 103 Q90 122 103 103Z" fill="#86517E"/></> : <>
        <Ellipse cx="67" cy="88" rx="5" ry={status === 'overdue' ? 4 : 7} fill="#44354E"/><Ellipse cx="113" cy="88" rx="5" ry={status === 'overdue' ? 4 : 7} fill="#44354E"/>
        <Circle cx="68" cy="85" r="1.5" fill="white"/><Circle cx="114" cy="85" r="1.5" fill="white"/>
        <Path d={status === 'overdue' ? 'M81 109 Q90 101 99 109' : status === 'due' ? 'M86 106 Q90 98 94 106 Q90 114 86 106' : 'M81 104 Q90 114 100 104'} stroke="#775473" strokeWidth="3" strokeLinecap="round" fill="none"/>
      </>}
      {(celebrating || selected === 'pufi') && <Path d="M145 23 L148 31 L157 34 L148 37 L145 45 L142 37 L134 34 L142 31Z" fill="#E8BD73"/>}
      {selected === 'minti' && <Path d="M89 28 Q82 6 103 13 Q106 24 89 28" fill="#70BC96"/>}
    </Svg>
  </Animated.View>;
}

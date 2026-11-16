import React, { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Mascot } from './Mascot';
import { Copy, useColors } from './ui';
import { formatDate, getCycleProgress, getDaysRemaining, getLensStatus, planLabel, statusCopy } from '../domain/dates';
import type { Cycle } from '../domain/types';
import { useApp } from '../state/AppContext';
import Animated, { useAnimatedProps, useSharedValue, withTiming, ReduceMotion } from 'react-native-reanimated';
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
export function Countdown({ cycle }: { cycle: Cycle }) {
  const { today, state } = useApp(); const t = useColors(); const status = getLensStatus(cycle,today); const copy = statusCopy(cycle,today);
  const progress = getCycleProgress(cycle,today); const urgent = status === 'due' || status === 'overdue'; const soon = status === 'soon' || status === 'tomorrow';
  const accent = urgent ? t.danger : soon ? t.warning : t.accent;
  const { width, fontScale } = useWindowDimensions();
  const diameter = Math.min(250, width - 96);
  const ring=useSharedValue(0);
  useEffect(()=>{ring.value=withTiming(1-progress,{duration:state.settings.reduceMotion?0:650,reduceMotion:ReduceMotion.System});},[progress,state.settings.reduceMotion,ring]);
  const animatedProps=useAnimatedProps(()=>({strokeDashoffset:729*(1-ring.value)}));
  return <View style={{ borderRadius:30, backgroundColor:t.dark ? t.soft : urgent ? '#FBEAEA' : soon ? '#FFF0E4' : t.soft, padding:24, gap:16, alignItems:'center', overflow:'hidden' }}>
    <View style={{ borderRadius:20, paddingHorizontal:12, paddingVertical:7, backgroundColor:t.surface }}><Copy size={11} bold style={{ color:accent, letterSpacing:1 }}>{planLabel(cycle.plan).toLocaleUpperCase('tr-TR')}</Copy></View>
    <View style={{ width:diameter, minHeight:Math.max(diameter + 15, 210 * fontScale), alignItems:'center', justifyContent:'center' }}>
      <Svg width={diameter} height={diameter} style={{ position:'absolute', top:8, transform:[{ rotate:'-90deg' }] }} viewBox="0 0 250 250"><Circle cx="125" cy="125" r="116" stroke={t.dark ? '#443752' : '#FFFFFFAA'} strokeWidth="6" fill="none"/><AnimatedCircle animatedProps={animatedProps} cx="125" cy="125" r="116" stroke={accent} opacity={.65} strokeWidth="6" strokeDasharray="729 729" strokeLinecap="round" fill="none"/></Svg>
      <View style={{ marginTop:-10 }}><Mascot size={114} status={status}/></View>
      <Copy size={copy.number.length > 3 ? 43 : 66} bold style={{ lineHeight:74, letterSpacing:-2, textAlign:'center' }}>{copy.number}</Copy><Copy size={16} style={{ color:accent }}>{copy.label}</Copy>
    </View>
    <Copy bold size={14} style={{textAlign:'center'}}>{copy.message}</Copy><Copy size={12} muted>Bir sonraki değişim · {formatDate(cycle.due)}</Copy>
    {cycle.plan.kind !== 'daily' && <Copy size={11} muted>{Math.max(0,Math.min(getDaysRemaining(today,cycle.start),getDaysRemaining(cycle.due,cycle.start)))} / {getDaysRemaining(cycle.due,cycle.start)} gün</Copy>}
  </View>;
}

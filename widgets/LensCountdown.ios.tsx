import { HStack, VStack, Text } from '@expo/ui/swift-ui';
import { font, foregroundStyle, containerBackground, widgetURL, padding, background, clipShape, frame } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WidgetProps } from '../src/domain/effects';

const LensCountdown = (props: WidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme === 'dark' || props.background === '#211C30';
  const ink = dark ? '#F4F0FA' : '#28233A';
  const wide = environment.widgetFamily === 'systemMedium';
  const faceColor = props.face === 'minti' ? '#B9F1D2' : props.face === 'pufi' ? '#F5C4DE' : '#D7C8FF';
  return <HStack spacing={16} modifiers={[containerBackground(dark ? '#211C30' : props.background, 'widget'), widgetURL('lenstakip:///')]}>
    <VStack alignment="leading" spacing={4}>
      <HStack spacing={6}>
        {props.mascot && !wide ? <Text modifiers={[font({ size: 12 }), foregroundStyle('#44354E'), padding({ all: 4 }), background(faceColor), clipShape('circle')]}>•ᴗ•</Text> : null}
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(dark ? '#D6C2FF' : props.color)]}>{props.title}</Text>
      </HStack>
      <Text modifiers={[font({ size: props.value.length > 5 ? 26 : 38, weight: 'bold', design: 'rounded' }), foregroundStyle(ink)]}>{props.value}</Text>
      <Text modifiers={[font({ size: 13 }), foregroundStyle(ink)]}>{props.label}</Text>
      <Text modifiers={[font({ size: 11 }), foregroundStyle(dark ? '#C4BACF' : '#787286')]}>{props.due}</Text>
      {wide && props.summary ? <Text modifiers={[font({ size: 11 }), foregroundStyle(ink)]}>{props.summary}</Text> : null}
      {wide && props.stock ? <Text modifiers={[font({ size: 11 }), foregroundStyle(ink)]}>{props.stock}</Text> : null}
      {wide ? <Text modifiers={[frame({ width: Math.max(4, props.progress * 120), height: 4 }), background(props.color), clipShape('capsule')]}>{' '}</Text> : null}
    </VStack>
    {props.mascot && wide ? <VStack spacing={0} modifiers={[padding({ all: 12 }), background(faceColor), clipShape('circle')]}>
      <HStack spacing={14}><Text modifiers={[font({ size: 14 }), foregroundStyle('#40334E')]}>●</Text><Text modifiers={[font({ size: 14 }), foregroundStyle('#40334E')]}>●</Text></HStack>
      <Text modifiers={[font({ size: 20 }), foregroundStyle('#7456C3')]}>⌣</Text>
    </VStack> : null}
  </HStack>;
};
export default createWidget('LensCountdown', LensCountdown, { title: 'Lens Takip', value: 'Merhaba', label: 'Lens takibini başlat', due: 'Uygulamayı aç', summary: '', color: '#7456C3', background: '#F2EDFF', mascot: true, face: 'lumi', stock: '', progress: 0 });

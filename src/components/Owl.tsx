import React from 'react';
import Svg,{Path,Ellipse,Circle} from 'react-native-svg';

/** Small flat owl illustration used by Lensim's Turkish-first home header. */
export function Owl({size=96}:{size?:number}) {
  return <Svg width={size} height={size} viewBox="0 0 160 160" accessible={false}>
    <Ellipse cx="80" cy="148" rx="48" ry="7" fill="#A9C9EE" opacity=".45"/>
    <Path d="M27 62 18 29q24 5 35 20Q67 35 80 35q15 0 28 14 14-17 35-20l-9 34q8 19 1 42-11 32-55 32-44 0-55-32-7-22 2-43Z" fill="#9A5935" stroke="#65361F" strokeWidth="4" strokeLinejoin="round"/>
    <Path d="M36 75q4-26 26-31 13-2 18 11 6-13 19-11 22 5 26 31-4 39-45 42-41-3-44-42Z" fill="#FFF0D8" stroke="#D89C68" strokeWidth="3"/>
    <Ellipse cx="59" cy="79" rx="21" ry="24" fill="#FFF" stroke="#4A2A1C" strokeWidth="4"/>
    <Ellipse cx="101" cy="79" rx="21" ry="24" fill="#FFF" stroke="#4A2A1C" strokeWidth="4"/>
    <Circle cx="62" cy="80" r="12" fill="#6C3D22"/><Circle cx="98" cy="80" r="12" fill="#6C3D22"/>
    <Circle cx="64" cy="77" r="4" fill="#FFF"/><Circle cx="100" cy="77" r="4" fill="#FFF"/>
    <Path d="m80 89-8 10 8 8 8-8-8-10Z" fill="#F2A51A" stroke="#A65B0C" strokeWidth="2"/>
    <Path d="M39 112q-20 6-18 24 17 9 34-5m66-19q20 6 18 24-17 9-34-5" fill="#B8754E" stroke="#65361F" strokeWidth="4" strokeLinejoin="round"/>
    <Path d="M60 120q20 11 40 0l9 21q-29 16-58 0l9-21Z" fill="#F5D8B6"/>
  </Svg>;
}

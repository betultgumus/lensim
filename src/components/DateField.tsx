import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDays, addMonths, dateOnly, formatDate, maskTurkishDateInput, parseDate, parseTurkishDateInput } from '../domain/dates';
import { Button, Copy, Field, Sheet, styles, useColors } from './ui';

const displayDate=(iso:string)=>/^\d{4}-\d{2}-\d{2}$/.test(iso)?`${iso.slice(8,10)}.${iso.slice(5,7)}.${iso.slice(0,4)}`:iso;
/**
 * Date input (GG.AA.YYYY) with a calendar sheet.
 * The calendar sheet opens from the calendar icon on the right side of the input. The format
 * (GG.AA.YYYY) is shown as a lighter hint next to the label. `compact` is kept for older callers.
 * - `onValidityChange`: reports false while the typed text is incomplete or not a real date, so a form
 *   never saves the previous value silently.
 * - `openRequest`: increase it to open the calendar sheet from outside.
 */
export function DateField({ label,value,onChange,compact=false,onValidityChange,openRequest=0 }: { label:string;value:string;onChange:(v:string)=>void;compact?:boolean;onValidityChange?:(valid:boolean)=>void;openRequest?:number }) {
  const [open,setOpen]=useState(false); const [month,setMonth]=useState(dateOnly().slice(0,7)+'-01'); const [text,setText]=useState(displayDate(value)); const [invalid,setInvalid]=useState(false);const t=useColors();
  const validity=useRef(onValidityChange);validity.current=onValidityChange;
  useEffect(()=>{setText(displayDate(value));setInvalid(false);validity.current?.(true);},[value]);
  const first=parseDate(month); const start=addDays(month,-((first.getDay()+6)%7));
  const input=(raw:string)=>{const next=maskTurkishDateInput(raw);setText(next);setInvalid(false);if(next.length===10){const iso=parseTurkishDateInput(next);if(iso){onChange(iso);validity.current?.(true);}else{setInvalid(true);validity.current?.(false);}}else validity.current?.(next===displayDate(value));};
  const show=()=>{ try { parseDate(value); setMonth(value.slice(0,7)+'-01'); } catch {setMonth(dateOnly().slice(0,7)+'-01');} setOpen(true); };
  const requested=useRef(openRequest);
  useEffect(()=>{if(openRequest!==requested.current){requested.current=openRequest;show();}},[openRequest]);// eslint-disable-line react-hooks/exhaustive-deps
  const choose=(day:string)=>{onChange(day);setText(displayDate(day));setInvalid(false);validity.current?.(true);setOpen(false);};
  const picker=<Pressable accessibilityRole="button" accessibilityLabel={`${label}: takvimi aç`} hitSlop={6} onPress={show} style={({pressed})=>({width:44,height:44,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:pressed?t.soft:'transparent'})}><Ionicons name="calendar-outline" size={22} color={t.accent}/></Pressable>;
  return <View style={{ gap:8 }}>
    <Field label={label} hint="GG.AA.YYYY" value={text} onChange={input} placeholder="GG.AA.YYYY" numeric trailing={picker} error={invalid?'Bu tarih anlaşılmadı. GG.AA.YYYY biçiminde geçerli bir tarih gir ya da takvim simgesine dokun.':null}/>
    <Sheet visible={open} title="Tarih seç" onClose={()=>setOpen(false)}>
      <View style={{ flexDirection:'row',justifyContent:'space-between',alignItems:'center' }}>
        <View style={{flexDirection:'row'}}><Pressable accessibilityLabel="Önceki yıl" accessibilityRole="button" style={styles.icon} onPress={()=>setMonth(addMonths(month,-12))}><Copy size={22}>«</Copy></Pressable><Pressable accessibilityLabel="Önceki ay" accessibilityRole="button" style={styles.icon} onPress={()=>setMonth(addMonths(month,-1))}><Copy size={24}>‹</Copy></Pressable></View>
        <Copy bold>{first.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}</Copy>
        <View style={{flexDirection:'row'}}><Pressable accessibilityLabel="Sonraki ay" accessibilityRole="button" style={styles.icon} onPress={()=>setMonth(addMonths(month,1))}><Copy size={24}>›</Copy></Pressable><Pressable accessibilityLabel="Sonraki yıl" accessibilityRole="button" style={styles.icon} onPress={()=>setMonth(addMonths(month,12))}><Copy size={22}>»</Copy></Pressable></View>
      </View>
      <View style={{ flexDirection:'row' }}>{['Pt','Sa','Ça','Pe','Cu','Ct','Pz'].map(d=><View key={d} style={{flex:1,alignItems:'center'}}><Copy muted size={14}>{d}</Copy></View>)}</View>
      <View style={{flexDirection:'row',flexWrap:'wrap'}}>{Array.from({length:42},(_,i)=>addDays(start,i)).map(day=><Pressable accessibilityLabel={formatDate(day)} accessibilityRole="button" accessibilityState={{selected:day===value}} key={day} onPress={()=>choose(day)} style={{width:'14.2857%',minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:day===value?t.soft:undefined,opacity:day.slice(0,7)===month.slice(0,7)?1:.35}}><Copy bold={day===value}>{Number(day.slice(-2))}</Copy></Pressable>)}</View>
      <Button title="Bugün" secondary onPress={()=>choose(dateOnly())}/>
    </Sheet>
  </View>;
}

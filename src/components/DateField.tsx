import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { addDays, addMonths, dateOnly, formatDate, maskTurkishDateInput, parseDate, parseTurkishDateInput } from '../domain/dates';
import { Button, Copy, Field, Sheet, styles, useColors } from './ui';

const displayDate=(iso:string)=>/^\d{4}-\d{2}-\d{2}$/.test(iso)?`${iso.slice(8,10)}.${iso.slice(5,7)}.${iso.slice(0,4)}`:iso;
export function DateField({ label,value,onChange }: { label:string;value:string;onChange:(v:string)=>void }) {
  const [open,setOpen]=useState(false); const [month,setMonth]=useState(dateOnly().slice(0,7)+'-01'); const [text,setText]=useState(displayDate(value)); const [invalid,setInvalid]=useState(false);const t=useColors();
  useEffect(()=>{setText(displayDate(value));},[value]);
  const first=parseDate(month); const start=addDays(month,-((first.getDay()+6)%7));
  const input=(raw:string)=>{const next=maskTurkishDateInput(raw);setText(next);setInvalid(false);if(next.length===10){const iso=parseTurkishDateInput(next);if(iso)onChange(iso);else setInvalid(true);}};
  const show=()=>{ try { parseDate(value); setMonth(value.slice(0,7)+'-01'); } catch {setMonth(dateOnly().slice(0,7)+'-01');} setOpen(true); };
  const choose=(day:string)=>{onChange(day);setText(displayDate(day));setInvalid(false);setOpen(false);};
  return <View style={{ gap:8 }}><Field label={`${label} · GG.AA.YYYY`} value={text} onChange={input} placeholder="GG.AA.YYYY" numeric/><Copy size={14} muted>Gün.Ay.Yıl biçiminde yazabilir veya takvimden seçebilirsin. Örnek: 16.11.2026</Copy>{invalid&&<Copy size={14} style={{color:t.danger}}>Bu tarih anlaşılmadı. GG.AA.YYYY biçiminde geçerli bir tarih gir.</Copy>}<Button title="Takvimden seç" secondary icon="calendar-outline" onPress={show}/>
    <Sheet visible={open} title="Tarih seç" onClose={()=>setOpen(false)}>
      <View style={{ flexDirection:'row',justifyContent:'space-between',alignItems:'center' }}><Pressable accessibilityLabel="Önceki ay" accessibilityRole="button" style={styles.icon} onPress={()=>setMonth(addMonths(month,-1))}><Copy size={24}>‹</Copy></Pressable><Copy bold>{first.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}</Copy><Pressable accessibilityLabel="Sonraki ay" accessibilityRole="button" style={styles.icon} onPress={()=>setMonth(addMonths(month,1))}><Copy size={24}>›</Copy></Pressable></View>
      <View style={{ flexDirection:'row' }}>{['Pt','Sa','Ça','Pe','Cu','Ct','Pz'].map(d=><View key={d} style={{flex:1,alignItems:'center'}}><Copy muted size={14}>{d}</Copy></View>)}</View>
      <View style={{flexDirection:'row',flexWrap:'wrap'}}>{Array.from({length:42},(_,i)=>addDays(start,i)).map(day=><Pressable accessibilityLabel={formatDate(day)} accessibilityRole="button" key={day} onPress={()=>choose(day)} style={{width:'14.2857%',minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:day===value?t.soft:undefined,opacity:day.slice(0,7)===month.slice(0,7)?1:.35}}><Copy bold={day===value}>{Number(day.slice(-2))}</Copy></Pressable>)}</View>
      <Button title="Bugün" secondary onPress={()=>choose(dateOnly())}/>
    </Sheet>
  </View>;
}

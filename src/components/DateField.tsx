import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { addDays, addMonths, dateOnly, formatDate, parseDate } from '../domain/dates';
import { Button, Copy, Field, Sheet, styles, useColors } from './ui';
export function DateField({ label,value,onChange }: { label:string;value:string;onChange:(v:string)=>void }) {
  const [open,setOpen]=useState(false); const [month,setMonth]=useState(dateOnly().slice(0,7)+'-01'); const t=useColors();
  const first=parseDate(month); const start=addDays(month,-((first.getDay()+6)%7));
  const show=()=>{ try { parseDate(value); setMonth(value.slice(0,7)+'-01'); } catch {} setOpen(true); };
  return <View style={{ gap:8 }}><Field label={label} value={value} onChange={onChange} placeholder="YYYY-AA-GG"/><Button title="Takvimden seç" secondary icon="calendar-outline" onPress={show}/>
    <Sheet visible={open} title="Tarih seç" onClose={()=>setOpen(false)}>
      <View style={{ flexDirection:'row',justifyContent:'space-between',alignItems:'center' }}><Pressable accessibilityLabel="Önceki ay" accessibilityRole="button" style={styles.icon} onPress={()=>setMonth(addMonths(month,-1))}><Copy size={24}>‹</Copy></Pressable><Copy bold>{first.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}</Copy><Pressable accessibilityLabel="Sonraki ay" accessibilityRole="button" style={styles.icon} onPress={()=>setMonth(addMonths(month,1))}><Copy size={24}>›</Copy></Pressable></View>
      <View style={{ flexDirection:'row' }}>{['Pt','Sa','Ça','Pe','Cu','Ct','Pz'].map(d=><View key={d} style={{flex:1,alignItems:'center'}}><Copy muted size={12}>{d}</Copy></View>)}</View>
      <View style={{flexDirection:'row',flexWrap:'wrap'}}>{Array.from({length:42},(_,i)=>addDays(start,i)).map(day=><Pressable accessibilityLabel={formatDate(day)} accessibilityRole="button" key={day} onPress={()=>{onChange(day);setOpen(false);}} style={{width:'14.2857%',minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:day===value?t.soft:undefined,opacity:day.slice(0,7)===month.slice(0,7)?1:.35}}><Copy bold={day===value}>{Number(day.slice(-2))}</Copy></Pressable>)}</View>
      <Button title="Bugün" secondary onPress={()=>{onChange(dateOnly());setOpen(false);}}/>
    </Sheet>
  </View>;
}

import React,{useEffect,useState} from 'react';
import {router,useLocalSearchParams} from 'expo-router';
import {Button,Copy,Field,Screen} from '../../src/components/ui';
import {DurationPicker} from '../../src/components/LensForm';
import {isPresetDuration} from '../../src/domain/dates';
import {useApp} from '../../src/state/AppContext';
export default function EditBox(){const {id}=useLocalSearchParams<{id:string}>();const {state,dispatch}=useApp();const box=state.boxes.find(b=>b.id===id);const [name,setName]=useState(''),[brand,setBrand]=useState(''),[duration,setDuration]=useState('30'),[custom,setCustom]=useState(false),[total,setTotal]=useState('6'),[remaining,setRemaining]=useState('6');const [nameError,setNameError]=useState<string|null>(null);useEffect(()=>{if(box){setName(box.name);setBrand(box.brand);setDuration(String(box.durationDays));setCustom(!isPresetDuration(box.durationDays));setTotal(String(box.lensesTotal));setRemaining(String(box.lensesRemaining));}},[box?.id,box?.name,box?.brand,box?.durationDays,box?.lensesTotal,box?.lensesRemaining]);
 if(!box)return <Screen title="Kutu bulunamadı" back><Copy>Bu lens kutusu kayıtlı değil.</Copy></Screen>;
 const save=async()=>{if(!name.trim()){setNameError('Kutu adı zorunlu. Paketini ayırt etmeni sağlayacak bir ad yaz (ör. “1.5 numara mavi kap”).');return;}
  const d=Number(duration),tot=Number(total),rem=Number(remaining);
  if(!Number.isInteger(d)||d<1||d>365)throw new Error('Lens kullanım süresini 1 ile 365 gün arasında bir sayı olarak gir.');
  if(!Number.isInteger(tot)||tot<1)throw new Error('Kutudaki toplam lens en az 1 olmalı.');
  if(!Number.isInteger(rem)||rem<0||rem>tot)throw new Error(`Kutuda kalan lens 0 ile ${tot} arasında olmalı.`);
  await dispatch({type:'editBox',id:box.id,patch:{name,brand,durationDays:Number(duration),lensesTotal:Number(total),lensesRemaining:Number(remaining)}});router.back();};
 return <Screen title="Lens kutusunu düzenle" subtitle="Açılmış paketlerin önceki süre bilgisi korunur." back><Field label="Kutu adı" tag={{text:'Zorunlu',required:true}} value={name} onChange={v=>{setName(v);if(v.trim())setNameError(null);}} placeholder="Örn. 1.5 numara mavi kap" error={nameError}/><Field label="Marka" tag={{text:'İsteğe bağlı'}} value={brand} onChange={setBrand}/><Copy bold>Kullanım süresi</Copy><DurationPicker days={duration} custom={custom} onChange={(d,c)=>{setDuration(d);setCustom(c);}}/><Field label="Kutudaki toplam lens" numeric value={total} onChange={setTotal}/><Field label="Kutuda kalan lens" numeric value={remaining} onChange={setRemaining}/><Copy size={14} muted>Lens sayısı varsayılan olarak 6’dır; kutundaki gerçek adede göre değiştirebilirsin. Kayıtlı paketlerin açılış tarihi ve sayaçları bu düzenlemeden etkilenmez.</Copy><Button title="Kutu bilgilerini kaydet" icon="save-outline" onPress={save}/></Screen>;
}

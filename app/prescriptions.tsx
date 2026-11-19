import React,{useState} from 'react';
import {Pressable,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {Button,Card,ChoiceCard,Copy,Screen,SegmentedControl,useColors} from '../src/components/ui';
import {NumberCell,RxField} from '../src/components/LensForm';
import {assertRxValues} from '../src/domain/rx';
import {useApp,uid} from '../src/state/AppContext';
import {DateField} from '../src/components/DateField';
import {durationLabel,formatDate,parseDate} from '../src/domain/dates';
import type {Eye,PrescriptionRecord} from '../src/domain/types';

const lensFields=['PWR','SPH','CYL','AXIS','ADD','BC','DIA'];
const glassesFields=['SPH','CYL','AXIS','ADD'];

/** "Diğer ölçüler": a disclosure row whose text and chevron always match its open/closed state. */
function MoreToggle({open,onPress}:{open:boolean;onPress:()=>void}){
 const t=useColors();
 return <Pressable accessibilityRole="button" accessibilityState={{expanded:open}} accessibilityLabel={open?'Diğer ölçüleri gizle':'Diğer ölçüleri göster, isteğe bağlı'} onPress={onPress} style={({pressed})=>({flexDirection:'row',alignItems:'center',gap:8,minHeight:48,paddingHorizontal:14,borderRadius:14,borderWidth:open?1.5:1,borderColor:open?t.accent:t.border,backgroundColor:open?t.soft:t.surface,opacity:pressed?.75:1})}>
  <Copy size={15} bold style={{flex:1,color:open?t.accent:t.text}}>{open?'Diğer ölçüleri gizle':'Diğer ölçüler'}{!open&&<Copy size={13} style={{color:'#8191A8'}}>  · isteğe bağlı</Copy>}</Copy>
  <Ionicons name={open?'chevron-up':'chevron-down'} size={20} color={t.accent}/>
 </Pressable>;
}

export default function Prescriptions(){
 const {state,dispatch,today}=useApp();const [kind,setKind]=useState<'lens'|'glasses'>('lens');const [date,setDate]=useState(today);const [values,setValues]=useState<Record<string,string>>({});const [separateNumbers,setSeparateNumbers]=useState(false);const [activeRxEye,setActiveRxEye]=useState<Eye>('right');const [showAdvanced,setShowAdvanced]=useState(false);const [selectedBoxId,setSelectedBoxId]=useState<string|null>(state.boxes[0]?.id??null);const [applyToBox,setApplyToBox]=useState(false);
 const [dateValid,setDateValid]=useState(true);const [notice,setNotice]=useState<string|null>(null);
 // A record covers both eyes: “İki göz aynı” stores the same values for each, “Sağ ve sol farklı” stores each eye's own.
 const fields=kind==='lens'?lensFields:glassesFields;const primaryField=kind==='lens'?'PWR':'SPH';const eyes:Eye[]=['right','left'];
 const split=separateNumbers;
 const prefix=split?(activeRxEye==='right'?'Sağ · ':'Sol · '):'';
 const keyFor=(code:string)=>split?`${activeRxEye}-${code}`:code;
 const reset=()=>{setDate(today);setValues({});setApplyToBox(false);};
 // The record is saved with the date shown in the field: an unfinished or invalid date stops the save
 // instead of silently keeping today's date (which made backdated entries look lost).
 const save=async()=>{
  if(!dateValid)throw new Error('Reçete tarihini GG.AA.YYYY biçiminde tamamla veya takvim simgesinden seç.');
  parseDate(date);if(date>today)throw new Error('Reçete tarihi bugünden sonra olamaz.');
  const own=(side:Eye)=>Object.fromEntries(fields.filter(k=>values[split?`${side}-${k}`:k]?.trim()).map(k=>[k,values[split?`${side}-${k}`:k]!.trim().replace(',','.')]));
  // Wrong values stop the save with a message naming the field (and eye); nothing is stored.
  for(const e of eyes)assertRxValues(Object.fromEntries(Object.entries(own(e)).map(([k,v])=>[split?`${e}-${k}`:k,v])));
  const perEye=Object.fromEntries(eyes.map(e=>[e,own(e)]));
  // Values typed for the other numara türü (or a hidden eye) do not count.
  if(!Object.values(perEye).some(v=>Object.keys(v).length))throw new Error('En az bir numara değeri gir veya Lensim’i numara eklemeden kullan.');
  const box=kind==='lens'&&applyToBox?state.boxes.find(b=>b.id===selectedBoxId):undefined;
  if(kind==='lens'&&applyToBox&&!box)throw new Error('Numarası güncellenecek kutuyu seç.');
  const entry:PrescriptionRecord={id:uid(),date,kind,eyes,values:perEye};
  await dispatch({type:'prescriptionRecord',entry});
  if(box)await dispatch({type:'editBox',id:box.id,patch:{prescription:{...box.prescription,...perEye}}});
  setNotice(`${formatDate(date)} tarihli ${kind==='lens'?'lens':'gözlük'} numarası kaydedildi${box?`; “${box.name}” kutusunun numarası da güncellendi`:''}.`);
  reset();
 };
 const newestLens=state.prescriptionHistory.filter(e=>e.kind==='lens').map(e=>e.date).sort().at(-1);
 const selectedBox=state.boxes.find(b=>b.id===selectedBoxId);
 const others=fields.filter(k=>k!==primaryField);
 return <Screen title="Göz numaralarım" subtitle="İstersen numaralarını ekle. Bu bilgiler olmadan lens takibini kullanabilirsin." back>
  <Card style={{borderRadius:16}}><View style={{flexDirection:'row',alignItems:'center',gap:10}}><Ionicons name="glasses-outline" size={26} color="#0754C8"/><Copy size={17} bold>Numara bilgilerini girmek ister misin?</Copy></View><Copy size={14} muted>İsteğe bağlıdır. Bilmiyorsan boş bırakabilir veya daha sonra ekleyebilirsin. Lens ve gözlük reçeteleri ayrı kaydedilir. Eski bir reçeteyi de ekleyebilirsin: reçete tarihini geçmiş bir güne ayarla.</Copy>
   <SegmentedControl label="Numara türü" selected={kind} onChange={value=>setKind(value as 'lens'|'glasses')} options={[{value:'lens',title:'Lens numarası'},{value:'glasses',title:'Gözlük numarası'}]}/>
   <DateField label="Reçete tarihi" compact value={date} onChange={setDate} onValidityChange={setDateValid}/>
   <SegmentedControl label="Numaralar" selected={separateNumbers?'different':'same'} onChange={value=>{const separate=value==='different';setValues(prev=>separate?Object.fromEntries(fields.flatMap(k=>[[`right-${k}`,prev[`right-${k}`]??prev[k]??''],[`left-${k}`,prev[`left-${k}`]??prev[k]??'']])):Object.fromEntries(fields.map(k=>[k,prev[k]??prev[`right-${k}`]??prev[`left-${k}`]??''])));setSeparateNumbers(separate);}} options={[{value:'same',title:'İki göz aynı'},{value:'different',title:'Sağ ve sol farklı'}]}/>
   {split&&<SegmentedControl label="Düzenlenecek göz" selected={activeRxEye} onChange={value=>setActiveRxEye(value as Eye)} options={[{value:'right',title:'Sağ göz'},{value:'left',title:'Sol göz'}]}/>}
   <RxField key={keyFor(primaryField)} code={primaryField} label={`${prefix}${kind==='lens'?'Lens gücü (PWR)':'Göz numarası (SPH)'}`} hint="isteğe bağlı" placeholder="örn. -2.50" value={values[keyFor(primaryField)]??''} onChange={v=>setValues(prev=>({...prev,[keyFor(primaryField)]:v}))}/>
   <MoreToggle open={showAdvanced} onPress={()=>setShowAdvanced(!showAdvanced)}/>
   {/* Three cells per row on phones (3 + 3 for lens values); they wrap to fewer per row only when too narrow. */}
   {showAdvanced&&<View style={{gap:6}}>{!!prefix&&<Copy bold size={14} style={{color:'#2C4A78'}}>{prefix.replace(' · ','')} göz</Copy>}<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{others.map(code=><NumberCell key={keyFor(code)} code={code} value={values[keyFor(code)]??''} onChange={v=>setValues(prev=>({...prev,[keyFor(code)]:v}))}/>)}</View></View>}
   {kind==='lens'&&state.boxes.length>0&&<View style={{gap:8}}><Copy bold>Bu reçete lens kutusunu etkilesin mi?</Copy>
    <View accessibilityRole="radiogroup" accessibilityLabel="Reçetenin kutuya etkisi" style={{gap:8}}>
     <ChoiceCard title="Yalnızca reçete geçmişine kaydet" selected={!applyToBox} onPress={()=>setApplyToBox(false)}/>
     <ChoiceCard title="Kutunun numarasını güncelle" selected={applyToBox} onPress={()=>setApplyToBox(true)}/>
    </View>
    {applyToBox&&<><Copy bold>Hangi kutu güncellensin?</Copy><View accessibilityRole="radiogroup" accessibilityLabel="Güncellenecek kutu" style={{gap:8}}>{state.boxes.map(box=><ChoiceCard key={box.id} title={box.name} detail={`${durationLabel(box.durationDays)} · ${box.eyes.length===2?'iki göz':box.eyes[0]==='right'?'sağ göz':'sol göz'}${box.brand?` · ${box.brand}`:''}`} meta={`Kutuda ${box.lensesRemaining} lens kaldı`} selected={selectedBoxId===box.id} onPress={()=>setSelectedBoxId(box.id)}/>)}</View>
     {selectedBox&&eyes.some(e=>!selectedBox.eyes.includes(e))&&<Copy size={14} style={{color:'#9F5030'}}>Bu kutu yalnızca {selectedBox.eyes[0]==='right'?'sağ':'sol'} göz için. Diğer gözün numarası da kutuya yazılır.</Copy>}
     {!!newestLens&&date<newestLens&&<Copy size={14} style={{color:'#9F5030'}}>Bu reçete, kayıtlı en yeni lens reçetesinden ({formatDate(newestLens)}) daha eski. Kutunun numarası yine de bu eski değerle değişir; açık paketlerin ve geçmiş günlerin kayıtları değişmez.</Copy>}</>}
   </View>}
   <Button title="Numarayı kaydet" icon="save-outline" onPress={save}/>{!!notice&&<View accessibilityLiveRegion="polite" style={{flexDirection:'row',gap:8,alignItems:'flex-start'}}><Ionicons name="checkmark-circle" size={18} color="#1F7A4D"/><Copy size={14} bold style={{flex:1,color:'#1F5F3F'}}>{notice}</Copy></View>}
  </Card>
 </Screen>;
}

import React,{useRef,useState} from 'react';
import {Alert,View,type ScrollViewInstance} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {Button,Card,Chip,ChoiceCard,Copy,Field,Screen,SegmentedControl,styles} from '../src/components/ui';
import {useApp,uid} from '../src/state/AppContext';
import {DateField} from '../src/components/DateField';
import {durationLabel,formatDate,parseDate} from '../src/domain/dates';
import type {Eye,PrescriptionRecord} from '../src/domain/types';

const lensFields=['PWR','SPH','CYL','AXIS','ADD','BC','DIA'];
const glassesFields=['SPH','CYL','AXIS','ADD'];
const fieldsFor=(kind:'lens'|'glasses')=>kind==='lens'?lensFields:glassesFields;
export default function Prescriptions(){
 const {state,dispatch,today}=useApp();const [kind,setKind]=useState<'lens'|'glasses'>('lens');const [eye,setEye]=useState<'both'|Eye>('both');const [date,setDate]=useState(today);const [values,setValues]=useState<Record<string,string>>({});const [separateNumbers,setSeparateNumbers]=useState(false);const [activeRxEye,setActiveRxEye]=useState<Eye>('right');const [showAdvanced,setShowAdvanced]=useState(false);const [editing,setEditing]=useState<string|null>(null);const [selectedBoxId,setSelectedBoxId]=useState<string|null>(state.boxes[0]?.id??null);const [applyToBox,setApplyToBox]=useState(false);
 const [dateValid,setDateValid]=useState(true);const [openDate,setOpenDate]=useState(0);const [savedId,setSavedId]=useState<string|null>(null);const [notice,setNotice]=useState<string|null>(null);
 const scrollRef=useRef<ScrollViewInstance|null>(null);
 const fields=kind==='lens'?lensFields:glassesFields;const primaryField=kind==='lens'?'PWR':'SPH';const eyes:Eye[]=eye==='both'?['right','left']:[eye];
 const split=separateNumbers&&eye==='both';
 const prefix=split?(activeRxEye==='right'?'Sağ · ':'Sol · '):eye==='right'?'Sağ · ':eye==='left'?'Sol · ':'';
 const chooseEye=(value:'both'|Eye)=>{if(value!=='both'&&separateNumbers){setValues(prev=>Object.fromEntries(fields.map(k=>[k,prev[`${value}-${k}`]??prev[k]??''])));setSeparateNumbers(false);}if(value!=='both')setActiveRxEye(value);setEye(value);};
 const reset=()=>{setEditing(null);setDate(today);setValues({});setApplyToBox(false);};
 // The record is saved with the date shown in the field: an unfinished or invalid date stops the save
 // instead of silently keeping today's date (which made backdated entries look lost).
 const save=async()=>{
  if(!dateValid)throw new Error('Reçete tarihini GG.AA.YYYY biçiminde tamamla veya takvim simgesinden seç.');
  parseDate(date);if(date>today)throw new Error('Reçete tarihi bugünden sonra olamaz.');
  const own=(side:Eye)=>Object.fromEntries(fields.filter(k=>values[split?`${side}-${k}`:k]?.trim()).map(k=>[k,values[split?`${side}-${k}`:k]!.trim().replace(',','.')]));
  const perEye=Object.fromEntries(eyes.map(e=>[e,own(e)]));
  // Values typed for the other numara türü (or a hidden eye) do not count.
  if(!Object.values(perEye).some(v=>Object.keys(v).length))throw new Error('En az bir numara değeri gir veya Lensim’i numara eklemeden kullan.');
  const box=kind==='lens'&&applyToBox?state.boxes.find(b=>b.id===selectedBoxId):undefined;
  if(kind==='lens'&&applyToBox&&!box)throw new Error('Numarası güncellenecek kutuyu seç.');
  const entry:PrescriptionRecord={id:editing??uid(),date,kind,eyes,values:perEye};
  await dispatch({type:'prescriptionRecord',entry});
  if(box)await dispatch({type:'editBox',id:box.id,patch:{prescription:{...box.prescription,...perEye}}});
  setSavedId(entry.id);setNotice(`${formatDate(date)} tarihli ${kind==='lens'?'lens':'gözlük'} numarası reçete geçmişine ${editing?'güncellendi':'eklendi'}${box?`; “${box.name}” kutusunun numarası da güncellendi`:''}.`);
  reset();
 };
 const startBackdated=()=>{reset();setNotice(null);scrollRef.current?.scrollTo({y:0,animated:true});setOpenDate(n=>n+1);};
 const newestLens=state.prescriptionHistory.filter(e=>e.kind==='lens'&&e.id!==editing).map(e=>e.date).sort().at(-1);
 const selectedBox=state.boxes.find(b=>b.id===selectedBoxId);
 const edit=(entry:PrescriptionRecord)=>{setNotice(null);scrollRef.current?.scrollTo({y:0,animated:true});setEditing(entry.id);setApplyToBox(false);setKind(entry.kind);setDate(entry.date);const first=entry.eyes[0]??'right';setEye(entry.eyes.length===2?'both':first);const left=entry.values.left??{},right=entry.values.right??{};const separate=entry.eyes.length===2&&JSON.stringify(left)!==JSON.stringify(right);setSeparateNumbers(separate);setActiveRxEye(first);const vals=separate?Object.fromEntries([...new Set([...Object.keys(left),...Object.keys(right)])].flatMap(k=>[[`left-${k}`,left[k]??''],[`right-${k}`,right[k]??'']])):{...entry.values[first]};setValues(vals);setShowAdvanced(fieldsFor(entry.kind).some(k=>!['PWR','SPH'].includes(k)&&Boolean((vals as Record<string,string>)[k]|| (vals as Record<string,string>)[`right-${k}`] || (vals as Record<string,string>)[`left-${k}`])));};
 // Newest date first; same-day records keep the most recently added on top.
 const sorted=state.prescriptionHistory.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
 return <Screen title="Göz numaralarım" subtitle="İstersen numaralarını ekle. Bu bilgiler olmadan lens takibini kullanabilirsin." back scrollRef={scrollRef}>
  <Card style={{borderRadius:8}}><View style={{flexDirection:'row',alignItems:'center',gap:10}}><Ionicons name="glasses-outline" size={26} color="#0754C8"/><Copy size={17} bold>Numara bilgilerini girmek ister misin?</Copy></View><Copy size={14} muted>İsteğe bağlıdır. Bilmiyorsan boş bırakabilir veya daha sonra ekleyebilirsin. Lens ve gözlük reçeteleri ayrı kaydedilir. Eski bir reçeteyi de ekleyebilirsin: reçete tarihini geçmiş bir güne ayarla.</Copy>{editing&&<Copy size={14} bold style={{color:'#0754C8'}}>Kayıtlı bir reçeteyi düzenliyorsun.</Copy>}
   <SegmentedControl label="Numara türü" selected={kind} onChange={value=>setKind(value as 'lens'|'glasses')} options={[{value:'lens',title:'Lens numarası'},{value:'glasses',title:'Gözlük numarası'}]}/>
   <DateField label="Reçete tarihi" compact value={date} onChange={setDate} onValidityChange={setDateValid} openRequest={openDate}/>
   <Copy bold>Hangi göz?</Copy><SegmentedControl label="Göz" selected={eye} onChange={value=>chooseEye(value as 'both'|Eye)} options={[{value:'both',title:'Sağ ve sol'},{value:'right',title:'Sağ'},{value:'left',title:'Sol'}]}/>{eye==='both'&&<SegmentedControl label="Numaralar" selected={separateNumbers?'different':'same'} onChange={value=>{const separate=value==='different';setValues(prev=>separate?Object.fromEntries(fields.flatMap(k=>[[`right-${k}`,prev[`right-${k}`]??prev[k]??''],[`left-${k}`,prev[`left-${k}`]??prev[k]??'']])):Object.fromEntries(fields.map(k=>[k,prev[k]??prev[`right-${k}`]??prev[`left-${k}`]??''])));setSeparateNumbers(separate);}} options={[{value:'same',title:'İki göz aynı'},{value:'different',title:'Sağ ve sol farklı'}]}/>}<Copy size={14} muted>Numara bilgisi isteğe bağlı. Bilmediğin alanları boş bırakabilirsin.</Copy>
   {separateNumbers&&eye==='both'&&<SegmentedControl label="Düzenlenecek göz" selected={activeRxEye} onChange={value=>setActiveRxEye(value as Eye)} options={[{value:'right',title:'Sağ göz'},{value:'left',title:'Sol göz'}]}/>}
   {(()=>{const storageKey=split?`${activeRxEye}-${primaryField}`:primaryField;return <Field label={`${prefix}${kind==='lens'?'Lens gücü (PWR)':'Göz numarası (SPH)'} · isteğe bağlı`} placeholder="örn. -2.50" signed value={values[storageKey]??''} onChange={v=>setValues(prev=>({...prev,[storageKey]:v}))}/>})()}
   {fields.length>1&&<Chip title={showAdvanced?'Diğer ölçüleri gizle':'Diğer ölçüler · isteğe bağlı'} selected={showAdvanced} onPress={()=>setShowAdvanced(!showAdvanced)}/>}{showAdvanced&&fields.filter(k=>k!==primaryField).map(key=>{const labels:Record<string,string>={PWR:'Lens gücü',SPH:'Lens numarası',CYL:'Astigmat numarası',AXIS:'Astigmat yönü',ADD:'Yakın ek numarası',BC:'Lens eğrisi',DIA:'Lens çapı'};const storageKey=split?`${activeRxEye}-${key}`:key;return <Field key={storageKey} label={`${prefix}${labels[key]} · isteğe bağlı`} signed value={values[storageKey]??''} onChange={v=>setValues(prev=>({...prev,[storageKey]:v}))}/>})}
   {kind==='lens'&&state.boxes.length>0&&<View style={{gap:8}}><Copy bold>Bu reçete lens kutusunu etkilesin mi?</Copy>
    <View accessibilityRole="radiogroup" accessibilityLabel="Reçetenin kutuya etkisi" style={{gap:8}}>
     <ChoiceCard title="Yalnızca reçete geçmişine kaydet" detail="Kutulara ve paketlere dokunulmaz. Numara yalnızca aşağıdaki tarihli reçete geçmişinde görünür." meta="Önerilen · hiçbir kaydı değiştirmez" selected={!applyToBox} onPress={()=>setApplyToBox(false)}/>
     <ChoiceCard title="Kutunun numarasını güncelle" detail="Reçete geçmişe de kaydedilir. Seçtiğin kutunun numarası değişir ve bu numara o kutudan bundan sonra açacağın paketlerde kullanılır." meta="Açık paketler ve geçmiş günler eski numarayı göstermeye devam eder." selected={applyToBox} onPress={()=>setApplyToBox(true)}/>
    </View>
    {applyToBox&&<><Copy bold>Hangi kutu güncellensin?</Copy><View accessibilityRole="radiogroup" accessibilityLabel="Güncellenecek kutu" style={{gap:8}}>{state.boxes.map(box=><ChoiceCard key={box.id} title={box.name} detail={`${durationLabel(box.durationDays)} · ${box.eyes.length===2?'iki göz':box.eyes[0]==='right'?'sağ göz':'sol göz'}${box.brand?` · ${box.brand}`:''}`} meta={`Kutuda ${box.lensesRemaining} lens kaldı`} selected={selectedBoxId===box.id} onPress={()=>setSelectedBoxId(box.id)}/>)}</View>
     {selectedBox&&eyes.some(e=>!selectedBox.eyes.includes(e))&&<Copy size={14} style={{color:'#9F5030'}}>Bu kutu yalnızca {selectedBox.eyes[0]==='right'?'sağ':'sol'} göz için. Diğer gözün numarası da kutuya yazılır; gerekirse göz seçimini değiştir.</Copy>}
     {!!newestLens&&date<newestLens&&<Copy size={14} style={{color:'#9F5030'}}>Bu reçete, kayıtlı en yeni lens reçetesinden ({formatDate(newestLens)}) daha eski. Kutunun numarası yine de bu eski değerle değişir; açık paketlerin ve geçmiş günlerin kayıtları değişmez.</Copy>}</>}
   </View>}
   <Button title={editing?'Numarayı güncelle':'Numarayı kaydet'} icon="save-outline" onPress={save}/>{!!notice&&<View accessibilityLiveRegion="polite" style={{flexDirection:'row',gap:8,alignItems:'flex-start'}}><Ionicons name="checkmark-circle" size={18} color="#1F7A4D"/><Copy size={14} bold style={{flex:1,color:'#1F5F3F'}}>{notice}</Copy></View>}{editing&&<Button title="Düzenlemeyi iptal et" secondary onPress={reset}/>}
  </Card>
  <Copy size={18} bold>Kayıtlı lens kutularındaki numaralar</Copy>{state.boxes.length===0?<Copy size={14} muted>Kutu bilgisi henüz yok.</Copy>:state.boxes.map(box=><Card key={box.id} style={{borderRadius:8}}><Copy bold>{box.name}{box.brand?` · ${box.brand}`:''}</Copy>{(['left','right'] as const).map(e=>{const rx=box.prescription[e]??{};return Object.keys(rx).length?<Copy key={e} size={14}>{e==='right'?'Sağ':'Sol'}: {Object.entries(rx).map(([k,v])=>`${k} ${v}`).join(' · ')}</Copy>:null})}{!!box.prescription.color&&<Copy size={14}>Renk: {box.prescription.color}</Copy>}</Card>)}
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}><Copy size={18} bold>Reçete geçmişi</Copy>{sorted.length>0&&<Chip title="+ Geçmişe ekle" onPress={startBackdated}/>}</View>{sorted.length===0?<Card style={{borderRadius:8,borderStyle:'dashed',gap:10}}><Copy muted>Henüz tarihli numara kaydı yok. Kayıt eklemek zorunlu değil.</Copy><Copy size={14} muted>Elinde eski bir reçete varsa tarihini seçip ekleyebilirsin; liste en yeni tarihten eskiye sıralanır.</Copy><Button title="Geçmişe reçete ekle" secondary icon="time-outline" onPress={startBackdated}/></Card>:sorted.map(entry=><Card key={entry.id} style={{borderRadius:8,...(entry.id===savedId?{borderColor:'#0754C8',borderWidth:2}:null)}}><Copy bold>{entry.kind==='lens'?'Lens numarası':'Gözlük numarası'} · {formatDate(entry.date)}{entry.id===savedId?'  · Yeni kaydedildi':''}</Copy>{entry.eyes.map(e=><Copy key={e} size={14}>{e==='right'?'Sağ':'Sol'}: {Object.entries(entry.values[e]??{}).map(([k,v])=>`${k} ${v}`).join(' · ')}</Copy>)}<View style={styles.wrap}><Chip title="Düzenle" onPress={()=>edit(entry)}/><Chip title="Sil" onPress={()=>Alert.alert('Numarayı sil', 'Bu tarihli reçete kaydını silmek istiyor musun?', [{text:'Vazgeç',style:'cancel'},{text:'Sil',style:'destructive',onPress:()=>dispatch({type:'deletePrescriptionRecord',id:entry.id})}])}/></View></Card>)}
 </Screen>;
}

import React,{useState} from 'react';
import {View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Button,ChoiceCard,Chip,Copy,Field,Screen,SegmentedControl,styles,useColors} from '../../src/components/ui';
import {DateField} from '../../src/components/DateField';
import {useApp,uid} from '../../src/state/AppContext';
import {addDays,DURATION_OPTIONS,durationLabel,formatDate,isWithinEntryWindow} from '../../src/domain/dates';
import type {Eye,LensBox} from '../../src/domain/types';
import type {PackageSource} from '../../src/domain/reducer';

type LensType=LensBox['lensType'];
type Slot={eyes:Eye[];boxId:string;name:string;brand:string;count:string;type:LensType;wantsNumbers:boolean;separateNumbers:boolean;values:Record<string,string>};
const typeNames:Record<LensType,string>={spherical:'Küresel',toric:'Torik',multifocal:'Multifokal',colored:'Renkli'};
const rxFields=(type:LensType)=>type==='spherical'?['PWR · lens gücü','BC · lens eğrisi','DIA · lens çapı']:type==='toric'?['SPH · lens numarası','CYL · astigmat numarası','AXIS · astigmat yönü','BC · lens eğrisi','DIA · lens çapı']:type==='multifocal'?['SPH · lens numarası','ADD · yakın ek numarası','BC · lens eğrisi','DIA · lens çapı']:['Renk','PWR · lens gücü','BC · lens eğrisi','DIA · lens çapı'];
const keyOf=(field:string)=>field.split(' ·')[0]!;
const eyeName=(eye:Eye)=>eye==='right'?'Sağ':'Sol';
const emptySlot=(eyes:Eye[],boxId:string):Slot=>({eyes,boxId,name:'',brand:'',count:'6',type:'spherical',wantsNumbers:false,separateNumbers:false,values:{}});

function rxFor(slot:Slot,side:Eye){
 const twoEyes=slot.eyes.length===2;
 return Object.fromEntries(rxFields(slot.type).filter(f=>f!=='Renk').map(f=>{const key=keyOf(f);return [key,(twoEyes&&slot.separateNumbers?slot.values[`${side}-${key}`]:slot.values[key])??''];}).filter(([,v])=>String(v).trim()));
}

function SlotForm({slot,onChange,title}:{slot:Slot;onChange:(next:Slot)=>void;title?:string}){
 const {state}=useApp();const t=useColors();
 const available=state.boxes.filter(b=>slot.eyes.every(e=>b.eyes.includes(e)));
 const set=(patch:Partial<Slot>)=>onChange({...slot,...patch});
 const twoEyes=slot.eyes.length===2;const fields=rxFields(slot.type);
 return <View style={{gap:12}}>
  {title&&<Copy bold size={18}>{title}</Copy>}
  {available.length>0&&<><Copy bold>Kayıtlı kutularından seç</Copy>
  <View accessibilityRole="radiogroup" accessibilityLabel={title?`${title}: kayıtlı kutular`:'Kayıtlı kutular'} style={{gap:8}}>{available.map(b=>{const short=b.lensesRemaining<slot.eyes.length;return <ChoiceCard key={b.id} title={b.name} detail={`${typeNames[b.lensType]} · ${durationLabel(b.durationDays)}${b.brand?` · ${b.brand}`:''}`} meta={short?`Kutuda ${b.lensesRemaining} lens kaldı · bu paket için yetmez`:`Kutuda ${b.lensesRemaining} lens kaldı · ${b.eyes.length===2?'iki göz':`${eyeName(b.eyes[0]!)} göz`}`} selected={slot.boxId===b.id} onPress={()=>set({boxId:b.id})}/>;})}</View>
  {slot.boxId!=='new'&&!!slot.boxId&&<Button title="Seçili kutuyu düzenle" secondary icon="create-outline" onPress={()=>router.push({pathname:'/box/[id]',params:{id:slot.boxId}})}/>}
  <View style={{flexDirection:'row',alignItems:'center',gap:10,marginTop:2}}><View style={{flex:1,height:1,backgroundColor:t.border}}/><Copy size={13} muted>veya</Copy><View style={{flex:1,height:1,backgroundColor:t.border}}/></View></>}
  <ChoiceCard variant="add" title="Yeni kutu ekle" detail={slot.boxId==='new'?'Kutu bilgilerini aşağıya gir.':'Elindeki kutu listede yoksa seç; bilgileri sonra girersin.'} selected={slot.boxId==='new'} onPress={()=>set({boxId:'new'})}/>
  {slot.boxId==='new'&&<View style={{gap:12,padding:14,borderRadius:14,borderWidth:1,borderColor:'#C6DCF6',backgroundColor:'#F7FBFF'}}>
   <Copy bold size={16}>Yeni kutu bilgileri</Copy>
   <Copy bold>Lens türü</Copy>
   <View style={styles.wrap}>{(Object.keys(typeNames) as LensType[]).map(v=><Chip key={v} title={typeNames[v]} selected={slot.type===v} onPress={()=>set({type:v})}/>)}</View>
   <Field label="Kutu adı" value={slot.name} onChange={name=>set({name})}/>
   <Field label="Marka · isteğe bağlı" value={slot.brand} onChange={brand=>set({brand})}/>
   <Field label="Kutudaki lens sayısı" numeric value={slot.count} onChange={count=>set({count})}/>
   <Copy muted size={14}>Yeni kutuda başlangıç adedi 6. Kutunda farklıysa değiştir.</Copy>
   <View style={{padding:14,borderWidth:1,borderColor:t.border,borderRadius:14,gap:10,backgroundColor:t.surface}}>
    <Copy bold>Numara bilgisi (isteğe bağlı)</Copy>
    <Copy muted size={14}>Kutunun üzerinde yazan değerleri girebilirsin. Bilmiyorsan boş bırak.</Copy>
    <SegmentedControl label="Lens numarası girişi" selected={slot.wantsNumbers?'yes':'no'} onChange={v=>set({wantsNumbers:v==='yes'})} options={[{value:'yes',title:'Girmek istiyorum'},{value:'no',title:'Şimdi geç'}]}/>
    {slot.wantsNumbers&&<>
     {twoEyes&&<SegmentedControl label="Sağ ve sol lens numaraları" selected={slot.separateNumbers?'different':'same'} onChange={value=>{
      const separate=value==='different';const prev=slot.values;
      const values=separate?Object.fromEntries(fields.flatMap(f=>{const k=keyOf(f);return [[`right-${k}`,prev[`right-${k}`]??prev[k]??''],[`left-${k}`,prev[`left-${k}`]??prev[k]??''],[k,prev[k]??'']];})):Object.fromEntries(fields.map(f=>{const k=keyOf(f);return [k,prev[k]||prev[`right-${k}`]||prev[`left-${k}`]||''];}));
      set({separateNumbers:separate,values});
     }} options={[{value:'same',title:'İki göz aynı'},{value:'different',title:'Farklı'}]}/>}
     {fields.map(f=>{const key=keyOf(f);const setValue=(k:string)=>(v:string)=>set({values:{...slot.values,[k]:v}});
      if(key==='Renk')return <Field key={key} label="Renk · isteğe bağlı" value={slot.values[key]??''} onChange={setValue(key)}/>;
      if(twoEyes&&slot.separateNumbers)return <View key={key} style={{gap:6}}><Field signed label={`Sağ · ${f}`} value={slot.values[`right-${key}`]??''} onChange={setValue(`right-${key}`)}/><Field signed label={`Sol · ${f}`} value={slot.values[`left-${key}`]??''} onChange={setValue(`left-${key}`)}/></View>;
      return <Field key={key} signed label={`${twoEyes?'':`${eyeName(slot.eyes[0]!)} · `}${f}`} value={slot.values[key]??''} onChange={setValue(key)}/>;
     })}
    </>}
   </View>
  </View>}
 </View>;
}

export default function NewPackage(){
 const params=useLocalSearchParams<{eye?:Eye}>();const {state,dispatch,today}=useApp();
 // Preselect a box that can serve this package; with no matching box the new-box form opens. If boxes exist but none has enough lenses, nothing is preselected.
 const firstFor=(eyes:Eye[])=>{const matching=state.boxes.filter(b=>eyes.every(e=>b.eyes.includes(e)));return matching.find(b=>b.lensesRemaining>=eyes.length)?.id??(matching.length?'':'new');};
 const [eye,setEye]=useState<'both'|Eye>(params.eye??'both');
 const [separateBoxes,setSeparateBoxes]=useState(false);
 const [shared,setShared]=useState<Slot>(()=>emptySlot(params.eye?[params.eye]:['right','left'],firstFor(params.eye?[params.eye]:['right','left'])));
 const [rightSlot,setRightSlot]=useState<Slot>(()=>emptySlot(['right'],firstFor(['right'])));
 const [leftSlot,setLeftSlot]=useState<Slot>(()=>emptySlot(['left'],firstFor(['left'])));
 const [days,setDays]=useState('30');const [custom,setCustom]=useState(false);const [opened,setOpened]=useState(today);
 const chooseEye=(value:'both'|Eye)=>{setEye(value);const eyes:Eye[]=value==='both'?['right','left']:[value];
  // Values typed for another eye selection never carry over silently.
  setShared(prev=>({...emptySlot(eyes,firstFor(eyes)),type:prev.type,name:prev.name,brand:prev.brand,count:prev.count}));if(value!=='both')setSeparateBoxes(false);};
 const slots:Slot[]=eye==='both'&&separateBoxes?[rightSlot,leftSlot]:[shared];
 const needsDuration=slots.some(s=>s.boxId==='new');
 const existingDurations=slots.filter(s=>s.boxId!=='new').map(s=>state.boxes.find(b=>b.id===s.boxId)?.durationDays).filter((d):d is number=>!!d);
 const save=async()=>{
  if(!isWithinEntryWindow(opened,today))throw new Error(`Paket açılış tarihi ${formatDate(addDays(today,-30))} ile ${formatDate(today)} arasında olmalı.`);
  const dayCount=Number(days);if(needsDuration&&(!Number.isInteger(dayCount)||dayCount<1||dayCount>365))throw new Error('Kullanım süresini 1–365 gün arasında gir.');
  const eyes:Eye[]=eye==='both'?['right','left']:[eye];
  const sourceFor=new Map<Eye,PackageSource>();
  for(const slot of slots){
   let source:PackageSource;
   if(!slot.boxId)throw new Error('Kayıtlı bir kutu seç veya “Yeni kutu ekle”yi seç.');
   if(slot.boxId==='new'){
    const qty=Number(slot.count);if(!Number.isInteger(qty)||qty<slot.eyes.length)throw new Error('Kutudaki lens sayısını kontrol et.');
    const prescription={right:slot.wantsNumbers&&slot.eyes.includes('right')?rxFor(slot,'right'):{},left:slot.wantsNumbers&&slot.eyes.includes('left')?rxFor(slot,'left'):{},color:slot.wantsNumbers&&slot.type==='colored'?slot.values.Renk??'':''};
    source={newBox:{id:uid(),name:slot.name.trim()||slot.brand.trim()||(slot.eyes.length===1?`${eyeName(slot.eyes[0]!)} göz kutum`:'Lens kutum'),brand:slot.brand.trim(),lensType:slot.type,durationDays:dayCount,lensesTotal:qty,lensesRemaining:qty,eyes:[...slot.eyes],prescription}};
   } else {
    const box=state.boxes.find(b=>b.id===slot.boxId);if(!box)throw new Error('Seçilen kutu bulunamadı.');
    if(box.lensesRemaining<slot.eyes.length)throw new Error(`“${box.name}” kutusunda yeterli lens yok. Yeni kutu ekle.`);
    source={boxId:box.id};
   }
   for(const e of slot.eyes)sourceFor.set(e,source);
  }
  await dispatch({type:'openPackages',ids:eyes.map(()=>uid()),boxes:eyes.map(e=>sourceFor.get(e)!),eyes,date:opened,...(needsDuration?{durationDays:dayCount}:{}),...(eyes.length===2?{pairId:uid()}:{})});
  if(opened<today)router.replace({pathname:'/days',params:{date:opened,selectMultiple:'1'}});else router.replace('/(tabs)');
 };
 return <Screen title="Yeni paket" subtitle="Lens kutunu açtığın gün sayaç başlar." back>
  <Copy bold>Göz</Copy>
  <SegmentedControl label="Paket açılacak göz" selected={eye} onChange={value=>chooseEye(value as 'both'|Eye)} options={[{value:'both',title:'İkisi'},{value:'right',title:'Sağ'},{value:'left',title:'Sol'}]}/>
  {eye==='both'&&<><Copy bold>Kutu</Copy><SegmentedControl label="Kutu seçimi" selected={separateBoxes?'separate':'shared'} onChange={v=>setSeparateBoxes(v==='separate')} options={[{value:'shared',title:'Tek kutu'},{value:'separate',title:'Her göze ayrı'}]}/></>}
  {eye==='both'&&separateBoxes?<><SlotForm title="Sağ göz kutusu" slot={rightSlot} onChange={setRightSlot}/><SlotForm title="Sol göz kutusu" slot={leftSlot} onChange={setLeftSlot}/></>:<SlotForm title={eye==='both'?undefined:'Kutu'} slot={shared} onChange={setShared}/>}
  {needsDuration?<><Copy bold>Kullanım süresi</Copy><View style={styles.wrap}>{DURATION_OPTIONS.map(([n,label])=><Chip key={n} title={label} selected={!custom&&days===String(n)} onPress={()=>{setCustom(false);setDays(String(n));}}/>)}<Chip title="Özel" selected={custom} onPress={()=>setCustom(true)}/></View>{custom&&<Field label="Özel kullanım süresi · gün" numeric value={days} onChange={setDays}/>}</>
   :<Copy muted>Kullanım süresi kutudan alınır: {[...new Set(existingDurations.map(durationLabel))].join(' · ')}.</Copy>}
  <DateField label="Lens kutusunu açtığın tarih" value={opened} onChange={setOpened}/>
  <Copy size={14} muted>En fazla 30 gün öncesini seçebilirsin. Eski bir tarih seçersen kayıttan sonra o günleri takvimde işaretleyebilirsin.</Copy>
  <Button title="Kutuyu açtım · takibi başlat" icon="eye-outline" onPress={save}/>
 </Screen>;
}

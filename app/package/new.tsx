import React,{useState} from 'react';
import {View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Button,ChoiceCard,Copy,Field,Screen,SegmentedControl,useColors} from '../../src/components/ui';
import {DurationPicker,LensTypePicker,NumberGrid,numberKeys,typeNames} from '../../src/components/LensForm';
import {DateField} from '../../src/components/DateField';
import {useApp,uid} from '../../src/state/AppContext';
import {addDays,durationLabel,formatDate,isWithinEntryWindow} from '../../src/domain/dates';
import type {Eye,LensBox} from '../../src/domain/types';
import type {PackageSource} from '../../src/domain/reducer';
import {assertRxValues} from '../../src/domain/rx';

type LensType=LensBox['lensType'];
type Slot={eyes:Eye[];boxId:string;name:string;brand:string;count:string;type:LensType;wantsNumbers:boolean;separateNumbers:boolean;values:Record<string,string>;nameError?:string|null};
const NAME_MISSING='Kutu adı zorunlu. Paketini ayırt etmeni sağlayacak bir ad yaz (ör. “1.5 numara mavi kap”).';
const eyeName=(eye:Eye)=>eye==='right'?'Sağ':'Sol';
const emptySlot=(eyes:Eye[],boxId:string):Slot=>({eyes,boxId,name:'',brand:'',count:'6',type:'spherical',wantsNumbers:false,separateNumbers:false,values:{}});

function rxFor(slot:Slot,side:Eye){
 const twoEyes=slot.eyes.length===2;
 return Object.fromEntries(numberKeys(slot.type).map(key=>[key,((twoEyes&&slot.separateNumbers?slot.values[`${side}-${key}`]:slot.values[key])??'').trim().replace(',','.')]).filter(([,v])=>String(v)));
}

function SlotForm({slot,onChange,title}:{slot:Slot;onChange:(next:Slot)=>void;title?:string}){
 const {state}=useApp();const t=useColors();
 // One box for both eyes lists the boxes made for both. A per-eye slot lists every saved box, so the right and left
 // slots offer the same choices; choosing a box for an eye it was not made for lets it serve that eye too.
 const available=state.boxes.filter(b=>slot.eyes.every(e=>b.eyes.includes(e)));
 const set=(patch:Partial<Slot>)=>onChange({...slot,...patch});
 const twoEyes=slot.eyes.length===2;
 return <View style={{gap:12}}>
  {title&&<Copy bold size={18}>{title}</Copy>}
  {available.length>0&&<><Copy bold>Kayıtlı kutularından seç</Copy>
  <View accessibilityRole="radiogroup" accessibilityLabel={title?`${title}: kayıtlı kutular`:'Kayıtlı kutular'} style={{gap:8}}>{available.map(b=>{const short=b.lensesRemaining<slot.eyes.length;return <ChoiceCard key={b.id} title={b.name} detail={`${typeNames[b.lensType]} · ${durationLabel(b.durationDays)}${b.brand?` · ${b.brand}`:''}`} meta={short?`Kutuda ${b.lensesRemaining} lens kaldı · bu paket için yetmez`:`Kutuda ${b.lensesRemaining} lens kaldı · ${b.eyes.length===2?'iki göz':`${eyeName(b.eyes[0]!)} göz`}`} selected={slot.boxId===b.id} onPress={()=>set({boxId:b.id})}/>;})}</View>
  {slot.boxId!=='new'&&!!slot.boxId&&<Button title="Seçili kutuyu düzenle" secondary icon="create-outline" onPress={()=>router.push({pathname:'/box/[id]',params:{id:slot.boxId}})}/>}
  <View style={{flexDirection:'row',alignItems:'center',gap:10,marginTop:2}}><View style={{flex:1,height:1,backgroundColor:t.border}}/><Copy size={13} muted>veya</Copy><View style={{flex:1,height:1,backgroundColor:t.border}}/></View></>}
  <ChoiceCard variant="add" title="Yeni kutu ekle" detail={slot.boxId==='new'?'Kutu bilgilerini aşağıya gir.':'Elindeki kutu listede yoksa seç; bilgileri sonra girersin.'} selected={slot.boxId==='new'} onPress={()=>set({boxId:'new'})}/>
  {slot.boxId==='new'&&<View style={{gap:12,padding:14,borderRadius:16,borderWidth:1,borderColor:'#C6DCF6',backgroundColor:'#F7FBFF'}}>
   <Copy bold size={16}>Yeni kutu bilgileri</Copy>
   <Field label="Kutu adı" tag={{text:'Zorunlu',required:true}} value={slot.name} onChange={name=>set({name,...(name.trim()?{nameError:null}:{})})} placeholder="Örn. 1.5 numara mavi kap" error={slot.nameError}/>
   <Field label="Marka" tag={{text:'İsteğe bağlı'}} value={slot.brand} onChange={brand=>set({brand})} placeholder="Örn. kutunun üzerindeki marka"/>
   <Field label="Kutudaki lens sayısı" numeric value={slot.count} onChange={count=>set({count})}/>
   <Copy muted size={14}>Yeni kutuda başlangıç adedi 6. Kutunda farklıysa değiştir.</Copy>
   <View style={{padding:14,borderWidth:1,borderColor:t.border,borderRadius:16,gap:10,backgroundColor:t.surface}}>
    <View style={{gap:2}}><Copy bold>Numara bilgisi</Copy><Copy muted size={14}>İsteğe bağlı. Kutunun üzerinde yazan değerleri girebilirsin; bilmiyorsan boş bırak.</Copy></View>
    <View style={{gap:8}}><Copy bold size={14}>Lens türü</Copy><LensTypePicker type={slot.type} onChange={type=>set({type})}/></View>
    <View style={{height:1,backgroundColor:t.border}}/>
    <Copy bold size={14}>Numara değerleri</Copy>
    <SegmentedControl label="Lens numarası girişi" selected={slot.wantsNumbers?'yes':'no'} onChange={v=>set({wantsNumbers:v==='yes'})} options={[{value:'yes',title:'Numara gir'},{value:'no',title:'Şimdi geç'}]}/>
    {slot.wantsNumbers&&<>
     {twoEyes&&<SegmentedControl label="Sağ ve sol lens numaraları" selected={slot.separateNumbers?'different':'same'} onChange={value=>{
      const separate=value==='different';const prev=slot.values;const keys=numberKeys(slot.type);
      const values=separate?{...Object.fromEntries(keys.flatMap(k=>[[`right-${k}`,prev[`right-${k}`]??prev[k]??''],[`left-${k}`,prev[`left-${k}`]??prev[k]??''],[k,prev[k]??'']])),Renk:prev.Renk??''}:{...Object.fromEntries(keys.map(k=>[k,prev[k]||prev[`right-${k}`]||prev[`left-${k}`]||''])),Renk:prev.Renk??''};
      set({separateNumbers:separate,values});
     }} options={[{value:'same',title:'İki göz aynı'},{value:'different',title:'Farklı'}]}/>}
     <NumberGrid type={slot.type} eyes={slot.eyes} separate={twoEyes&&slot.separateNumbers} values={slot.values} onChange={(k,v)=>set({values:{...slot.values,[k]:v}})}/>
    </>}
   </View>
  </View>}
 </View>;
}

export default function NewPackage(){
 const params=useLocalSearchParams<{eye?:Eye}>();const {state,dispatch,today}=useApp();
 // Preselect a box that can serve this package; with no matching box the new-box form opens. If boxes exist but none has enough lenses, nothing is preselected.
 const firstFor=(eyes:Eye[])=>{const matching=state.boxes.filter(b=>eyes.every(e=>b.eyes.includes(e)));return matching.find(b=>b.lensesRemaining>=eyes.length)?.id??(matching.length?'':'new');};
 /** Per-eye slots start from the same box list; the first box that still has a lens (made for this eye first). */
 const firstForEye=(eye:Eye)=>{const usable=state.boxes.filter(b=>b.lensesRemaining>=1);return (usable.find(b=>b.eyes.includes(eye))??usable[0])?.id??(state.boxes.length?'':'new');};
 // Both eyes by default. The person can switch to one eye and replace only that eye's active package.
 const [eye,setEye]=useState<'both'|Eye>(()=>params.eye==='right'||params.eye==='left'?params.eye:'both');
 const [tracking,setTracking]=useState<'box'|'unboxed'>('box');
 const [separateBoxes,setSeparateBoxes]=useState(false);
 const [shared,setShared]=useState<Slot>(()=>emptySlot(['right','left'],firstFor(['right','left'])));
 const [rightSlot,setRightSlot]=useState<Slot>(()=>emptySlot(['right'],firstForEye('right')));
 const [leftSlot,setLeftSlot]=useState<Slot>(()=>emptySlot(['left'],firstForEye('left')));
 const [days,setDays]=useState('30');const [custom,setCustom]=useState(false);const [opened,setOpened]=useState(today);
 const slots:Slot[]=eye==='both'?(separateBoxes?[rightSlot,leftSlot]:[shared]):[eye==='right'?rightSlot:leftSlot];
 const needsDuration=tracking==='unboxed'||slots.some(s=>s.boxId==='new');
 const existingDurations=slots.filter(s=>s.boxId!=='new').map(s=>state.boxes.find(b=>b.id===s.boxId)?.durationDays).filter((d):d is number=>!!d);
 const save=async()=>{
  if(!isWithinEntryWindow(opened,today))throw new Error(`Paket açılış tarihi ${formatDate(addDays(today,-30))} ile ${formatDate(today)} arasında olmalı.`);
  const dayCount=Number(days);if(needsDuration&&(!Number.isInteger(dayCount)||dayCount<1||dayCount>365))throw new Error('Kullanım süresini 1–365 gün arasında gir.');
  const eyes:Eye[]=eye==='both'?['right','left']:[eye];
  if(tracking==='unboxed'){
   await dispatch({type:'openPackages',ids:eyes.map(()=>uid()),eyes,date:opened,durationDays:dayCount,unboxed:true,...(eyes.length===2?{pairId:uid()}:{})});
   router.replace(opened<today?{pathname:'/(tabs)',params:{mark:opened}}:'/(tabs)');return;
  }
  const unnamed=slots.filter(s=>s.boxId==='new'&&!s.name.trim());
  if(unnamed.length){for(const slot of unnamed){const update={...slot,nameError:NAME_MISSING};if(slot===rightSlot)setRightSlot(update);else if(slot===leftSlot)setLeftSlot(update);else setShared(update);}return;}
  const sourceFor=new Map<Eye,PackageSource>();
  for(const slot of slots){
   let source:PackageSource;
   if(!slot.boxId)throw new Error('Kayıtlı bir kutu seç veya “Yeni kutu ekle”yi seç.');
   if(slot.boxId==='new'){
    if(slot.wantsNumbers)assertRxValues(Object.fromEntries(Object.entries(slot.values).filter(([k])=>k!=='Renk')));
    const qty=Number(slot.count);if(!Number.isInteger(qty)||qty<slot.eyes.length)throw new Error(slot.eyes.length===2?'Kutudaki lens sayısını kontrol et. İki göz için en az 2 lens gerekir.':'Kutudaki lens sayısını kontrol et; en az 1 olmalı.');
    const prescription={right:slot.wantsNumbers&&slot.eyes.includes('right')?rxFor(slot,'right'):{},left:slot.wantsNumbers&&slot.eyes.includes('left')?rxFor(slot,'left'):{},color:slot.wantsNumbers&&slot.type==='colored'?(slot.values.Renk??'').trim():''};
    source={newBox:{id:uid(),name:slot.name.trim(),brand:slot.brand.trim(),lensType:slot.type,durationDays:dayCount,lensesTotal:qty,lensesRemaining:qty,eyes:[...slot.eyes],prescription}};
   } else {
    const box=state.boxes.find(b=>b.id===slot.boxId);if(!box)throw new Error('Seçilen kutu bulunamadı.');
    if(box.lensesRemaining<slot.eyes.length)throw new Error(`“${box.name}” kutusunda yeterli lens yok. Yeni kutu ekle.`);
    source={boxId:box.id};
   }
   for(const e of slot.eyes)sourceFor.set(e,source);
  }
  await dispatch({type:'openPackages',ids:eyes.map(()=>uid()),boxes:eyes.map(e=>sourceFor.get(e)!),eyes,date:opened,...(needsDuration?{durationDays:dayCount}:{}),...(eyes.length===2?{pairId:uid()}:{})});
  router.replace(opened<today?{pathname:'/(tabs)',params:{mark:opened}}:'/(tabs)');
 };
 return <Screen title="Yeni paket" subtitle={tracking==='unboxed'?'Kullanım süresini seç, takibi başlat.':'Lens kutunu açtığın gün sayaç başlar.'} back>
  <Copy bold>Yeni paket hangi göz için?</Copy>
  <SegmentedControl label="Yeni paket açılacak gözler" selected={eye} onChange={value=>setEye(value as 'both'|Eye)} options={[{value:'both',title:'İki göz'},{value:'right',title:'Sağ göz'},{value:'left',title:'Sol göz'}]}/>
  <Copy bold>Paket takibi</Copy>
  <SegmentedControl label="Kutu kullanımı" selected={tracking} onChange={value=>setTracking(value as 'box'|'unboxed')} options={[{value:'box',title:'Kutudan seç'},{value:'unboxed',title:'Kutusuz takip'}]}/>
  {eye!=='both'&&state.packages.some(p=>p.eye!==(eye==='right'?'right':'left')&&!p.closedOn)&&<Copy size={14} muted>Diğer gözdeki açık paket devam eder. Bu yeni paket yalnızca {eyeName(eye).toLocaleLowerCase('tr-TR')} göz için açılır.</Copy>}
  {tracking==='box'&&<>{eye==='both'&&<><Copy bold>Kutu düzeni</Copy><SegmentedControl label="İki göz için kutu seçimi" selected={separateBoxes?'separate':'shared'} onChange={v=>setSeparateBoxes(v==='separate')} options={[{value:'shared',title:'Aynı kutu'},{value:'separate',title:'Ayrı kutular'}]}/></>}
  {eye==='both'&&separateBoxes?<><SlotForm title="Sağ göz kutusu" slot={rightSlot} onChange={setRightSlot}/><SlotForm title="Sol göz kutusu" slot={leftSlot} onChange={setLeftSlot}/></>:eye==='both'?<SlotForm title="İki göz için kutu" slot={shared} onChange={setShared}/>:<SlotForm title={`${eyeName(eye)} göz kutusu`} slot={eye==='right'?rightSlot:leftSlot} onChange={eye==='right'?setRightSlot:setLeftSlot}/>}</>}
  {needsDuration?<><Copy bold>Kullanım süresi</Copy><DurationPicker days={days} custom={custom} onChange={(d,c)=>{setDays(d);setCustom(c);}}/></>
   :<Copy muted>Kullanım süresi kutudan alınır: {[...new Set(existingDurations.map(durationLabel))].join(' · ')}.</Copy>}
  <DateField label={tracking==='unboxed'?'Paketi açtığın tarih':'Lens kutusunu açtığın tarih'} value={opened} onChange={setOpened}/>
  <Copy size={14} muted>En fazla 30 gün öncesini seçebilirsin. Eski bir tarih seçersen kayıttan sonra o günleri takvimde işaretleyebilirsin.</Copy>
  {slots.some(s=>s.boxId==='new'&&s.nameError)&&<Copy size={14} style={{color:'#A74447'}}>Kaydetmek için yukarıdaki “Kutu adı” alanını doldur.</Copy>}
  <Button title={tracking==='unboxed'?'Paketi aç · takibi başlat':'Kutuyu açtım · takibi başlat'} icon="eye-outline" onPress={save}/>
 </Screen>;
}

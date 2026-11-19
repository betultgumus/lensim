import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, View, useWindowDimensions, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Copy, Screen,SegmentedControl } from '../../src/components/ui';
import { PressScale } from '../../src/components/PressScale';
import { AmbientBackground } from '../../src/components/AmbientBackground';
import { OwlBadge } from '../../src/components/OwlBadge';
import { useCalmMotion } from '../../src/design/motion';
import { useApp, showError, uid } from '../../src/state/AppContext';
import { unansweredDays } from '../../src/domain/reducer';
import {useHomePager,type HomePage} from '../../src/state/HomePagerContext';
import { useMarkDay } from '../../src/state/useMarkDay';
import { OpeningChoice } from '../../src/components/OpeningChoice';
import { addDays, addMonths, durationLabel as durationName, daysOpen, formatDate, packageMascotLevel, parseDate, shortDate } from '../../src/domain/dates';
import { dayTone, palette } from '../../src/design/dayTone';
import { type LensPackage } from '../../src/domain/types';

const colors = { right:palette.right, left:palette.left, leftText:palette.leftText, ink:palette.ink, warning:palette.warning, danger:palette.danger };
const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));

/** Progress strip: one cell per day up to 30 days, otherwise a continuous bar. Past days without an answer are grey; days still to come are outlined. */
function Progress({pack,duration,checkIns,today,height=9}:{pack:LensPackage;duration:number;checkIns:any[];today:string;height?:number}){
  if(duration>30){const elapsed=daysOpen(pack.openedOn,today);const ratio=Math.min(1,elapsed/duration);return <View accessibilityLabel={`${duration} günün ${elapsed}. günü`} style={{height,borderRadius:height/2,backgroundColor:palette.upcoming,borderWidth:1,borderColor:palette.upcomingBorder,overflow:'hidden'}}><View style={{width:`${ratio*100}%`,height:'100%',backgroundColor:elapsed>duration?colors.danger:colors.right}}/></View>;}
  return <View accessibilityLabel={`${daysOpen(pack.openedOn,today)} gündür açık, ${duration} günlük`} style={{flexDirection:'row',gap:2}}>{Array.from({length:duration},(_,i)=>i+1).map(day=>{const date=addDays(pack.openedOn,day-1);const entry=checkIns.find(c=>c.packageId===pack.id&&c.date===date);const tone=dayTone(entry);const upcoming=!entry&&date>today;return <View key={day} style={{height,flex:1,backgroundColor:entry?tone.fill:upcoming?palette.upcoming:palette.unanswered,borderWidth:upcoming?1:0,borderColor:palette.upcomingBorder,borderRadius:2}}/>;})}</View>;
}

/** Colour key for the progress strip; swatches use exactly the strip's colours. */
function ProgressLegend(){
  const items:Array<{label:string;fill:string;border?:string;dashed?:boolean}>=[{label:'Taktım',fill:palette.right},{label:'Takmadım',fill:palette.left},{label:'Gözlük',fill:palette.glasses},{label:'Cevapsız',fill:palette.unanswered},{label:'Kalan',fill:palette.upcoming,border:palette.upcomingBorder},{label:'Otomatik',fill:'#B9D1F3',border:'#7C93B5',dashed:true}];
  // Always one row: swatch, gaps and text all scale with `size`, so the measured row width is proportional to it
  // and one step from (available / natural width) lands on the size that fits (between 9 and 11.5 px).
  // On very narrow screens where even 9 px does not fit, the row wraps instead of clipping a label.
  const [size,setSize]=useState(11.5);const [wrap,setWrap]=useState(false);const avail=useRef(0);const natural=useRef(0);
  const fit=()=>{if(!avail.current||!natural.current)return;const raw=Math.floor(size*(avail.current/natural.current)*10)/10;const next=clamp(raw,9,11.5);if(Math.abs(next-size)>=.2)setSize(next);else if(!wrap&&raw<9-.05)setWrap(true);};
  return <View accessibilityLabel="Renk açıklaması" onLayout={e=>{avail.current=e.nativeEvent.layout.width;fit();}} style={{alignSelf:'stretch',marginHorizontal:-8,overflow:'hidden',alignItems:'center'}}>
    <View onLayout={e=>{natural.current=e.nativeEvent.layout.width;fit();}} style={{flexDirection:'row',flexWrap:wrap?'wrap':'nowrap',justifyContent:'center',columnGap:size*.55,rowGap:2,maxWidth:wrap?'100%':undefined}}>{items.map(item=><View key={item.label} style={{flexDirection:'row',alignItems:'center',gap:size*.28}}><View style={{width:size*.75,height:size*.75,borderRadius:3,backgroundColor:item.fill,borderWidth:item.border?1:0,borderColor:item.border,borderStyle:item.dashed?'dashed':'solid'}}/><Copy size={size} style={{color:palette.inkSoft,lineHeight:Math.round(size*1.35)}}>{item.label}</Copy></View>)}</View>
  </View>;
}

/** Three grouped numbers under the case: open days, worn days, days left. */
function StatTiles({items,compact=false}:{items:Array<{label:string;value:string;tone?:string;bg?:string;border?:string}>;compact?:boolean}){
  return <View style={{flexDirection:'row',gap:6}}>{items.map(item=><View key={item.label} accessible accessibilityLabel={`${item.label}: ${item.value}`} style={{flex:1,minWidth:0,paddingVertical:compact?2:4,paddingHorizontal:5,borderRadius:12,backgroundColor:item.bg??'#F2F7FE',borderWidth:1,borderColor:item.border??'#DCE8F7',alignItems:'center',gap:1}}><Copy bold size={compact?15:17} style={{color:item.tone??colors.ink,lineHeight:compact?18:20,fontVariant:['tabular-nums']}}>{item.value}</Copy><Copy size={11} style={{color:palette.inkSoft,textAlign:'center',lineHeight:14}}>{item.label}</Copy></View>)}</View>;
}

function CaseSummary({ pack, checkIns, today, compact=false }: { pack:LensPackage; checkIns:any[]; today:string; compact?:boolean }) {
  const {state}=useApp(); const box=state.boxes.find(b=>b.id===pack.boxId); if(!box)return null;
  const duration=pack.durationDaysSnapshot??box.durationDays;const elapsed=daysOpen(pack.openedOn,today);
  const wornDays=new Set(checkIns.filter(c=>c.status==='worn'&&c.date>=pack.openedOn&&c.date<=today).map(c=>c.date)).size;
  const remaining=Math.max(0,duration-elapsed);
  const expired=duration>1&&elapsed>duration;
  const wornThisMonth=new Set(checkIns.filter(c=>c.status==='worn'&&c.date.slice(0,7)===today.slice(0,7)).map(c=>c.date)).size;
  const rx=pack.prescriptionSnapshot??box.prescription;const prescription=Object.entries(rx[pack.eye]??{}).map(([key,value])=>`${key.toUpperCase()} ${value}`).join(' · ');
  const openPackage=state.packages.find(p=>p.id===pack.id);
  return <Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/package/[id]',params:{id:pack.id}})} style={{flex:1,minWidth:0}}>
    <View style={{gap:compact?5:8}}>
      <Copy size={compact?14:16} bold style={{color:expired?colors.danger:colors.ink}}>{duration===1?`${box.lensesRemaining} LENS KALDI`:expired?`SÜRE ${elapsed-duration} GÜN AŞTI`:remaining===0?'BUGÜN SON GÜN':`${remaining} GÜN KALDI`}</Copy>
      {duration>1&&<Progress pack={pack} duration={duration} checkIns={checkIns} today={today} height={compact?7:9}/>}
      <Copy size={compact?15:17} style={{color:colors.ink}}>{duration===1?`Bu ay ${wornThisMonth} gün taktın · Kutuda ${box.lensesRemaining} lens`:`${elapsed} gündür açık · ${wornDays} gün taktın · ${remaining} gün kaldı`}</Copy>
      {!!prescription&&<Copy size={14} mono style={{color:'#405B86'}}>{prescription}</Copy>}
      {!!openPackage?.closedOn&&<Copy muted size={14}>Geçmiş · {shortDate(pack.openedOn)} — {shortDate(openPackage.closedOn)}</Copy>}
    </View>
  </Pressable>;
}

/**
 * Colour of the "Açık gün" tile. It follows the card state so the number reads as a status:
 * blue while the package is fresh, deep amber on a warm tile when the change day is near,
 * red when the period is over. All pairs are above 4.5:1 contrast.
 */
function openDayTone(level:1|2|3){return level===3?{tone:'#B3261E',bg:'#FDECEE',border:'#F3C3C8'}:level===2?{tone:'#8A4B00',bg:'#FFF1DC',border:'#F2CC8F'}:{tone:'#0754C8',bg:'#E8F2FF',border:'#C6DCF6'};}
function durationLabel(days:number){return durationName(days).toLocaleUpperCase('tr-TR');}
function prescriptionText(pack:LensPackage|undefined,boxes:ReturnType<typeof useApp>['state']['boxes']){
  if(!pack)return '';
  const box=boxes.find(b=>b.id===pack.boxId);if(!box)return '';
  const rx=pack.prescriptionSnapshot??box.prescription;const values=Object.entries(rx[pack.eye]??{}).map(([k,v])=>`${k.toUpperCase()} ${v}`);
  if(rx.color)values.unshift(rx.color);
  return values.join(' · ');
}

function CombinedSummary({left,right,checkIns,today,boxes,separateEyes=false,compact=false,level=1}:{left:LensPackage;right:LensPackage;checkIns:any[];today:string;boxes:ReturnType<typeof useApp>['state']['boxes'];separateEyes?:boolean;compact?:boolean;level?:1|2|3}){
  const leftBox=boxes.find(b=>b.id===left.boxId);const rightBox=boxes.find(b=>b.id===right.boxId);if(!leftBox||!rightBox)return null;
  const leftDuration=left.durationDaysSnapshot??leftBox.durationDays;const rightDuration=right.durationDaysSnapshot??rightBox.durationDays;
  const elapsed=daysOpen(left.openedOn,today);const leftRemaining=Math.max(0,leftDuration-elapsed);const rightRemaining=Math.max(0,rightDuration-elapsed);
  const sameDuration=leftDuration===rightDuration;
  const ids=[left.id,right.id];
  const dates=new Set(checkIns.filter(c=>ids.includes(c.packageId)&&c.status==='worn'&&c.date>=left.openedOn&&c.date<=today).map(c=>c.date));
  const worn=dates.size;
  const leftExpired=elapsed>leftDuration;const rightExpired=elapsed>rightDuration;
  const sharedRx=prescriptionText(left,boxes)===prescriptionText(right,boxes);
  const rxLeft=prescriptionText(left,boxes);const rxRight=prescriptionText(right,boxes);
  const progress=(pack:LensPackage,duration:number,eye:'SOL'|'SAĞ',color:string)=><View key={pack.id} style={{gap:4}}>{(!sameDuration||separateEyes)&&<Copy size={14} bold style={{color}}>{eye} · {durationLabel(duration)}</Copy>}<Progress pack={pack} duration={duration} checkIns={checkIns} today={today}/></View>;
  const stock=leftBox.id===rightBox.id?leftBox.lensesRemaining:leftBox.lensesRemaining+rightBox.lensesRemaining;
  const remainingTile=leftExpired?{label:'Gün aşım',value:`+${elapsed-leftDuration}`,tone:colors.danger}:leftRemaining===0?null:{label:'Kalan gün',value:String(leftRemaining)};
  const openTile={label:'Açık gün',value:String(elapsed),...openDayTone(level)};
  return <View style={{gap:compact?5:6}}>
    <View style={{alignItems:'center',gap:3}}>
      {sameDuration?<View style={{backgroundColor:'#D7E9FF',borderRadius:20,paddingHorizontal:14,paddingVertical:1}}><Copy size={12} bold style={{color:colors.ink,letterSpacing:.4,lineHeight:18}}>{durationLabel(leftDuration)}</Copy></View>:<View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:8}}><View style={{backgroundColor:'#EAF4FF',borderRadius:20,paddingHorizontal:10,paddingVertical:2}}><Copy size={12} bold style={{color:colors.leftText}}>SOL · {durationLabel(leftDuration)}</Copy></View><View style={{backgroundColor:'#EAF4FF',borderRadius:20,paddingHorizontal:10,paddingVertical:2}}><Copy size={12} bold style={{color:colors.right}}>SAĞ · {durationLabel(rightDuration)}</Copy></View></View>}
      {sharedRx&&!!rxLeft?<Copy size={14} mono style={{color:colors.ink,textAlign:'center'}}>{rxLeft}</Copy>:(!sharedRx&&!!(rxLeft||rxRight))?<View style={{gap:2,alignItems:'center'}}>{!!rxLeft&&<Copy size={14} mono style={{color:colors.leftText}}>SOL · {rxLeft}</Copy>}{!!rxRight&&<Copy size={14} mono style={{color:colors.right}}>SAĞ · {rxRight}</Copy>}</View>:null}
    </View>
    {leftDuration===1?<StatTiles compact={compact} items={[{label:'Bu ay takılan gün',value:String(worn)},{label:'Kutuda lens',value:String(stock)}]}/>:<>
      {sameDuration?<StatTiles compact={compact} items={[openTile,{label:'Pakette takılan gün',value:String(worn)},...(remainingTile?[remainingTile]:[])]}/>:<><StatTiles compact={compact} items={[openTile,{label:'Pakette takılan gün',value:String(worn)}]}/><View style={{flexDirection:'row',justifyContent:'space-between',gap:8}}><Copy size={14} bold style={{color:leftExpired?colors.danger:colors.ink}}>SOL · {leftExpired?`+${elapsed-leftDuration} gün aşım`:leftRemaining===0?'Bugün son gün':`${leftRemaining} gün kaldı`}</Copy><Copy size={14} bold style={{color:rightExpired?colors.danger:colors.ink,textAlign:'right'}}>SAĞ · {rightExpired?`+${elapsed-rightDuration} gün aşım`:rightRemaining===0?'Bugün son gün':`${rightRemaining} gün kaldı`}</Copy></View></>}
      {sameDuration&&!separateEyes?progress(left,leftDuration,'SOL',colors.leftText):<View style={{gap:6}}>{progress(left,leftDuration,'SOL',colors.leftText)}{progress(right,rightDuration,'SAĞ',colors.right)}</View>}
    </>}
  </View>;
}

/**
 * Case artwork geometry, measured on assets/contact-lens-case.png (1200×600; visible case inside
 * x 125–1072, y 86–542). The artwork is drawn at 92% of the frame and centred on the visible case,
 * so both caps and the case body are never clipped. Cap faces are ellipses given as fractions of
 * the image. All text sizes derive from the drawn image width.
 */
const CASE={zoom:1.26,scale:.92,aspect:2.1,content:{left:125/1200,top:86/600,width:947/1200,height:456/600},faces:{left:{cx:.296,cy:.44},right:{cx:.70,cy:.455}},faceRx:.142,faceRy:.235} as const;

function CapCount({eye,pack,today,caseWidth}:{eye:'left'|'right';pack?:LensPackage;today:string;caseWidth:number}){
  const {state}=useApp();const box=pack?state.boxes.find(b=>b.id===pack.boxId):undefined;
  const isRight=eye==='right';const ink=isRight?'#FFFFFF':colors.ink;
  // The total ("/30") is a quiet companion to the count: lighter weight and a faded tone on each cap.
  const faded=isRight?'#9DBDF2':'#8EA3C2';
  const faceWidth=caseWidth*CASE.faceRx*2,faceHeight=caseWidth*CASE.faceRy;
  let labelSize=clamp(Math.round(caseWidth*.036),11,15);
  const label=()=><Copy bold size={labelSize} style={{color:ink,lineHeight:Math.round(labelSize*1.2),letterSpacing:.6}}>{isRight?'SAĞ · R':'SOL · L'}</Copy>;
  if(!pack||!box)return <View style={{alignItems:'center'}}>{label()}<Copy size={labelSize+1} style={{color:faded}}>Paket yok</Copy></View>;
  const duration=pack.durationDaysSnapshot??box.durationDays;const elapsed=daysOpen(pack.openedOn,today);
  const monthCount=new Set(state.checkIns.filter(c=>c.status==='worn'&&c.date.slice(0,7)===today.slice(0,7)).map(c=>c.date)).size;
  const count=duration===1?String(monthCount):String(elapsed);const total=duration===1?'/AY':`/${duration}`;
  // Count and total sit side by side on one baseline; the count is ~1.85× the total. Both are sized from the cap face
  // and scaled down together (with the label) when the row or the stack would not fit inside it.
  let countSize=clamp(Math.round(caseWidth*.14),26,84);if(count.length>=3)countSize=Math.round(countSize*.8);
  let totalSize=countSize/1.85;
  const overdue=duration>1&&elapsed>duration;
  // The overdue badge adds side padding, so it is counted in the width that has to fit on the cap.
  const rowWidth=count.length*.6*countSize+total.length*.6*totalSize+2+(overdue?countSize*.5:0);
  const k=Math.min(1,faceWidth*.8/rowWidth,faceHeight*.78/(labelSize*1.2+countSize*1.05));
  if(k<1){labelSize=Math.max(8,Math.floor(labelSize*k));countSize=Math.floor(countSize*k);totalSize=countSize/1.85;}
  totalSize=Math.max(8,Math.round(totalSize));
  return <View accessible accessibilityLabel={`${isRight?'Sağ':'Sol'} göz: ${duration===1?`bu ay ${count} gün`:`${count}. gün, ${duration} günlük${overdue?', süre doldu':''}`}`} style={{alignItems:'center',justifyContent:'center'}}>
    {label()}
    {/* Over the duration both caps use the same warning: a red badge with white numbers, whatever the cap colour. */}
    <View style={[{flexDirection:'row',alignItems:'baseline'},overdue&&{backgroundColor:colors.danger,borderRadius:999,paddingHorizontal:Math.round(countSize*.22),borderWidth:1.5,borderColor:'#FFFFFF'}]}>
      <Copy bold size={countSize} style={{color:overdue?'#FFFFFF':ink,lineHeight:Math.round(countSize*1.05),fontVariant:['tabular-nums'],letterSpacing:-.5}}>{count}</Copy>
      <Copy mono size={totalSize} style={{color:overdue?'#FFD6DB':faded,lineHeight:Math.round(totalSize*1.2),marginLeft:1}}>{total}</Copy>
    </View>
  </View>;
}

function LensCaseArt({left,right,today,estimate,maxWidth}:{left?:LensPackage;right?:LensPackage;today:string;estimate:number;maxWidth?:number}){
  const [measured,setMeasured]=useState(0);const width=measured||(maxWidth?Math.min(estimate,maxWidth):estimate);const height=width/CASE.aspect;
  const imageWidth=width*CASE.scale*CASE.zoom;const imageHeight=imageWidth/2;
  const imageLeft=(width-imageWidth*CASE.content.width)/2-imageWidth*CASE.content.left;const imageTop=(height-imageHeight*CASE.content.height)/2-imageHeight*CASE.content.top;
  return <View onLayout={e=>{const w=Math.round(e.nativeEvent.layout.width);if(w&&w!==measured)setMeasured(w);}} style={{width:'100%',maxWidth,alignSelf:'center',aspectRatio:CASE.aspect,overflow:'hidden'}}>
    <Image source={require('../../assets/contact-lens-case.png')} resizeMode="stretch" style={{position:'absolute',left:imageLeft,top:imageTop,width:imageWidth,height:imageHeight}} accessibilityLabel="Sol ve sağ lens kutusu"/>
    {(['left','right'] as const).map(eye=>{const face=CASE.faces[eye];const w=imageWidth*CASE.faceRx*2,h=imageHeight*CASE.faceRy*2;const cx=imageLeft+imageWidth*face.cx,cy=imageTop+imageHeight*face.cy;
      return <View key={eye} pointerEvents="none" style={{position:'absolute',left:cx-w/2,top:cy-h/2,width:w,height:h,alignItems:'center',justifyContent:'center'}}><CapCount eye={eye} pack={eye==='left'?left:right} today={today} caseWidth={imageWidth}/></View>;})}
  </View>;
}

type AnswerValue='worn'|'notWorn'|'glasses';
type AnswerOption={value:string;title:string;icon:keyof typeof Ionicons.glyphMap;selectedColor:string};
/** The three answer buttons, shared by today's card, the calendar day panel and multi-day editing. */
function AnswerButtons({options,status,showIcons,onSelect,label}:{options:AnswerOption[];status:AnswerValue|null;showIcons:boolean;onSelect:(value:AnswerValue)=>void|Promise<void>;label:string}){
  return <View accessibilityLabel={label} style={{flexDirection:'row',gap:6}}>{options.map(o=>{const selected=status===o.value;
    return <PressScale key={o.value} popOn={selected} accessibilityRole="button" accessibilityLabel={o.title} accessibilityState={{selected}} onPress={()=>onSelect(o.value as AnswerValue)}
      style={{flex:1,minWidth:0,minHeight:44,borderRadius:999,borderWidth:1,borderColor:selected?o.selectedColor:'#C6DCF6',backgroundColor:selected?o.selectedColor:'#FFFFFF',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4,paddingHorizontal:6}}>
      {showIcons&&<Ionicons name={o.icon} size={16} color={selected?'#FFFFFF':colors.ink}/>}
      <Copy size={14} bold={selected} numberOfLines={1} fit style={{color:selected?'#FFFFFF':colors.ink,textAlign:'center',lineHeight:18}}>{o.title}</Copy>
    </PressScale>;})}</View>;
}
/**
 * One day's answer (today in the lens card, any day in the calendar). With no answer yet, or an automatic one: the
 * question, the three options and a note. With an answer: one compact line ("Bugün: Taktım") and "Değiştir", which
 * reopens the options in place. The answer always comes from the saved daily status, so both screens stay in sync.
 */
function DayAnswer({question,prefix,status,automatic=false,meta,options,showIcons,onSelect,note}:{question:string;prefix:string;status:AnswerValue|null;automatic?:boolean;meta?:string;options:AnswerOption[];showIcons:boolean;onSelect:(value:AnswerValue)=>Promise<void>;note?:string}){
  const [editing,setEditing]=useState(false);
  const chosen=options.find(o=>o.value===status);
  const showOptions=!chosen||automatic||editing;
  const autoNote=automatic&&chosen?`Cevapsız kaldığı için “${chosen.title}” sayıldı. Doğrusunu seç.`:null;
  return <View style={{backgroundColor:'#EEF5FF',borderRadius:16,borderWidth:1,borderColor:'#D6E5F6',paddingHorizontal:8,paddingVertical:showOptions?8:2,gap:6}}>
    {showOptions&&<View style={{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:2}}>
      <Copy bold size={15} style={{flex:1,minWidth:0,color:colors.ink,lineHeight:20}}>{question}</Copy>
      {!!meta&&<Copy size={13} style={{color:palette.inkSoft,lineHeight:18}}>{meta}</Copy>}
    </View>}
    {showOptions?<AnswerButtons label={question} options={options} status={automatic?null:status} showIcons={showIcons} onSelect={async value=>{await onSelect(value);setEditing(false);}}/>
    :<View style={{flexDirection:'row',alignItems:'center',gap:8,minHeight:44,paddingLeft:2}}>
      <Ionicons name={chosen.icon} size={20} color={chosen.selectedColor}/>
      <Copy bold size={15} style={{flex:1,minWidth:0,color:colors.ink,lineHeight:20}}>{prefix}: {chosen.title}</Copy>
      <Pressable accessibilityRole="button" accessibilityLabel={`${prefix} cevabını değiştir`} onPress={()=>setEditing(true)} style={({pressed})=>({minHeight:40,paddingHorizontal:16,borderRadius:999,borderWidth:1,borderColor:'#C6DCF6',backgroundColor:'#FFFFFF',justifyContent:'center',opacity:pressed?.7:1})}><Copy bold size={14} style={{color:'#0754C8'}}>Değiştir</Copy></Pressable>
    </View>}
    {showOptions&&(autoNote||note)&&<Copy size={12} style={{color:palette.inkSoft,lineHeight:16,paddingHorizontal:2}}>{autoNote??note}</Copy>}
  </View>;
}

/** "Kutuda kalan" info row under "Yeni paket açtım": icon + label, then one quiet chip per eye (and a spare chip when
 * a shared box has an odd lens). Information only, so it reads as one accessible line; chips wrap on narrow screens. */
function StockRow({items,spare}:{items:Array<{eye:string;count:number}>;spare:number}){
  const chip=(key:string,label:string,count:number)=><View key={key} style={{flexDirection:'row',alignItems:'baseline',gap:4,paddingHorizontal:10,paddingVertical:3,borderRadius:999,backgroundColor:'#E4EFFD'}}>
    <Copy size={13} style={{color:palette.inkSoft,lineHeight:18}}>{label}</Copy>
    <Copy bold size={15} style={{color:colors.ink,lineHeight:20,fontVariant:['tabular-nums']}}>{count}</Copy>
    <Copy size={13} style={{color:palette.inkSoft,lineHeight:18}}>lens</Copy>
  </View>;
  const spoken=`Kutuda kalan: ${items.map(i=>`${i.eye.toLocaleLowerCase('tr-TR')} ${i.count} lens`).join(', ')}${spare?`, ${spare} yedek lens`:''}`;
  return <View accessible accessibilityLabel={spoken} style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',rowGap:6,columnGap:10,paddingHorizontal:12,paddingVertical:7,borderRadius:14,backgroundColor:'#F5F9FF',borderWidth:1,borderColor:'#E1ECF9'}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
      <Ionicons name="cube-outline" size={18} color="#0754C8"/>
      <Copy bold size={13} style={{color:colors.ink,lineHeight:18}}>Kutuda kalan</Copy>
      <View style={{width:1,height:18,backgroundColor:'#D3E2F5',marginLeft:4}}/>
    </View>
    <View style={{flex:1,flexDirection:'row',flexWrap:'wrap',justifyContent:'flex-end',gap:6}}>
      {items.map(i=>chip(i.eye,i.eye,i.count))}
      {spare>0&&<View style={{flexDirection:'row',alignItems:'baseline',gap:4,paddingHorizontal:10,paddingVertical:3,borderRadius:999,backgroundColor:'#EEF5FF'}}><Copy size={13} style={{color:palette.inkSoft,lineHeight:18}}>Yedek</Copy><Copy bold size={15} style={{color:colors.ink,lineHeight:20}}>{spare}</Copy></View>}
    </View>
  </View>;
}

/** Compact secondary action for the "yesterday" card: 44 px tall touch target, quieter than the shared Button. Ignores repeat presses while saving. */
function QuietAction({title,onPress,icon,wide=false}:{title:string;onPress:()=>void|Promise<unknown>;icon?:keyof typeof Ionicons.glyphMap;wide?:boolean}){
  const busy=useRef(false);
  return <PressScale accessibilityRole="button" accessibilityLabel={title} onPress={async()=>{if(busy.current)return;busy.current=true;try{await onPress();}finally{busy.current=false;}}} style={{flexGrow:1,flexBasis:wide?'100%':'40%',minWidth:120,minHeight:44,borderRadius:999,borderWidth:1,borderColor:'#C6DCF6',backgroundColor:'#E8F2FF',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,paddingHorizontal:10,paddingVertical:6}}>{icon&&<Ionicons name={icon} size={16} color="#0754C8"/>}<Copy bold size={14} style={{color:'#0754C8',textAlign:'center',lineHeight:18,flexShrink:1}}>{title}</Copy></PressScale>;
}

/** Web only: lets a mouse drag the pager like a finger. Clicks after a drag are swallowed so buttons don't fire. */
function useWebMouseDrag(ref:React.RefObject<ScrollViewInstance|null>,enabled:boolean,widthRef:React.RefObject<number>,pageRef:React.RefObject<HomePage>,onRelease:(page:HomePage)=>void){
  const release=useRef(onRelease);release.current=onRelease;
  useEffect(()=>{
    if(Platform.OS!=='web'||!enabled)return;
    const node=(ref.current as any)?.getScrollableNode?.() as HTMLElement|undefined;if(!node?.addEventListener)return;
    let startX=0,startLeft=0,dragging=false,moved=false,restore:ReturnType<typeof setTimeout>|undefined;
    const down=(e:PointerEvent)=>{if(e.pointerType!=='mouse'||e.button!==0)return;startX=e.clientX;startLeft=node.scrollLeft;dragging=true;moved=false;};
    const move=(e:PointerEvent)=>{if(!dragging)return;const dx=e.clientX-startX;if(!moved&&Math.abs(dx)<6)return;if(!moved){moved=true;clearTimeout(restore);node.style.scrollSnapType='none';node.style.cursor='grabbing';node.style.userSelect='none';}node.scrollLeft=startLeft-dx;e.preventDefault();};
    const up=(e:PointerEvent)=>{if(!dragging)return;dragging=false;if(!moved)return;const dx=e.clientX-startX;const w=widthRef.current||1;let target:HomePage=pageRef.current;if(dx<-w*.15)target='calendar';else if(dx>w*.15)target='today';node.style.cursor='';node.style.userSelect='';release.current(target);restore=setTimeout(()=>{node.style.scrollSnapType='';},500);};
    const click=(e:MouseEvent)=>{if(moved){e.stopPropagation();e.preventDefault();moved=false;}};
    node.addEventListener('pointerdown',down);window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);node.addEventListener('click',click,true);
    return()=>{clearTimeout(restore);node.removeEventListener('pointerdown',down);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);node.removeEventListener('click',click,true);};
  },[ref,enabled,widthRef,pageRef]);
}

export default function Home() {
  const {state,today,dispatch}=useApp();const {markDay,prompt:openingPrompt,resolve:resolveOpening,cancel:cancelOpening}=useMarkDay();const motion=useCalmMotion();
  const {page:activePage,setPage,goToPage,registerPager}=useHomePager();
  const {width:windowWidth,height:windowHeight}=useWindowDimensions();
  // The case art height is capped at ~23% of the window (130–230 px). Today's answer sits right under it inside
  // the card, so header + case + answer fit the first view without measuring.
  const artCapHeight=clamp(windowHeight*.23,130,230);
  const [viewportHeight,setViewportHeight]=useState(0);
  const artMaxWidth=Math.round(artCapHeight*CASE.aspect);
  // Short visible area (e.g. 4.7" phones): smaller greeting/owl, tighter legend and title. Buttons keep their size.
  const tight=viewportHeight>0&&viewportHeight<640;
  const headerTight=tight||windowHeight<740;const owlBase=tight?84:windowHeight<700?90:108;
  // Header width budget, so greeting and date never wrap. Widest strings, measured in the app fonts:
  // greeting "İyi akşamlar" 171/148/137 px at 30/26/24; longest Turkish date 180/168/156 px at 15/14/13.
  // Owl tucked up beside the bell when the text still fits; otherwise it drops below the bell (right-aligned) and shrinks if needed.
  const headerWidth=Math.min(windowWidth,640)-32;
  const tucked=headerWidth-8-44-(owlBase+24)>=168;
  const owlSize=tucked?owlBase:clamp(headerWidth-8-4-24-156,56,owlBase);
  const headerTextWidth=headerWidth-8-(tucked?44:4)-(owlSize+24);
  const greetingMax=tight?24:headerTight?26:30;
  const greetingSize=Math.min(greetingMax,headerTextWidth>=171?30:headerTextWidth>=148?26:24);
  const dateSize=headerTextWidth>=180?15:headerTextWidth>=168?14:13;
  // Pager width is measured from the pager viewport itself; the window estimate only covers the first frame.
  const estimate=Math.min(windowWidth,640)-32;
  const [pagerWidth,setPagerWidth]=useState(0);
  // Whole pixels for both the scroll viewport and each page, so they are always identical (no neighbour strip, no unreachable snap point).
  const pageWidth=Math.floor(pagerWidth||estimate);
  const pager=useRef<ScrollViewInstance|null>(null);
  const widthRef=useRef(pageWidth);widthRef.current=pageWidth;
  const pageRef=useRef<HomePage>(activePage);
  const programmatic=useRef<HomePage|null>(null);const programmaticTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const offsetFor=(page:HomePage)=>page==='calendar'?widthRef.current:0;
  const scrollToPage=useCallback((page:HomePage,animated:boolean)=>{
    pageRef.current=page;
    if(animated){programmatic.current=page;clearTimeout(programmaticTimer.current);programmaticTimer.current=setTimeout(()=>{programmatic.current=null;},800);}
    pager.current?.scrollTo({x:page==='calendar'?widthRef.current:0,y:0,animated});
  },[]);
  // Tab bar presses (and the in-card buttons) land here.
  useEffect(()=>registerPager(page=>scrollToPage(page,motion)),[registerPager,scrollToPage,motion]);
  // Page state changed from elsewhere (e.g. tab press while another tab was shown): move the pager too.
  useEffect(()=>{if(pageRef.current!==activePage)scrollToPage(activePage,false);},[activePage,scrollToPage]);
  // First layout, rotation or width change: keep the current page aligned without animation.
  useEffect(()=>{if(pagerWidth){const id=requestAnimationFrame(()=>pager.current?.scrollTo({x:pageRef.current==='calendar'?pageWidth:0,y:0,animated:false}));return()=>cancelAnimationFrame(id);}},[pagerWidth,pageWidth]);
  useEffect(()=>()=>clearTimeout(programmaticTimer.current),[]);
  // Each page keeps its own height; the pager takes the active page's height so no gap is left under the shorter card.
  const [pageHeights,setPageHeights]=useState<Record<HomePage,number>>({today:0,calendar:0});
  const measurePage=(page:HomePage)=>(e:LayoutChangeEvent)=>{const h=Math.ceil(e.nativeEvent.layout.height);setPageHeights(prev=>prev[page]===h?prev:{...prev,[page]:h});};
  const pagerHeight=pageHeights[activePage]||undefined;
  const onPagerLayout=(e:LayoutChangeEvent)=>{const w=e.nativeEvent.layout.width;if(w>0&&Math.abs(w-pagerWidth)>.25)setPagerWidth(w);};
  const settle=(x:number)=>{const next:HomePage=x>widthRef.current/2?'calendar':'today';if(next!==pageRef.current){pageRef.current=next;setPage(next);}};
  const onPagerScroll=(e:NativeSyntheticEvent<NativeScrollEvent>)=>{
    const x=e.nativeEvent.contentOffset.x;const target=programmatic.current;
    if(target){if(Math.abs(x-offsetFor(target))<2){programmatic.current=null;clearTimeout(programmaticTimer.current);}return;}
    settle(x);
  };
  const onPagerEnd=(e:NativeSyntheticEvent<NativeScrollEvent>)=>{programmatic.current=null;settle(e.nativeEvent.contentOffset.x);};
  const active=state.packages.filter(p=>!p.closedOn&&p.openedOn<=today);
  useWebMouseDrag(pager,active.length>0,widthRef,pageRef,page=>{setPage(page);scrollToPage(page,true);});
  const params=useLocalSearchParams<{mark?:string;page?:string}>();
  const [month,setMonth]=useState(today.slice(0,7)+'-01');const [selectedDay,setSelectedDay]=useState(today);
  // Multi-day editing happens right in the calendar: tap days to tick them, then pick one answer for all.
  const [multi,setMulti]=useState(false);const [picked,setPicked]=useState<string[]>([]);const [multiNote,setMultiNote]=useState<string|null>(null);
  const right=active.find(p=>p.eye==='right'); const left=active.find(p=>p.eye==='left');
  const leftBox=left?state.boxes.find(b=>b.id===left.boxId):undefined;const rightBox=right?state.boxes.find(b=>b.id===right.boxId):undefined;
  // Spare lenses per eye, from the boxes the open packages came from (opening a package takes one lens out of its box).
  // A box shared by both eyes is split evenly; an odd spare lens is shown separately.
  const stock=((): {items:Array<{eye:'Sol'|'Sağ';count:number}>;spare:number}|null=>{
    if(left&&right&&leftBox&&rightBox){
      if(leftBox.id===rightBox.id){const r=leftBox.lensesRemaining;const per=Math.floor(r/2);return {items:[{eye:'Sol',count:per},{eye:'Sağ',count:per}],spare:r%2};}
      return {items:[{eye:'Sol',count:leftBox.lensesRemaining},{eye:'Sağ',count:rightBox.lensesRemaining}],spare:0};
    }
    if(left&&leftBox)return {items:[{eye:'Sol',count:leftBox.lensesRemaining}],spare:0};
    if(right&&rightBox)return {items:[{eye:'Sağ',count:rightBox.lensesRemaining}],spare:0};
    return null;
  })();
  const sharedOpening=!!left&&!!right&&left.openedOn===right.openedOn&&(left.durationDaysSnapshot??leftBox?.durationDays)===(right.durationDaysSnapshot??rightBox?.durationDays);
  const showsProgress=active.some(p=>(p.durationDaysSnapshot??state.boxes.find(b=>b.id===p.boxId)?.durationDays??1)>1);
  const monthRecords=state.dailyStatuses.filter(c=>c.date.slice(0,7)===today.slice(0,7));
  const monthWear=new Set(monthRecords.filter(c=>c.status==='worn').map(c=>c.date)).size;
  const monthGlasses=new Set(monthRecords.filter(c=>c.status==='glasses').map(c=>c.date)).size;
  const openedThisMonth=active.filter(p=>p.openedOn.slice(0,7)===today.slice(0,7)).sort((a,b)=>b.openedOn.localeCompare(a.openedOn))[0];
  // Automatic days of the open packages, counted from the real records (any age, not only the last week), so the
  // number always matches the dashed days in the calendar and the progress strip.
  const trackedFrom=active.map(p=>p.openedOn).sort()[0]??today;
  const autoDays=state.dailyStatuses.filter(c=>c.automatic&&c.date<today&&c.date>=trackedFrom).sort((a,b)=>a.date.localeCompare(b.date));
  const yesterday=addDays(today,-1);const yesterdayAuto=autoDays.find(c=>c.date===yesterday);
  const answerName=(status:string)=>status==='worn'?'Taktım':status==='glasses'?'Gözlük':'Takmadım';
  const autoStatuses=[...new Set(autoDays.map(c=>c.status))];
  const autoLine=yesterdayAuto?`Dün cevap vermedin, “${answerName(yesterdayAuto.status)}” sayıldı.`:autoDays.length?`${autoDays.length} gün cevapsız kaldı ve ${autoStatuses.length===1?`“${answerName(autoStatuses[0]!)}”`:'varsayılan cevapla'} sayıldı.`:'';
  const autoDetail=autoDays.length>1?`Bu paketlerde toplam ${autoDays.length} gün otomatik dolduruldu (cevap verilmeyen her gün, ertesi gün 02.00’de “${answerName(state.settings.defaultAnswer)}” sayılır).`:'';
  const unanswered=unansweredDays(state,today);
  const activeToday=active.filter(p=>p.openedOn<=today&&(!p.closedOn||p.closedOn>=today));
  const todayRecord=state.dailyStatuses.find(c=>c.date===today);const markedStatus=todayRecord?.status??null;
  const saveStatus=async(status:'worn'|'notWorn'|'glasses',date=today)=>{
    try{await markDay(date,status);}catch(e){showError(e);}
  };
  const changeYesterday=async(status:'worn'|'notWorn'|'glasses')=>saveStatus(status,yesterday);
  const firstDay=parseDate(month),offset=(firstDay.getDay()+6)%7,gridStart=addDays(month,-offset),calendarDays=Array.from({length:42},(_,i)=>addDays(gridStart,i));
  const selectedRecord=state.dailyStatuses.find(c=>c.date===selectedDay);
  const selectedStatus=selectedRecord?.status??null;const selectedAuto=selectedRecord?.automatic??false;const selectedApplicable=state.packages.some(p=>p.openedOn<=selectedDay&&(!p.closedOn||selectedDay<=p.closedOn));
  const editableDay=(day:string)=>day<=today&&day>=addDays(today,-30);
  const canEditSelected=editableDay(selectedDay);
  const entryForDay=(day:string)=>state.dailyStatuses.find(c=>c.date===day);
  const saveSelected=async(status:'worn'|'notWorn'|'glasses')=>saveStatus(status,selectedDay);
  const startMulti=(days:string[])=>{setMulti(true);setPicked(days.filter(editableDay));setMultiNote(null);};
  const stopMulti=()=>{setMulti(false);setPicked([]);};
  const pressDay=(day:string)=>{
    if(!multi){setSelectedDay(day);return;}
    if(!editableDay(day)){setMultiNote(day>today?'Gelecek günler seçilemez.':'30 günden eski günler değiştirilemez.');return;}
    setMultiNote(null);setPicked(prev=>prev.includes(day)?prev.filter(d=>d!==day):[...prev,day].sort());
  };
  const applyMulti=async(status:'worn'|'notWorn'|'glasses')=>{
    if(!picked.length){setMultiNote('Önce takvimden en az bir güne dokun.');return;}
    const covered=(day:string)=>state.packages.some(p=>p.openedOn<=day&&(!p.closedOn||day<=p.closedOn));
    const dates=status==='worn'?picked.filter(covered):picked;const skipped=picked.length-dates.length;
    if(!dates.length){setMultiNote('Seçtiğin günlerde açık lens paketin yoktu; bu günler “Taktım” olarak kaydedilemez. Paketin açılış tarihini düzelt ya da “Takmadım” / “Gözlük” seç.');return;}
    try{await dispatch({type:'bulkDailyStatus',id:uid(),dates,status});}catch(e){showError(e);return;}
    stopMulti();setSelectedDay(dates.at(-1)!);
    setMultiNote(skipped?`${dates.length} gün kaydedildi. ${skipped} günde açık paket olmadığı için “Taktım” kaydedilmedi.`:null);
  };
  // Coming from a new package with a past opening date (or the "mark the days" card): open the calendar with the
  // unanswered days already ticked, so they can be marked in one step.
  useEffect(()=>{
    if(params.page==='calendar'&&!params.mark){goToPage('calendar');router.setParams({page:undefined});return;}
    if(!params.mark)return;
    const from=params.mark;const days=unansweredDays(state,today).filter(d=>d>=from);
    setMonth((days[0]??from).slice(0,7)+'-01');goToPage('calendar');startMulti(days);router.setParams({mark:undefined,page:undefined});
  },[params.mark,params.page]);// eslint-disable-line react-hooks/exhaustive-deps
  const greeting=useMemo(()=>new Date().getHours()<12?'Merhaba!':new Date().getHours()<18?'İyi günler':'İyi akşamlar',[]);
  const owlLevel=active.reduce<1|2|3>((level,p)=>{const next=packageMascotLevel(p.durationDaysSnapshot??state.boxes.find(b=>b.id===p.boxId)?.durationDays??0,daysOpen(p.openedOn,today));return next>level?next:level;},1);
  const owlText=owlLevel===3?'Baykuş uyarıyor: lens süresi doldu':owlLevel===2?'Baykuş hatırlatıyor: değişim yaklaşıyor':'Baykuş neşeli: lensler yeni';
  // Card state. A coloured glow around the card (blue / amber / red) shows the state at a glance; the card itself stays
  // light so numbers keep their contrast. Pages are padded so the glow is not clipped by the pager.
  const glow=owlLevel===3?{backgroundColor:'#FFF5F6',borderWidth:2,borderColor:'#E0404F',shadowColor:'#F0263C',shadowOpacity:.75,shadowRadius:24,shadowOffset:{width:0,height:0},elevation:12}:owlLevel===2?{backgroundColor:'#FFF8EC',borderWidth:2,borderColor:'#F0A030',shadowColor:'#FF9F1A',shadowOpacity:.75,shadowRadius:24,shadowOffset:{width:0,height:0},elevation:10}:{backgroundColor:'#FFFFFF',borderWidth:1.5,borderColor:'#6FA8EE',shadowColor:'#1F7BFF',shadowOpacity:.6,shadowRadius:24,shadowOffset:{width:0,height:0},elevation:8};
  const calendarGlow={...glow,backgroundColor:'#FFFFFF'};
  const answerOptions=[{value:'worn',title:'Taktım',icon:'checkmark-circle-outline' as const,selectedColor:colors.right},{value:'notWorn',title:'Takmadım',icon:'close-circle-outline' as const,selectedColor:palette.notWornSelected},{value:'glasses',title:'Gözlük',icon:'glasses-outline' as const,selectedColor:palette.glasses}];
  // Icons only when each button still fits icon + “Takmadım” in full (≈104 px); otherwise text only, never truncated.
  const showIcons=(pageWidth-52)/3>=104;
  // The calendar card has more padding than the lens card, so its answer buttons drop icons sooner to keep “Takmadım” whole.
  const showIconsInCalendar=(pageWidth-72)/3>=96;
  const onToday=activePage==='today';
  return <Screen dense background={<AmbientBackground/>} onViewportLayout={e=>setViewportHeight(Math.round(e.nativeEvent.layout.height))}>
    {/* Header: logo left / bell right on the first row; greeting + date left, owl to their right. The owl reaches up into the logo row but stays left of the bell. */}
    <View>
      <View style={{flexDirection:'row',alignItems:'center',gap:8,minHeight:tight?36:40}}>
        <Svg width={44} height={26} viewBox="0 0 58 34"><Ellipse cx={21} cy={15} rx={17} ry={9} transform="rotate(-25 21 15)" fill="#EAF5FF" stroke="#1683E8" strokeWidth={2}/><Ellipse cx={38} cy={20} rx={17} ry={9} transform="rotate(-25 38 20)" fill="#EAF5FF" stroke="#1683E8" strokeWidth={2}/></Svg>
        <Copy size={22} bold style={{color:colors.ink}}>Lensim</Copy>
        <View style={{flex:1}}/>
        <Pressable accessibilityRole="button" accessibilityLabel="Bildirim ayarları" hitSlop={4} onPress={()=>router.push('/settings/notifications')} style={{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center'}}><Ionicons name="notifications-outline" size={27} color={colors.ink}/></Pressable>
      </View>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
        <View style={{flex:1,minWidth:0,gap:2}}>
          <Copy size={greetingSize} bold style={{color:colors.ink,lineHeight:Math.round(greetingSize*1.2)}}>{greeting}</Copy>
          <Copy size={dateSize} mono style={{color:'#405B86'}}>{parseDate(today).toLocaleDateString('tr-TR',{day:'numeric',month:'long',weekday:'long'})}</Copy>
        </View>
        <View style={{marginRight:tucked?44:4,marginTop:tucked?-Math.round(owlSize*.22):0,marginBottom:-Math.round(owlSize*.12)}}><OwlBadge level={owlLevel} label={owlText} size={owlSize}/></View>
      </View>
    </View>
    {active.length>0&&<View onLayout={onPagerLayout} style={{width:'100%'}}>
     <ScrollView ref={pager} horizontal pagingEnabled nestedScrollEnabled directionalLockEnabled showsHorizontalScrollIndicator={false} decelerationRate="fast" scrollEventThrottle={16} contentOffset={{x:activePage==='calendar'?pageWidth:0,y:0}} onScroll={onPagerScroll} onMomentumScrollEnd={onPagerEnd} onScrollEndDrag={Platform.OS==='web'?onPagerEnd:undefined} style={{width:pageWidth,flexGrow:0,height:pagerHeight}} contentContainerStyle={{alignItems:'flex-start'}}>
     <View onLayout={measurePage('today')} aria-hidden={!onToday} importantForAccessibility={onToday?'auto':'no-hide-descendants'} style={{width:pageWidth,padding:14}}><View style={{borderRadius:18,paddingHorizontal:14,paddingTop:tight?6:8,paddingBottom:tight?10:12,gap:tight?8:10,...glow}}>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
          <Copy size={15} bold mono style={{color:palette.inkSoft,letterSpacing:1}}>LENS KUTUN</Copy>
          <PressScale accessibilityRole="button" accessibilityLabel="Lens döngüsü özetini aç" accessibilityHint="Paket süresi, stok ve takılan günler" hitSlop={8} onPress={()=>router.push('/cycle')} style={{width:36,height:36,borderRadius:18,backgroundColor:'#E8F2FF',borderWidth:1,borderColor:'#C6DCF6',alignItems:'center',justifyContent:'center'}}><Ionicons name="arrow-forward" size={20} color="#0754C8"/></PressScale>
        </View>
        <View style={{marginHorizontal:-10}}><LensCaseArt left={left} right={right} today={today} estimate={pageWidth-18} maxWidth={artMaxWidth}/></View>
        {activeToday.length>0&&<View style={{marginHorizontal:-6}}><DayAnswer question="Bugün lens taktın mı?" prefix="Bugün" status={markedStatus} meta={`${monthWear} gün bu ay`} options={answerOptions} showIcons={showIcons} onSelect={value=>saveStatus(value)}/></View>}
        {sharedOpening&&left&&right&&<CombinedSummary left={left} right={right} checkIns={state.checkIns} today={today} boxes={state.boxes} separateEyes={state.settings.separateEyeCalendars} compact={tight} level={owlLevel}/>}
        {!sharedOpening&&(left||right)&&<View style={{flexDirection:'row',gap:14}}>{left&&<CaseSummary pack={left} checkIns={state.checkIns} today={today} compact/>}{right&&<CaseSummary pack={right} checkIns={state.checkIns} today={today} compact/>}</View>}
        {showsProgress&&<ProgressLegend/>}
        <View style={{borderTopWidth:1,borderColor:owlLevel===2?'#F2D3A4':owlLevel===3?'#F3C3C8':'#D6E5F6',paddingTop:4,gap:0}}>
          <View style={{flexDirection:'row',gap:12}}>
            {left&&<Pressable accessibilityRole="button" accessibilityLabel={`Sol paket, ${shortDate(left.openedOn)} açıldı`} hitSlop={6} onPress={()=>router.push({pathname:'/package/[id]',params:{id:left.id}})} style={{flex:1,minWidth:0,minHeight:36,justifyContent:'center'}}><Copy size={12} bold mono style={{color:colors.leftText}}>SOL · {shortDate(left.openedOn)}</Copy></Pressable>}
            {right&&<Pressable accessibilityRole="button" accessibilityLabel={`Sağ paket, ${shortDate(right.openedOn)} açıldı`} hitSlop={6} onPress={()=>router.push({pathname:'/package/[id]',params:{id:right.id}})} style={{flex:1,minWidth:0,minHeight:36,justifyContent:'center',alignItems:'flex-end'}}><Copy size={12} bold mono style={{color:colors.right}}>SAĞ · {shortDate(right.openedOn)}</Copy></Pressable>}
          </View>
        </View>
      </View></View>
     <View onLayout={measurePage('calendar')} aria-hidden={onToday} importantForAccessibility={onToday?'no-hide-descendants':'auto'} style={{width:pageWidth,padding:14}}><Card style={{borderRadius:18,padding:14,gap:10,...calendarGlow}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Pressable accessibilityRole="button" accessibilityLabel="Önceki ay" onPress={()=>setMonth(addMonths(month,-1))} style={{width:48,height:48,alignItems:'center',justifyContent:'center'}}><Ionicons name="chevron-back" size={24} color={colors.ink}/></Pressable><Copy size={16} bold>{firstDay.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}</Copy><Pressable accessibilityRole="button" accessibilityLabel="Sonraki ay" disabled={month.slice(0,7)>=today.slice(0,7)} onPress={()=>setMonth(addMonths(month,1)>today.slice(0,7)+'-01'?today.slice(0,7)+'-01':addMonths(month,1))} style={{width:48,height:48,alignItems:'center',justifyContent:'center',opacity:month.slice(0,7)>=today.slice(0,7)?.3:1}}><Ionicons name="chevron-forward" size={24} color={colors.ink}/></Pressable></View>
      <View style={{flexDirection:'row'}}>{['Pt','Sa','Ça','Pe','Cu','Ct','Pz'].map(d=><View key={d} style={{flex:1,alignItems:'center'}}><Copy size={14} muted>{d}</Copy></View>)}</View>
      <View style={{flexDirection:'row',flexWrap:'wrap'}}>{calendarDays.map(day=>{const entry=entryForDay(day);const tone=dayTone(entry);const ticked=multi&&picked.includes(day);const isSelected=!multi&&selectedDay===day;const pickable=multi&&editableDay(day);
        return <Pressable key={day} accessibilityRole={multi?'checkbox':'button'} accessibilityLabel={`${formatDate(day)} · ${tone.label}`} accessibilityState={multi?{checked:ticked,disabled:!pickable}:{selected:isSelected}} onPress={()=>pressDay(day)} style={{width:'14.285%',height:48,padding:2,opacity:day.slice(0,7)===month.slice(0,7)?(multi&&!pickable?.45:1):.35}}>
          <View style={{flex:1,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:tone.fill,borderWidth:isSelected||ticked?2:entry?.automatic?1:0,borderStyle:entry?.automatic&&!isSelected&&!ticked?'dashed':'solid',borderColor:isSelected||ticked?colors.ink:'#7C93B5'}}><Copy size={15} bold={day===today||isSelected||ticked} style={{color:tone.text,lineHeight:18}}>{Number(day.slice(-2))}</Copy>{entry?.status==='glasses'&&<Ionicons name="glasses-outline" size={11} color={tone.text}/>}</View>
          {pickable&&<View pointerEvents="none" style={{position:'absolute',top:0,right:0,width:17,height:17,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:ticked?'#0754C8':'#FFFFFF',borderWidth:1.5,borderColor:ticked?'#FFFFFF':'#9DB8DA'}}>{ticked&&<Ionicons name="checkmark" size={11} color="#FFFFFF"/>}</View>}
        </Pressable>})}</View>
      <View style={{flexDirection:'row',justifyContent:'space-between'}}><Copy size={15} bold style={{color:colors.right}}>Bu ay {monthWear} gün lens</Copy><Copy size={15} bold style={{color:palette.glassesText}}>{monthGlasses} gün gözlük</Copy></View>{openedThisMonth&&<Copy size={14} muted>Bu ay açılan paket · {daysOpen(openedThisMonth.openedOn,today)} gündür açık</Copy>}
      {multi?<View style={{gap:8,borderTopWidth:1,borderColor:'#D6E5F6',paddingTop:10}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Copy size={16} bold style={{flex:1}}>{picked.length?`${picked.length} gün seçildi`:'Günleri seç'}</Copy>{picked.length>0&&<Pressable accessibilityRole="button" onPress={()=>setPicked([])} hitSlop={6} style={{minHeight:36,justifyContent:'center'}}><Copy size={14} bold style={{color:'#0754C8'}}>Seçimi temizle</Copy></Pressable>}</View>
        <Copy size={14} muted>Takvimde günlere dokunarak seç; sonra hepsi için cevabı seç. Son 30 gün değiştirilebilir.</Copy>
        <AnswerButtons label="Seçilen günlerin cevabı" options={answerOptions} status={null} showIcons={showIconsInCalendar} onSelect={applyMulti}/>
        {!!multiNote&&<Copy size={14} style={{color:'#8A4B00'}}>{multiNote}</Copy>}
      </View>:<View style={{gap:8,borderTopWidth:1,borderColor:'#D6E5F6',paddingTop:10}}>
        <Copy size={16} bold>{formatDate(selectedDay)}{selectedDay===today?' · Bugün':''}</Copy>
        {selectedDay>today?<Copy size={14} muted>Gelecek günler işaretlenemez.</Copy>:!canEditSelected?<Copy size={14} muted>{selectedStatus?`${answerName(selectedStatus)}${selectedAuto?' (otomatik)':''} · `:''}30 günden eski günler yalnızca görüntülenir.</Copy>
          :<DayAnswer key={selectedDay} question={selectedDay===today?'Bugün lens taktın mı?':'Bu gün lens taktın mı?'} prefix={selectedDay===today?'Bugün':shortDate(selectedDay)} status={selectedStatus} automatic={selectedAuto} options={answerOptions} showIcons={showIconsInCalendar} onSelect={saveSelected} note={!selectedApplicable?'Bu gün açık paketin yoktu. “Taktım” dersen açılış tarihini bu güne almak isteyip istemediğini soracağız.':'Ana ekrandaki cevapla aynı kayıttır.'}/>}
        {!!multiNote&&<Copy size={14} style={{color:palette.inkSoft}}>{multiNote}</Copy>}
      </View>}
      <Button title={multi?'Çoklu düzenlemeyi bitir':'Birden çok günü düzenle'} secondary outlined={!multi} icon={multi?'close':'checkmark-done-outline'} onPress={()=>multi?stopMulti():startMulti([])}/>
     </Card></View>
    </ScrollView></View>}
    {!active.length&&<Card style={{borderRadius:16,borderColor:'#BBD5F1'}}><Copy size={22} bold style={{color:colors.ink}}>İlk lens paketini ekle</Copy><Copy>Önce kutunu ve hangi göz için olduğunu seç. Sayım açılış gününden başlar.</Copy><Button title="İlk lens paketini ekle" icon="add" onPress={()=>router.push('/package/new')}/></Card>}

    {/* Spare-lens stock sits with the action that uses it up. */}
    {active.length>0&&<View style={{gap:6}}><Button title="Yeni paket açtım" secondary outlined icon="add" onPress={()=>router.push('/package/new')}/>{stock&&<StockRow items={stock.items} spare={stock.spare}/>}</View>}
    {unanswered.length>0&&<Card style={{borderRadius:16,borderColor:'#F2CC8F',backgroundColor:'#FFF8EC',padding:14,gap:10}}><Copy bold size={15} style={{color:colors.ink,lineHeight:20}}>{unanswered.length} gün henüz işaretlenmedi</Copy><Copy size={14} style={{color:palette.inkSoft}}>{unanswered.length===1?formatDate(unanswered[0]!):`${shortDate(unanswered[0]!)} – ${shortDate(unanswered.at(-1)!)}`} arası, paketi Lensim’e eklemeden önceki günler. Takılan gün sayısına girmeleri için işaretle.</Copy><View style={{flexDirection:'row'}}><QuietAction title="Takvimde işaretle" icon="checkmark-done-outline" onPress={()=>{setMonth(unanswered[0]!.slice(0,7)+'-01');goToPage('calendar');startMulti(unanswered);}}/></View></Card>}
    {!!autoLine&&<Card style={{borderRadius:16,borderColor:'#B9D1F3',backgroundColor:'#F3F8FF',padding:14,gap:10}}><Copy bold size={15} style={{color:colors.ink,lineHeight:20}}>{autoLine}</Copy>{!!autoDetail&&<Copy size={14} style={{color:palette.inkSoft}}>{autoDetail}</Copy>}{yesterdayAuto?<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}><QuietAction title="Dün taktım" onPress={()=>changeYesterday('worn')}/><QuietAction title="Dün takmadım" onPress={()=>changeYesterday('notWorn')}/><QuietAction wide title="Dün gözlük kullandım" icon="glasses-outline" onPress={()=>changeYesterday('glasses')}/></View>:null}{(!yesterdayAuto||autoDays.length>1)&&<View style={{flexDirection:'row'}}><QuietAction title="Takvimde kontrol et" icon="calendar-outline" onPress={()=>{const first=autoDays[0]?.date;if(first)setMonth(first.slice(0,7)+'-01');goToPage('calendar');}}/></View>}</Card>}
    <OpeningChoice prompt={openingPrompt} onChoose={resolveOpening} onCancel={cancelOpening}/>
  </Screen>;
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, View, useWindowDimensions, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, Card, Copy, Screen,SegmentedControl } from '../../src/components/ui';
import { PressScale } from '../../src/components/PressScale';
import { AmbientBackground } from '../../src/components/AmbientBackground';
import { OwlBadge } from '../../src/components/OwlBadge';
import { useCalmMotion } from '../../src/design/motion';
import { useApp, errorText } from '../../src/state/AppContext';
import {useHomePager,type HomePage} from '../../src/state/HomePagerContext';
import { useMarkDay } from '../../src/state/useMarkDay';
import { addDays, addMonths, durationLabel as durationName, formatDate, getDaysRemaining, packageMascotLevel, parseDate, shortDate } from '../../src/domain/dates';
import { dayTone, palette } from '../../src/design/dayTone';
import { type LensPackage } from '../../src/domain/types';

const colors = { right:palette.right, left:palette.left, leftText:palette.leftText, ink:palette.ink, warning:palette.warning, danger:palette.danger };
const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));

/** Progress strip: one cell per day up to 30 days, otherwise a continuous bar. Past days without an answer are grey; days still to come are outlined. */
function Progress({pack,duration,checkIns,today,height=9}:{pack:LensPackage;duration:number;checkIns:any[];today:string;height?:number}){
  if(duration>30){const elapsed=daysOpen(pack.openedOn,today);const ratio=Math.min(1,elapsed/duration);return <View accessibilityLabel={`${duration} günün ${elapsed}. günü`} style={{height,borderRadius:height/2,backgroundColor:palette.upcoming,borderWidth:1,borderColor:palette.upcomingBorder,overflow:'hidden'}}><View style={{width:`${ratio*100}%`,height:'100%',backgroundColor:elapsed>duration?colors.danger:colors.right}}/></View>;}
  return <View accessibilityLabel={`${daysOpen(pack.openedOn,today)} gündür açık, ${duration} günlük`} style={{flexDirection:'row',gap:2}}>{Array.from({length:duration},(_,i)=>i+1).map(day=>{const date=addDays(pack.openedOn,day-1);const entry=checkIns.find(c=>c.packageId===pack.id&&c.date===date);const tone=dayTone(entry);const upcoming=!entry&&date>today;return <View key={day} style={{height,flex:1,backgroundColor:entry?tone.fill:upcoming?palette.upcoming:palette.unanswered,borderWidth:upcoming?1:0,borderColor:palette.upcomingBorder,borderRadius:2}}/>;})}</View>;
}
const daysOpen = (start:string,today:string) => Math.max(1,getDaysRemaining(today,start)+1);

/** Colour key for the progress strip; swatches use exactly the strip's colours. */
function ProgressLegend(){
  const items:Array<{label:string;fill:string;border?:string;dashed?:boolean}>=[{label:'Taktım',fill:palette.right},{label:'Takmadım',fill:palette.left},{label:'Gözlük',fill:palette.glasses},{label:'Cevapsız',fill:palette.unanswered},{label:'Kalan',fill:palette.upcoming,border:palette.upcomingBorder},{label:'Otomatik',fill:'#B9D1F3',border:'#7C93B5',dashed:true}];
  return <View accessibilityLabel="Renk açıklaması" style={{flexDirection:'row',flexWrap:'wrap',columnGap:12,rowGap:6,justifyContent:'center'}}>{items.map(item=><View key={item.label} style={{flexDirection:'row',alignItems:'center',gap:5}}><View style={{width:12,height:12,borderRadius:3,backgroundColor:item.fill,borderWidth:item.border?1:0,borderColor:item.border,borderStyle:item.dashed?'dashed':'solid'}}/><Copy size={13} style={{color:palette.inkSoft}}>{item.label}</Copy></View>)}</View>;
}

/** Three grouped numbers under the case: open days, worn days, days left. */
function StatTiles({items}:{items:Array<{label:string;value:string;tone?:string}>}){
  return <View style={{flexDirection:'row',gap:8}}>{items.map(item=><View key={item.label} accessible accessibilityLabel={`${item.label}: ${item.value}`} style={{flex:1,minWidth:0,paddingVertical:10,paddingHorizontal:6,borderRadius:12,backgroundColor:'#F2F7FE',borderWidth:1,borderColor:'#DCE8F7',alignItems:'center',gap:1}}><Copy bold size={22} style={{color:item.tone??colors.ink,lineHeight:27,fontVariant:['tabular-nums']}}>{item.value}</Copy><Copy size={12} style={{color:palette.inkSoft,textAlign:'center',lineHeight:16}}>{item.label}</Copy></View>)}</View>;
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

function durationLabel(days:number){return durationName(days).toLocaleUpperCase('tr-TR');}
function prescriptionText(pack:LensPackage|undefined,boxes:ReturnType<typeof useApp>['state']['boxes']){
  if(!pack)return '';
  const box=boxes.find(b=>b.id===pack.boxId);if(!box)return '';
  const rx=pack.prescriptionSnapshot??box.prescription;const values=Object.entries(rx[pack.eye]??{}).map(([k,v])=>`${k.toUpperCase()} ${v}`);
  if(rx.color)values.unshift(rx.color);
  return values.join(' · ');
}

function CombinedSummary({left,right,checkIns,today,boxes,separateEyes=false}:{left:LensPackage;right:LensPackage;checkIns:any[];today:string;boxes:ReturnType<typeof useApp>['state']['boxes'];separateEyes?:boolean}){
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
  const remainingTile=leftExpired?{label:'Gün aşım',value:`+${elapsed-leftDuration}`,tone:colors.danger}:leftRemaining===0?{label:'Bugün son gün',value:'0',tone:colors.warning}:{label:'Kalan gün',value:String(leftRemaining)};
  return <View style={{gap:12}}>
    <View style={{alignItems:'center',gap:6}}>
      {sameDuration?<View style={{backgroundColor:'#D7E9FF',borderRadius:20,paddingHorizontal:18,paddingVertical:6}}><Copy size={15} bold style={{color:colors.ink}}>{durationLabel(leftDuration)}</Copy></View>:<View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:8}}><View style={{backgroundColor:'#EAF4FF',borderRadius:20,paddingHorizontal:12,paddingVertical:6}}><Copy size={14} bold style={{color:colors.leftText}}>SOL · {durationLabel(leftDuration)}</Copy></View><View style={{backgroundColor:'#EAF4FF',borderRadius:20,paddingHorizontal:12,paddingVertical:6}}><Copy size={14} bold style={{color:colors.right}}>SAĞ · {durationLabel(rightDuration)}</Copy></View></View>}
      {sharedRx&&!!rxLeft?<Copy size={14} mono style={{color:colors.ink,textAlign:'center'}}>{rxLeft}</Copy>:(!sharedRx&&!!(rxLeft||rxRight))?<View style={{gap:2,alignItems:'center'}}>{!!rxLeft&&<Copy size={14} mono style={{color:colors.leftText}}>SOL · {rxLeft}</Copy>}{!!rxRight&&<Copy size={14} mono style={{color:colors.right}}>SAĞ · {rxRight}</Copy>}</View>:null}
    </View>
    {leftDuration===1?<StatTiles items={[{label:'Bu ay takılan gün',value:String(worn)},{label:'Kutuda lens',value:String(stock)}]}/>:<>
      {sameDuration?<StatTiles items={[{label:'Açık gün',value:String(elapsed)},{label:'Takılan gün',value:String(worn)},remainingTile]}/>:<><StatTiles items={[{label:'Açık gün',value:String(elapsed)},{label:'Takılan gün',value:String(worn)}]}/><View style={{flexDirection:'row',justifyContent:'space-between',gap:8}}><Copy size={14} bold style={{color:leftExpired?colors.danger:colors.ink}}>SOL · {leftExpired?`+${elapsed-leftDuration} gün aşım`:leftRemaining===0?'Bugün son gün':`${leftRemaining} gün kaldı`}</Copy><Copy size={14} bold style={{color:rightExpired?colors.danger:colors.ink,textAlign:'right'}}>SAĞ · {rightExpired?`+${elapsed-rightDuration} gün aşım`:rightRemaining===0?'Bugün son gün':`${rightRemaining} gün kaldı`}</Copy></View></>}
      {sameDuration&&!separateEyes?progress(left,leftDuration,'SOL',colors.leftText):<View style={{gap:6}}>{progress(left,leftDuration,'SOL',colors.leftText)}{progress(right,rightDuration,'SAĞ',colors.right)}</View>}
    </>}
  </View>;
}

/**
 * Case artwork geometry, measured on assets/contact-lens-case.png (1200×600). The image is drawn
 * slightly zoomed (empty margins cropped) so the caps fill the card; cap faces are ellipses
 * given as fractions of the image. All text sizes derive from the measured case width.
 */
const CASE={zoom:1.12,offsetX:-.06,offsetY:-.055,aspect:2.1,faces:{left:{cx:.296,cy:.44},right:{cx:.70,cy:.455}},faceRx:.142,faceRy:.235} as const;

function CapCount({eye,pack,today,caseWidth}:{eye:'left'|'right';pack?:LensPackage;today:string;caseWidth:number}){
  const {state}=useApp();const box=pack?state.boxes.find(b=>b.id===pack.boxId):undefined;
  const isRight=eye==='right';const ink=isRight?'#FFFFFF':colors.ink;const soft=isRight?'#D3E3FF':'#3A6198';
  const labelSize=clamp(Math.round(caseWidth*.036),11,15);const totalSize=clamp(Math.round(caseWidth*.044),12,19);
  const label=<Copy bold size={labelSize} style={{color:ink,lineHeight:Math.round(labelSize*1.2),letterSpacing:.6}}>{isRight?'SAĞ · R':'SOL · L'}</Copy>;
  if(!pack||!box)return <View style={{alignItems:'center'}}>{label}<Copy size={labelSize+1} style={{color:soft}}>Paket yok</Copy></View>;
  const duration=pack.durationDaysSnapshot??box.durationDays;const elapsed=daysOpen(pack.openedOn,today);
  const monthCount=new Set(state.checkIns.filter(c=>c.status==='worn'&&c.date.slice(0,7)===today.slice(0,7)).map(c=>c.date)).size;
  const count=duration===1?String(monthCount):String(elapsed);const total=duration===1?'/AY':`/${duration}`;
  // Sized from the cap face (not the window) so two- and three-digit counts keep a margin to the rim.
  const base=clamp(Math.round(caseWidth*.13),30,76);const countSize=count.length>=3?Math.round(base*.78):base;
  const overdue=duration>1&&elapsed>duration;
  return <View accessible accessibilityLabel={`${isRight?'Sağ':'Sol'} göz: ${duration===1?`bu ay ${count} gün`:`${count}. gün, ${duration} günlük`}`} style={{alignItems:'center',justifyContent:'center'}}>
    {label}
    <Copy bold size={countSize} style={{color:overdue&&!isRight?colors.danger:ink,lineHeight:Math.round(countSize*1.04),fontVariant:['tabular-nums'],letterSpacing:-.5}}>{count}</Copy>
    <Copy bold mono size={totalSize} style={{color:overdue&&isRight?'#FFD6DB':soft,lineHeight:Math.round(totalSize*1.15)}}>{total}</Copy>
  </View>;
}

function LensCaseArt({left,right,today,estimate}:{left?:LensPackage;right?:LensPackage;today:string;estimate:number}){
  const [measured,setMeasured]=useState(0);const width=measured||estimate;const imageWidth=width*CASE.zoom;const imageHeight=imageWidth/2;
  return <View onLayout={e=>{const w=Math.round(e.nativeEvent.layout.width);if(w&&w!==measured)setMeasured(w);}} style={{width:'100%',aspectRatio:CASE.aspect,overflow:'hidden'}}>
    <Image source={require('../../assets/contact-lens-case.png')} resizeMode="stretch" style={{position:'absolute',left:width*CASE.offsetX,top:width*CASE.offsetY,width:imageWidth,height:imageHeight}} accessibilityLabel="Sol ve sağ lens kutusu"/>
    {(['left','right'] as const).map(eye=>{const face=CASE.faces[eye];const w=imageWidth*CASE.faceRx*2,h=imageHeight*CASE.faceRy*2;const cx=width*CASE.offsetX+imageWidth*face.cx,cy=width*CASE.offsetY+imageHeight*face.cy;
      return <View key={eye} pointerEvents="none" style={{position:'absolute',left:cx-w/2,top:cy-h/2,width:w,height:h,alignItems:'center',justifyContent:'center'}}><CapCount eye={eye} pack={eye==='left'?left:right} today={today} caseWidth={imageWidth}/></View>;})}
  </View>;
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
  const {state,today}=useApp();const markDay=useMarkDay();const motion=useCalmMotion();
  const {page:activePage,setPage,goToPage,registerPager}=useHomePager();
  const {width:windowWidth}=useWindowDimensions();
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
  const [month,setMonth]=useState(today.slice(0,7)+'-01');const [selectedDay,setSelectedDay]=useState(today);
  const right=active.find(p=>p.eye==='right'); const left=active.find(p=>p.eye==='left');
  const leftBox=left?state.boxes.find(b=>b.id===left.boxId):undefined;const rightBox=right?state.boxes.find(b=>b.id===right.boxId):undefined;
  const sharedOpening=!!left&&!!right&&left.openedOn===right.openedOn&&(left.durationDaysSnapshot??leftBox?.durationDays)===(right.durationDaysSnapshot??rightBox?.durationDays);
  const showsProgress=active.some(p=>(p.durationDaysSnapshot??state.boxes.find(b=>b.id===p.boxId)?.durationDays??1)>1);
  const monthRecords=state.dailyStatuses.filter(c=>c.date.slice(0,7)===today.slice(0,7));
  const monthWear=new Set(monthRecords.filter(c=>c.status==='worn').map(c=>c.date)).size;
  const monthGlasses=new Set(monthRecords.filter(c=>c.status==='glasses').map(c=>c.date)).size;
  const openedThisMonth=active.filter(p=>p.openedOn.slice(0,7)===today.slice(0,7)).sort((a,b)=>b.openedOn.localeCompare(a.openedOn))[0];
  const recentAuto=state.dailyStatuses.filter(c=>c.automatic&&c.date<today&&c.date>=addDays(today,-7));
  const recentAutoDates=[...new Set(recentAuto.map(c=>c.date))].sort();
  const yesterday=addDays(today,-1);const yesterdayAuto=recentAuto.filter(c=>c.date===yesterday);
  const statusFor=(records:any[])=>records.length&&records.every(c=>c.status==='worn')?'taktım':records.length&&records.every(c=>c.status==='notWorn')?'takmadım':null;
  const autoStatus=statusFor(yesterdayAuto);
  const autoLine=recentAutoDates.length>1?`${recentAutoDates.length} gün otomatik dolduruldu`:recentAutoDates[0]===yesterday&&autoStatus?`Dün cevap vermedin, ${autoStatus} sayıldı`:recentAutoDates.length===1?'1 gün otomatik dolduruldu':'';
  const activeToday=active.filter(p=>p.openedOn<=today&&(!p.closedOn||p.closedOn>=today));
  const todayRecord=state.dailyStatuses.find(c=>c.date===today);const markedStatus=todayRecord?.status??null;
  const saveStatus=async(status:'worn'|'notWorn'|'glasses',date=today)=>{
    try{await markDay(date,status);}catch(e){Alert.alert('İşlem tamamlanamadı',errorText(e));}
  };
  const changeYesterday=async(status:'worn'|'notWorn'|'glasses')=>saveStatus(status,yesterday);
  const firstDay=parseDate(month),offset=(firstDay.getDay()+6)%7,gridStart=addDays(month,-offset),calendarDays=Array.from({length:42},(_,i)=>addDays(gridStart,i));
  const selectedRecord=state.dailyStatuses.find(c=>c.date===selectedDay);
  const selectedStatus=selectedRecord?.status??null;const selectedAuto=selectedRecord?.automatic??false;const selectedApplicable=state.packages.some(p=>p.openedOn<=selectedDay&&(!p.closedOn||selectedDay<=p.closedOn));
  const canEditSelected=selectedDay<=today&&selectedDay>=addDays(today,-30);
  const entryForDay=(day:string)=>state.dailyStatuses.find(c=>c.date===day);
  const saveSelected=async(status:'worn'|'notWorn'|'glasses')=>saveStatus(status,selectedDay);
  const greeting=useMemo(()=>new Date().getHours()<12?'Merhaba!':new Date().getHours()<18?'İyi günler':'İyi akşamlar',[]);
  const owlLevel=active.reduce<1|2|3>((level,p)=>{const next=packageMascotLevel(p.durationDaysSnapshot??state.boxes.find(b=>b.id===p.boxId)?.durationDays??0,daysOpen(p.openedOn,today));return next>level?next:level;},1);
  const owlText=owlLevel===3?'Baykuş uyarıyor: lens süresi doldu':owlLevel===2?'Baykuş uykulu: değişim yaklaşıyor':'Baykuş neşeli: lensler yeni';
  const glow=owlLevel===3?{borderColor:'#E6A0A7',shadowColor:'#E24455',shadowOpacity:.3,shadowRadius:16,elevation:6}:owlLevel===2?{borderColor:'#E6C48F',shadowColor:'#E9A641',shadowOpacity:.23,shadowRadius:13,elevation:4}:{borderColor:'#C6DCF6',shadowColor:'#7AADE8',shadowOpacity:.14,shadowRadius:10,elevation:3};
  const answerOptions=[{value:'worn',title:'Taktım',icon:'checkmark-circle-outline' as const,selectedColor:colors.right},{value:'notWorn',title:'Takmadım',icon:'close-circle-outline' as const,selectedColor:palette.notWornSelected},{value:'glasses',title:'Gözlük',icon:'glasses-outline' as const,selectedColor:palette.glasses}];
  const onToday=activePage==='today';
  return <Screen dense background={<AmbientBackground/>}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
      <View style={{gap:4,flex:1,minWidth:0,paddingTop:2}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Svg width={44} height={26} viewBox="0 0 58 34"><Ellipse cx={21} cy={15} rx={17} ry={9} transform="rotate(-25 21 15)" fill="#EAF5FF" stroke="#1683E8" strokeWidth={2}/><Ellipse cx={38} cy={20} rx={17} ry={9} transform="rotate(-25 38 20)" fill="#EAF5FF" stroke="#1683E8" strokeWidth={2}/></Svg><Copy size={22} bold style={{color:colors.ink}}>Lensim</Copy><View style={{flex:1}}/><Pressable accessibilityRole="button" accessibilityLabel="Bildirim ayarları" hitSlop={6} onPress={()=>router.push('/settings/notifications')} style={{padding:6}}><Ionicons name="notifications-outline" size={22} color={colors.ink}/></Pressable></View>
        <Copy size={30} bold style={{color:colors.ink,lineHeight:36,marginTop:6}}>{greeting}</Copy>
        <Copy size={15} mono style={{color:'#405B86'}}>{parseDate(today).toLocaleDateString('tr-TR',{day:'numeric',month:'long',weekday:'long'})}</Copy>
      </View>
      <OwlBadge level={owlLevel} label={owlText}/>
    </View>
    {active.length>0&&<View onLayout={onPagerLayout} style={{width:'100%'}}>
     <ScrollView ref={pager} horizontal pagingEnabled nestedScrollEnabled directionalLockEnabled showsHorizontalScrollIndicator={false} decelerationRate="fast" scrollEventThrottle={16} contentOffset={{x:activePage==='calendar'?pageWidth:0,y:0}} onScroll={onPagerScroll} onMomentumScrollEnd={onPagerEnd} onScrollEndDrag={Platform.OS==='web'?onPagerEnd:undefined} style={{width:pageWidth,flexGrow:0,height:pagerHeight}} contentContainerStyle={{alignItems:'flex-start'}}>
     <View onLayout={measurePage('today')} aria-hidden={!onToday} importantForAccessibility={onToday?'auto':'no-hide-descendants'} style={{width:pageWidth,padding:4}}><View style={{backgroundColor:'#FFFFFF',borderWidth:1,borderRadius:16,paddingHorizontal:14,paddingTop:10,paddingBottom:16,gap:14,...glow}}>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
          <Copy size={13} bold mono style={{color:palette.inkSoft,letterSpacing:1}}>LENS KUTUN</Copy>
          <PressScale accessibilityRole="button" accessibilityLabel="Lens döngüsü özetini aç" accessibilityHint="Paket süresi, stok ve takılan günler" hitSlop={6} onPress={()=>router.push('/cycle')} style={{width:40,height:40,borderRadius:20,backgroundColor:'#E8F2FF',borderWidth:1,borderColor:'#C6DCF6',alignItems:'center',justifyContent:'center'}}><Ionicons name="arrow-forward" size={20} color="#0754C8"/></PressScale>
        </View>
        <LensCaseArt left={left} right={right} today={today} estimate={pageWidth-8-30}/>
        {sharedOpening&&left&&right&&<CombinedSummary left={left} right={right} checkIns={state.checkIns} today={today} boxes={state.boxes} separateEyes={state.settings.separateEyeCalendars}/>}
        {!sharedOpening&&(left||right)&&<View style={{flexDirection:'row',gap:14}}>{left&&<CaseSummary pack={left} checkIns={state.checkIns} today={today} compact/>}{right&&<CaseSummary pack={right} checkIns={state.checkIns} today={today} compact/>}</View>}
        {showsProgress&&<ProgressLegend/>}
        <View style={{flexDirection:'row',gap:12,borderTopWidth:1,borderColor:'#D6E5F6',paddingTop:12}}>
          {left&&<Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/package/[id]',params:{id:left.id}})} style={{flex:1,minWidth:0}}><Copy size={14} bold mono style={{color:colors.leftText}}>SOL · {shortDate(left.openedOn)}</Copy><Copy size={15} style={{color:colors.ink}}>{leftBox?.name}</Copy>{leftBox&&<Copy size={14} style={{color:palette.inkSoft}}>Kutuda {leftBox.lensesRemaining} lens</Copy>}</Pressable>}
          {right&&<Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/package/[id]',params:{id:right.id}})} style={{flex:1,minWidth:0,alignItems:'flex-end'}}><Copy size={14} bold mono style={{color:colors.right}}>SAĞ · {shortDate(right.openedOn)}</Copy><Copy size={15} style={{color:colors.ink,textAlign:'right'}}>{rightBox?.name}</Copy>{rightBox&&rightBox.id!==leftBox?.id&&<Copy size={14} style={{color:palette.inkSoft}}>Kutuda {rightBox.lensesRemaining} lens</Copy>}</Pressable>}
        </View>
      </View><View style={{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:4,marginTop:4}}><Pressable accessibilityRole="button" accessibilityLabel="Takvime kaydır" onPress={()=>goToPage('calendar')} style={{minHeight:44,paddingHorizontal:14,borderRadius:999,backgroundColor:'#E8F2FF',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:6}}><Copy size={14} bold style={{color:'#0754C8'}}>Takvim için kaydır</Copy><Ionicons name="arrow-forward" size={16} color="#0754C8"/></Pressable><View style={{flexDirection:'row',alignItems:'center',gap:5}}><View style={{width:8,height:8,borderRadius:4,backgroundColor:'#0754C8'}}/><View style={{width:8,height:8,borderRadius:4,backgroundColor:'#AFC8E8'}}/><Copy size={14} muted>2 sayfadan 1’i</Copy></View></View></View>
     <View onLayout={measurePage('calendar')} aria-hidden={onToday} importantForAccessibility={onToday?'no-hide-descendants':'auto'} style={{width:pageWidth,padding:4}}><Card style={{borderRadius:16,padding:14,gap:10,...glow}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Pressable accessibilityRole="button" accessibilityLabel="Önceki ay" onPress={()=>setMonth(addMonths(month,-1))} style={{width:48,height:48,alignItems:'center',justifyContent:'center'}}><Ionicons name="chevron-back" size={24} color={colors.ink}/></Pressable><Copy size={16} bold>{firstDay.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}</Copy><Pressable accessibilityRole="button" accessibilityLabel="Sonraki ay" disabled={month.slice(0,7)>=today.slice(0,7)} onPress={()=>setMonth(addMonths(month,1)>today.slice(0,7)+'-01'?today.slice(0,7)+'-01':addMonths(month,1))} style={{width:48,height:48,alignItems:'center',justifyContent:'center',opacity:month.slice(0,7)>=today.slice(0,7)?.3:1}}><Ionicons name="chevron-forward" size={24} color={colors.ink}/></Pressable></View>
      <View style={{flexDirection:'row'}}>{['Pt','Sa','Ça','Pe','Cu','Ct','Pz'].map(d=><View key={d} style={{flex:1,alignItems:'center'}}><Copy size={14} muted>{d}</Copy></View>)}</View>
      <View style={{flexDirection:'row',flexWrap:'wrap'}}>{calendarDays.map(day=>{const entry=entryForDay(day);const tone=dayTone(entry);const isSelected=selectedDay===day;return <Pressable key={day} accessibilityRole="button" accessibilityLabel={`${formatDate(day)} · ${tone.label}`} accessibilityState={{selected:isSelected}} onPress={()=>setSelectedDay(day)} style={{width:'14.285%',height:48,padding:2,opacity:day.slice(0,7)===month.slice(0,7)?1:.35}}><View style={{flex:1,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:tone.fill,borderWidth:isSelected?2:entry?.automatic?1:0,borderStyle:entry?.automatic&&!isSelected?'dashed':'solid',borderColor:isSelected?colors.ink:'#7C93B5'}}><Copy size={15} bold={day===today||isSelected} style={{color:tone.text,lineHeight:18}}>{Number(day.slice(-2))}</Copy>{entry?.status==='glasses'&&<Ionicons name="glasses-outline" size={11} color={tone.text}/>}</View></Pressable>})}</View>
      <View style={{flexDirection:'row',justifyContent:'space-between'}}><Copy size={15} bold style={{color:colors.right}}>Bu ay {monthWear} gün lens</Copy><Copy size={15} bold style={{color:palette.glassesText}}>{monthGlasses} gün gözlük</Copy></View>{openedThisMonth&&<Copy size={14} muted>Bu ay açılan paket · {daysOpen(openedThisMonth.openedOn,today)} gündür açık</Copy>}<View style={{gap:8,borderTopWidth:1,borderColor:'#D6E5F6',paddingTop:10}}><Copy size={16} bold>{formatDate(selectedDay)} · {selectedStatus==='worn'?'Lens taktın':selectedStatus==='glasses'?'Gözlük taktın':selectedStatus==='notWorn'?'Lens takmadın':'Kayıt yok'}{selectedAuto?' (otomatik)':''}</Copy>
      {selectedDay>today?<Copy size={14} muted>Gelecek günler işaretlenemez.</Copy>:!canEditSelected?<Copy size={14} muted>30 günden eski günler yalnızca görüntülenir.</Copy>:<SegmentedControl label="Seçili günü düzelt" selected={selectedAuto?'none':selectedStatus??'none'} onChange={value=>saveSelected(value as 'worn'|'notWorn'|'glasses')} options={answerOptions.map(({icon,...option})=>option.value==='glasses'?{...option,icon}:option)}/>}
      {selectedAuto&&canEditSelected&&<Copy size={14} muted>Bu gün cevapsız kaldığı için otomatik sayıldı. Doğru değilse yukarıdan düzelt.</Copy>}
      {!selectedApplicable&&selectedDay<=today&&canEditSelected&&<Copy size={14} muted>Bu gün açık paketin yoktu. “Taktım” dersen paketin açılış tarihini bu güne almayı önereceğiz.</Copy>}</View>
      <Button title="Birden çok günü düzenle" secondary icon="calendar-outline" onPress={()=>router.push({pathname:'/days',params:{date:selectedDay}})}/>
     </Card><View style={{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:4}}><View style={{flexDirection:'row',alignItems:'center',gap:5}}><View style={{width:8,height:8,borderRadius:4,backgroundColor:'#AFC8E8'}}/><View style={{width:8,height:8,borderRadius:4,backgroundColor:'#0754C8'}}/><Copy size={14} muted>2 sayfadan 2’si</Copy></View><Pressable accessibilityRole="button" accessibilityLabel="Lens kutusuna kaydır" onPress={()=>goToPage('today')} style={{minHeight:44,paddingHorizontal:14,borderRadius:999,backgroundColor:'#E8F2FF',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:6}}><Ionicons name="arrow-back" size={16} color="#0754C8"/><Copy size={14} bold style={{color:'#0754C8'}}>Lens kutusu</Copy></Pressable></View></View>
    </ScrollView></View>}
    {!active.length&&<Card style={{borderRadius:16,borderColor:'#BBD5F1'}}><Copy size={22} bold style={{color:colors.ink}}>İlk lens paketini ekle</Copy><Copy>Önce kutunu ve hangi göz için olduğunu seç. Sayım açılış gününden başlar.</Copy><Button title="İlk lens paketini ekle" icon="add" onPress={()=>router.push('/package/new')}/></Card>}
    {activeToday.length>0&&<View style={{gap:9}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Copy bold size={18} style={{flex:1,color:colors.ink}}>Bugün lens taktın mı?</Copy><Copy size={14} muted>{monthWear} gün bu ay</Copy></View>
      <SegmentedControl label="Bugünkü lens kullanımı" selected={markedStatus??'none'} onChange={value=>saveStatus(value as 'worn'|'notWorn'|'glasses')} options={answerOptions}/>
      <Copy size={14} muted>Cevap iki göz için birlikte kaydedilir.</Copy>
    </View>}

    {active.length>0&&<Button title="Yeni paket açtım" secondary icon="add" onPress={()=>router.push('/package/new')}/>}
    {!!autoLine&&<Card style={{borderRadius:12,borderColor:'#B9D1F3',backgroundColor:'#F3F8FF'}}><Copy bold>{autoLine}</Copy>{yesterdayAuto.length>0?<View style={{flexDirection:'row',gap:8}}><View style={{flex:1}}><Button title="Dün taktım" secondary onPress={()=>changeYesterday('worn')}/></View><View style={{flex:1}}><Button title="Dün takmadım" secondary onPress={()=>changeYesterday('notWorn')}/></View></View>:<Button title="Takvimde kontrol et" secondary onPress={()=>goToPage('calendar')}/>}</Card>}
  </Screen>;
}

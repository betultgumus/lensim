import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, Card, Copy, Screen,SegmentedControl } from '../../src/components/ui';
import { useApp, uid, errorText } from '../../src/state/AppContext';
import {useHomePager,type HomePage} from '../../src/state/HomePagerContext';
import { useMarkDay } from '../../src/state/useMarkDay';
import { addDays, addMonths, durationLabel as durationName, formatDate, getDaysRemaining, packageMascotLevel, parseDate, shortDate } from '../../src/domain/dates';
import { dayTone, palette } from '../../src/design/dayTone';
import { type LensPackage } from '../../src/domain/types';

const colors = { right:palette.right, left:palette.left, leftText:palette.leftText, ink:palette.ink, warning:palette.warning, danger:palette.danger };
/** Progress strip: one cell per day up to 30 days, otherwise a continuous bar. */
function Progress({pack,duration,checkIns,today,height=9}:{pack:LensPackage;duration:number;checkIns:any[];today:string;height?:number}){
  if(duration>30){const elapsed=daysOpen(pack.openedOn,today);const ratio=Math.min(1,elapsed/duration);return <View accessibilityLabel={`${duration} günün ${elapsed}. günü`} style={{height,borderRadius:height/2,backgroundColor:palette.empty,overflow:'hidden'}}><View style={{width:`${ratio*100}%`,height:'100%',backgroundColor:elapsed>duration?colors.danger:colors.right}}/></View>;}
  return <View accessibilityLabel={`${daysOpen(pack.openedOn,today)} gündür açık`} style={{flexDirection:'row',gap:2}}>{Array.from({length:duration},(_,i)=>i+1).map(day=>{const date=addDays(pack.openedOn,day-1);const entry=checkIns.find(c=>c.packageId===pack.id&&c.date===date);const tone=dayTone(entry);return <View key={day} style={{height,flex:1,backgroundColor:entry?tone.fill:date<=today?'#DCE4EE':'#EEF1F5',borderRadius:2}}/>;})}</View>;
}
const daysOpen = (start:string,today:string) => Math.max(1,getDaysRemaining(today,start)+1);

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
      <Copy size={compact?16:17} style={{color:colors.ink}}>{duration===1?`Bu ay ${wornThisMonth} gün taktın · Kutuda ${box.lensesRemaining} lens`:`${elapsed} gündür açık · ${wornDays} gün taktın · ${remaining} gün kaldı`}</Copy>
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
  return <View style={{gap:10}}>
    <View style={{alignItems:'center',gap:6}}>
      {sameDuration?<View style={{backgroundColor:'#D7E9FF',borderRadius:20,paddingHorizontal:18,paddingVertical:6}}><Copy size={15} bold style={{color:colors.ink}}>{durationLabel(leftDuration)}</Copy></View>:<View style={{flexDirection:'row',gap:8}}><View style={{backgroundColor:'#EAF4FF',borderRadius:20,paddingHorizontal:12,paddingVertical:6}}><Copy size={14} bold style={{color:colors.leftText}}>SOL · {durationLabel(leftDuration)}</Copy></View><View style={{backgroundColor:'#EAF4FF',borderRadius:20,paddingHorizontal:12,paddingVertical:6}}><Copy size={14} bold style={{color:colors.right}}>SAĞ · {durationLabel(rightDuration)}</Copy></View></View>}
      {sharedRx&&!!rxLeft?<Copy size={14} mono style={{color:colors.ink,textAlign:'center'}}>{rxLeft}</Copy>:(!sharedRx&&!!(rxLeft||rxRight))?<View style={{gap:2,alignItems:'center'}}>{!!rxLeft&&<Copy size={14} mono style={{color:colors.leftText}}>SOL · {rxLeft}</Copy>}{!!rxRight&&<Copy size={14} mono style={{color:colors.right}}>SAĞ · {rxRight}</Copy>}</View>:null}
    </View>
    {leftDuration===1?<Copy size={17} bold style={{color:colors.ink,textAlign:'center'}}>Bu ay {worn} gün taktın · Kutuda {leftBox.id===rightBox.id?leftBox.lensesRemaining:leftBox.lensesRemaining+rightBox.lensesRemaining} lens</Copy>:<>
      {sameDuration?<Copy size={17} style={{color:leftExpired?colors.danger:colors.ink,textAlign:'center'}}>{leftExpired?`${elapsed} gündür açık · ${worn} gün taktın · +${elapsed-leftDuration} gün aşım`:leftRemaining===0?`${elapsed} gündür açık · ${worn} gün taktın · Bugün son gün`:`${elapsed} gündür açık · ${worn} gün taktın · ${leftRemaining} gün kaldı`}</Copy>:<><Copy size={17} style={{color:colors.ink,textAlign:'center'}}>{elapsed} gündür açık · {worn} gün taktın</Copy><View style={{flexDirection:'row',justifyContent:'space-between'}}><Copy size={14} bold style={{color:leftExpired?colors.danger:colors.ink}}>SOL · {leftExpired?`+${elapsed-leftDuration} gün aşım`:leftRemaining===0?'Bugün son gün':`${leftRemaining} gün kaldı`}</Copy><Copy size={14} bold style={{color:rightExpired?colors.danger:colors.ink}}>SAĞ · {rightExpired?`+${elapsed-rightDuration} gün aşım`:rightRemaining===0?'Bugün son gün':`${rightRemaining} gün kaldı`}</Copy></View></>}
      {sameDuration&&!separateEyes?progress(left,leftDuration,'SOL',colors.leftText):<View style={{gap:6}}>{progress(left,leftDuration,'SOL',colors.leftText)}{progress(right,rightDuration,'SAĞ',colors.right)}</View>}
    </>}
  </View>;
}

function CapCount({pack,today}:{pack?:LensPackage;today:string}){
  const {width:windowWidth}=useWindowDimensions();
  const {state}=useApp();const box=pack?state.boxes.find(b=>b.id===pack.boxId):undefined;
  const isRight=pack?.eye==='right';const color=isRight?'#FFFFFF':'#2F5A92';
  if(!pack||!box)return <View pointerEvents="none" style={{alignItems:'center'}}><Copy bold size={15} style={{color}}>{isRight?'SAĞ · R':'SOL · L'}</Copy><Copy size={14} style={{color}}>Paket yok</Copy></View>;
  const duration=pack.durationDaysSnapshot??box.durationDays;const elapsed=daysOpen(pack.openedOn,today);
  const monthCount=new Set(state.checkIns.filter(c=>c.status==='worn'&&c.date.slice(0,7)===today.slice(0,7)).map(c=>c.date)).size;
  const count=duration===1?String(monthCount):String(elapsed);const total=duration===1?'/AY':`/${duration}`;
  // The count fills most of the cap: two caps share the card width, so the size follows the screen.
  const capWidth=Math.min(windowWidth-48,592)*.3;const countSize=Math.round(Math.min(96,Math.max(36,capWidth*.56)));
  return <View pointerEvents="none" accessible accessibilityLabel={`${isRight?'Sağ':'Sol'} göz: ${duration===1?`bu ay ${count} gün`:`${count}. gün, ${duration} günlük`}`} style={{alignItems:'center',justifyContent:'center'}}><Copy bold size={14} style={{color:isRight?'#FFFFFF':colors.ink,lineHeight:16}}>{windowWidth<360?(isRight?'SAĞ·R':'SOL·L'):(isRight?'SAĞ · R':'SOL · L')}</Copy><Copy bold size={countSize} style={{color:isRight?'#FFFFFF':colors.ink,lineHeight:Math.round(countSize*1.02),fontVariant:['tabular-nums']}}>{count}</Copy><Copy bold size={14} style={{color:isRight?'#D8E8FF':'#2F5A92',lineHeight:16}}>{total}</Copy></View>;
}

export default function Home() {
  const {state,dispatch,today}=useApp();const markDay=useMarkDay();
  const {page:activePage,setPage,goToPage,registerPager}=useHomePager();
  const {width:windowWidth}=useWindowDimensions();const pageWidth=Math.min(windowWidth-48,592);
  const pager=useRef<ScrollViewInstance|null>(null);const pagerInitialized=useRef(false);
  const initialPage:HomePage=activePage;
  useEffect(()=>registerPager(page=>pager.current?.scrollTo({x:page==='calendar'?pageWidth:0,y:0,animated:true})),[registerPager,pageWidth]);
  const [month,setMonth]=useState(today.slice(0,7)+'-01');const [selectedDay,setSelectedDay]=useState(today);
  const active=state.packages.filter(p=>!p.closedOn&&p.openedOn<=today);
  const right=active.find(p=>p.eye==='right'); const left=active.find(p=>p.eye==='left');
  const leftBox=left?state.boxes.find(b=>b.id===left.boxId):undefined;const rightBox=right?state.boxes.find(b=>b.id===right.boxId):undefined;
  const sharedOpening=!!left&&!!right&&left.openedOn===right.openedOn&&(left.durationDaysSnapshot??leftBox?.durationDays)===(right.durationDaysSnapshot??rightBox?.durationDays);
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
  const saveStatus=async(status:'worn'|'notWorn'|'glasses',date=today,automatic=false)=>{
    try{await markDay(date,status);}catch(e){Alert.alert('İşlem tamamlanamadı',errorText(e));}
  };
  const changeYesterday=async(status:'worn'|'notWorn'|'glasses')=>saveStatus(status,yesterday,false);
  const firstDay=parseDate(month),offset=(firstDay.getDay()+6)%7,gridStart=addDays(month,-offset),calendarDays=Array.from({length:42},(_,i)=>addDays(gridStart,i));
  const selectedEntries=state.checkIns.filter(c=>c.date===selectedDay),selectedRecord=state.dailyStatuses.find(c=>c.date===selectedDay);
  const selectedStatus=selectedRecord?.status??null;const selectedAuto=selectedRecord?.automatic??false;const selectedApplicable=state.packages.some(p=>p.openedOn<=selectedDay&&(!p.closedOn||selectedDay<=p.closedOn));
  const canEditSelected=selectedDay<=today&&selectedDay>=addDays(today,-30);
  const monthDates=new Set(monthRecords.map(c=>c.date));
  const entryForDay=(day:string,eye?:'left'|'right')=>eye?state.checkIns.find(c=>c.date===day&&state.packages.some(p=>p.id===c.packageId&&p.eye===eye)):state.dailyStatuses.find(c=>c.date===day);
  const saveSelected=async(status:'worn'|'notWorn'|'glasses')=>saveStatus(status,selectedDay,false);
  const greeting=useMemo(()=>new Date().getHours()<12?'Merhaba!':new Date().getHours()<18?'İyi günler':'İyi akşamlar',[]);
  const owlLevel=active.reduce<1|2|3>((level,p)=>{const next=packageMascotLevel(p.durationDaysSnapshot??state.boxes.find(b=>b.id===p.boxId)?.durationDays??0,daysOpen(p.openedOn,today));return next>level?next:level;},1);
  const owlText=owlLevel===3?'Baykuş uyarıyor: lens süresi doldu':owlLevel===2?'Baykuş uykulu: değişim yaklaşıyor':'Baykuş neşeli: lensler yeni';
  const glow=owlLevel===3?{borderColor:'#E6A0A7',shadowColor:'#E24455',shadowOpacity:.3,shadowRadius:16,elevation:6}:owlLevel===2?{borderColor:'#E6C48F',shadowColor:'#E9A641',shadowOpacity:.23,shadowRadius:13,elevation:4}:{borderColor:'#C6DCF6',shadowColor:'#7AADE8',shadowOpacity:.12,shadowRadius:7,elevation:2};
  return <Screen>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',minHeight:104}}>
      <View style={{gap:5,flex:1}}><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Svg width={50} height={30} viewBox="0 0 58 34"><Ellipse cx={21} cy={15} rx={17} ry={9} transform="rotate(-25 21 15)" fill="#EAF5FF" stroke="#1683E8" strokeWidth={2}/><Ellipse cx={38} cy={20} rx={17} ry={9} transform="rotate(-25 38 20)" fill="#EAF5FF" stroke="#1683E8" strokeWidth={2}/></Svg><Copy size={28} bold style={{color:colors.ink}}>Lensim</Copy></View><Copy size={28} bold style={{color:colors.ink}}>{greeting}</Copy><Copy size={15} mono style={{color:'#405B86'}}>{parseDate(today).toLocaleDateString('tr-TR',{day:'numeric',month:'long',weekday:'long'})}</Copy></View>
      <View style={{alignItems:'center',justifyContent:'flex-end',width:100,height:104}}><Pressable accessibilityRole="button" accessibilityLabel="Bildirim ayarları" onPress={()=>router.push('/settings/notifications')} style={{padding:5,alignSelf:'flex-end'}}><Ionicons name="notifications-outline" size={22} color={colors.ink}/></Pressable><Image source={owlLevel===3?require('../../assets/owl-3-red-eyes.png'):owlLevel===2?require('../../assets/owl-2-cheek-sleepy.png'):require('../../assets/owl-1-lively.png')} resizeMode="contain" style={{width:94,height:86}} accessibilityLabel={owlText}/></View>
    </View>
    {active.length>0&&<ScrollView ref={pager} horizontal pagingEnabled nestedScrollEnabled showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={pageWidth} contentOffset={{x:initialPage==='calendar'?pageWidth:0,y:0}} onMomentumScrollEnd={event=>setPage(event.nativeEvent.contentOffset.x<pageWidth/2?'today':'calendar')} onContentSizeChange={()=>{if(!pagerInitialized.current){pager.current?.scrollTo({x:initialPage==='calendar'?pageWidth:0,y:0,animated:false});pagerInitialized.current=true;}}} style={{width:pageWidth,flexGrow:0}}>
     <View style={{width:pageWidth,padding:4}}><View style={{backgroundColor:'#F8FBFF',borderWidth:1,borderRadius:8,padding:16,gap:14,...glow}}>
        <View style={{width:'100%',aspectRatio:2,position:'relative'}}>
          <Image source={require('../../assets/contact-lens-case.png')} resizeMode="stretch" style={{width:'100%',height:'100%'}} accessibilityLabel="Sol ve sağ lens kutusu"/>
          <View style={{position:'absolute',left:'14.2%',width:'30%',top:0,bottom:0,alignItems:'center',justifyContent:'center'}}><CapCount pack={left} today={today}/></View>
          <View style={{position:'absolute',left:'54.8%',width:'30%',top:0,bottom:0,alignItems:'center',justifyContent:'center'}}><CapCount pack={right} today={today}/></View>
        </View>
        {sharedOpening&&left&&right&&<CombinedSummary left={left} right={right} checkIns={state.checkIns} today={today} boxes={state.boxes} separateEyes={state.settings.separateEyeCalendars}/>}
        {!sharedOpening&&(left||right)&&<View style={{flexDirection:'row',gap:14}}>{left&&<CaseSummary pack={left} checkIns={state.checkIns} today={today} compact/>}{right&&<CaseSummary pack={right} checkIns={state.checkIns} today={today} compact/>}</View>}
        <View style={{flexDirection:'row',gap:12,borderTopWidth:1,borderColor:'#D6E5F6',paddingTop:12}}>
          {left&&<Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/package/[id]',params:{id:left.id}})} style={{flex:1,minWidth:0}}><Copy size={14} bold mono style={{color:colors.leftText}}>SOL · {shortDate(left.openedOn)}</Copy><Copy size={15} style={{color:colors.ink}}>{leftBox?.name}</Copy>{leftBox&&<Copy size={14} style={{color:palette.inkSoft}}>Kutuda {leftBox.lensesRemaining} lens</Copy>}</Pressable>}
          {right&&<Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/package/[id]',params:{id:right.id}})} style={{flex:1,minWidth:0,alignItems:'flex-end'}}><Copy size={14} bold mono style={{color:colors.right}}>SAĞ · {shortDate(right.openedOn)}</Copy><Copy size={15} style={{color:colors.ink}}>{rightBox?.name}</Copy>{rightBox&&rightBox.id!==leftBox?.id&&<Copy size={14} style={{color:palette.inkSoft}}>Kutuda {rightBox.lensesRemaining} lens</Copy>}</Pressable>}
        </View>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,justifyContent:'center'}}>{[[palette.right,'Lens taktım'],[palette.left,'Lens takmadım'],[palette.glasses,'Gözlük taktım'],['#D7DEE8','Kalan gün'],['#B9D1F3','Otomatik (soluk)']] .map(([color,label])=><View key={label} style={{flexDirection:'row',alignItems:'center',gap:5}}><View style={{width:10,height:10,borderRadius:2,backgroundColor:color}}/><Copy size={14} muted>{label}</Copy></View>)}</View>
      </View><View style={{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:8,marginTop:4}}><Pressable accessibilityRole="button" accessibilityLabel="Takvime kaydır" onPress={()=>goToPage('calendar')} style={{minHeight:44,paddingHorizontal:14,borderRadius:999,backgroundColor:'#E8F2FF',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:6}}><Copy size={14} bold style={{color:'#0754C8'}}>Takvim için kaydır</Copy><Ionicons name="arrow-forward" size={16} color="#0754C8"/></Pressable><View style={{flexDirection:'row',alignItems:'center',gap:5}}><View style={{width:8,height:8,borderRadius:4,backgroundColor:'#0754C8'}}/><View style={{width:8,height:8,borderRadius:4,backgroundColor:'#AFC8E8'}}/><Copy size={14} muted>2 sayfadan 1’i</Copy></View></View></View>
     <View style={{width:pageWidth,padding:4}}><Card style={{borderRadius:8,padding:14,gap:10,...glow}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Pressable accessibilityRole="button" accessibilityLabel="Önceki ay" onPress={()=>setMonth(addMonths(month,-1))} style={{width:48,height:48,alignItems:'center',justifyContent:'center'}}><Ionicons name="chevron-back" size={24} color={colors.ink}/></Pressable><Copy size={16} bold>{firstDay.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}</Copy><Pressable accessibilityRole="button" accessibilityLabel="Sonraki ay" disabled={month.slice(0,7)>=today.slice(0,7)} onPress={()=>setMonth(addMonths(month,1)>today.slice(0,7)+'-01'?today.slice(0,7)+'-01':addMonths(month,1))} style={{width:48,height:48,alignItems:'center',justifyContent:'center',opacity:month.slice(0,7)>=today.slice(0,7)?.3:1}}><Ionicons name="chevron-forward" size={24} color={colors.ink}/></Pressable></View>
      <View style={{flexDirection:'row'}}>{['Pt','Sa','Ça','Pe','Cu','Ct','Pz'].map(d=><View key={d} style={{flex:1,alignItems:'center'}}><Copy size={14} muted>{d}</Copy></View>)}</View>
      <View style={{flexDirection:'row',flexWrap:'wrap'}}>{calendarDays.map(day=>{const entry=entryForDay(day);const tone=dayTone(entry);const isSelected=selectedDay===day;return <Pressable key={day} accessibilityRole="button" accessibilityLabel={`${formatDate(day)} · ${tone.label}`} accessibilityState={{selected:isSelected}} onPress={()=>setSelectedDay(day)} style={{width:'14.285%',height:48,padding:2,opacity:day.slice(0,7)===month.slice(0,7)?1:.35}}><View style={{flex:1,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:tone.fill,borderWidth:isSelected?2:entry?.automatic?1:0,borderStyle:entry?.automatic&&!isSelected?'dashed':'solid',borderColor:isSelected?colors.ink:'#7C93B5'}}><Copy size={15} bold={day===today||isSelected} style={{color:tone.text,lineHeight:18}}>{Number(day.slice(-2))}</Copy>{entry?.status==='glasses'&&<Ionicons name="glasses-outline" size={11} color={tone.text}/>}</View></Pressable>})}</View>
      <View style={{flexDirection:'row',justifyContent:'space-between'}}><Copy size={15} bold style={{color:colors.right}}>Bu ay {monthWear} gün lens</Copy><Copy size={15} bold style={{color:palette.glassesText}}>{monthGlasses} gün gözlük</Copy></View>{openedThisMonth&&<Copy size={14} muted>Bu ay açılan paket · {daysOpen(openedThisMonth.openedOn,today)} gündür açık</Copy>}<View style={{gap:8,borderTopWidth:1,borderColor:'#D6E5F6',paddingTop:10}}><Copy size={16} bold>{formatDate(selectedDay)} · {selectedStatus==='worn'?'Lens taktın':selectedStatus==='glasses'?'Gözlük taktın':selectedStatus==='notWorn'?'Lens takmadın':'Kayıt yok'}{selectedAuto?' (otomatik)':''}</Copy>
      {selectedDay>today?<Copy size={14} muted>Gelecek günler işaretlenemez.</Copy>:!canEditSelected?<Copy size={14} muted>30 günden eski günler yalnızca görüntülenir.</Copy>:<SegmentedControl label="Seçili günü düzelt" selected={selectedAuto?'none':selectedStatus??'none'} onChange={value=>saveSelected(value as 'worn'|'notWorn'|'glasses')} options={[{value:'worn',title:'Taktım',selectedColor:colors.right},{value:'notWorn',title:'Takmadım',selectedColor:colors.left,selectedTextColor:colors.ink},{value:'glasses',title:'Gözlük',icon:'glasses-outline',selectedColor:palette.glasses}]}/>}
      {selectedAuto&&canEditSelected&&<Copy size={14} muted>Bu gün cevapsız kaldığı için otomatik sayıldı. Doğru değilse yukarıdan düzelt.</Copy>}
      {!selectedApplicable&&selectedDay<=today&&canEditSelected&&<Copy size={14} muted>Bu gün açık paketin yoktu. “Taktım” dersen paketin açılış tarihini bu güne almayı önereceğiz.</Copy>}</View>
      <Button title="Birden çok günü düzenle" secondary icon="calendar-outline" onPress={()=>router.push({pathname:'/days',params:{date:selectedDay}})}/>
     </Card><View style={{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:8}}><View style={{flexDirection:'row',alignItems:'center',gap:5}}><View style={{width:8,height:8,borderRadius:4,backgroundColor:'#AFC8E8'}}/><View style={{width:8,height:8,borderRadius:4,backgroundColor:'#0754C8'}}/><Copy size={14} muted>2 sayfadan 2’si</Copy></View><Pressable accessibilityRole="button" accessibilityLabel="Lens kutusuna kaydır" onPress={()=>goToPage('today')} style={{minHeight:44,paddingHorizontal:14,borderRadius:999,backgroundColor:'#E8F2FF',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:6}}><Ionicons name="arrow-back" size={16} color="#0754C8"/><Copy size={14} bold style={{color:'#0754C8'}}>Lens kutusu</Copy></Pressable></View></View>
    </ScrollView>}
    {!active.length&&<Card style={{borderRadius:8,borderColor:'#BBD5F1'}}><Copy size={22} bold style={{color:colors.ink}}>İlk lens paketini ekle</Copy><Copy>Önce kutunu ve hangi göz için olduğunu seç. Sayım açılış gününden başlar.</Copy><Button title="İlk lens paketini ekle" icon="add" onPress={()=>router.push('/package/new')}/></Card>}
    {activeToday.length>0&&<View style={{gap:9}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Copy bold size={18} style={{flex:1,color:colors.ink}}>Bugün lens taktın mı?</Copy><Copy size={14} muted>{monthWear} gün bu ay</Copy></View>
      <SegmentedControl label="Bugünkü lens kullanımı" selected={markedStatus??'none'} onChange={value=>saveStatus(value as 'worn'|'notWorn'|'glasses')} options={[{value:'worn',title:'Taktım',icon:'checkmark-circle-outline',selectedColor:colors.right},{value:'notWorn',title:'Takmadım',icon:'close-circle-outline',selectedColor:colors.left,selectedTextColor:colors.ink},{value:'glasses',title:'Gözlük',icon:'glasses-outline',selectedColor:palette.glasses}]}/>
      <Copy size={14} muted>Cevap iki göz için birlikte kaydedilir.</Copy>
    </View>}
    
    {active.length>0&&<Button title="Yeni paket açtım" secondary icon="add" onPress={()=>router.push('/package/new')}/>}
    {!!autoLine&&<Card style={{borderRadius:12,borderColor:'#B9D1F3',backgroundColor:'#F3F8FF'}}><Copy bold>{autoLine}</Copy>{yesterdayAuto.length>0?<View style={{flexDirection:'row',gap:8}}><View style={{flex:1}}><Button title="Dün taktım" secondary onPress={()=>changeYesterday('worn')}/></View><View style={{flex:1}}><Button title="Dün takmadım" secondary onPress={()=>changeYesterday('notWorn')}/></View></View>:<Button title="Takvimde kontrol et" secondary onPress={()=>goToPage('calendar')}/>}</Card>}
  </Screen>;
}


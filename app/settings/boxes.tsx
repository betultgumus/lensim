import React from 'react';
import {router} from 'expo-router';
import {Button,Card,Copy,Row,Screen} from '../../src/components/ui';
import {useApp} from '../../src/state/AppContext';
export default function Boxes(){const {state}=useApp();return <Screen title="Lens kutularım" subtitle="Her fiziksel kutuyu ayrı ve farklı isimle kaydet." back>{state.boxes.length===0?<Copy muted>Henüz lens kutusu eklenmedi.</Copy>:state.boxes.map(box=><Card key={box.id} style={{borderRadius:16}}><Row title={box.name} detail={`${box.brand||'Marka eklenmemiş'} · ${box.lensesRemaining}/${box.lensesTotal} lens · ${box.durationDays} gün · ${box.eyes.map(e=>e==='right'?'Sağ':'Sol').join(' + ')}`} icon="albums-outline" onPress={()=>router.push({pathname:'/box/[id]',params:{id:box.id}})}/></Card>)}<Button title="Yeni lens kutusu ekle" icon="add" onPress={()=>router.push('/box/new')}/><Button title="Bu kutudan yeni paket aç" secondary onPress={()=>router.push('/package/new')}/></Screen>}

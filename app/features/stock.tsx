import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Chip, Copy, Field, PagedList, Screen, Toggle, styles } from '../../src/components/ui';
import { useApp, uid } from '../../src/state/AppContext';
import { formatDate } from '../../src/domain/dates';
export default function Stock() {
  const { state,dispatch,today }=useApp(); const [amount,setAmount]=useState(''); const [mode,setMode]=useState<'add'|'set'>('add');
  if(!state.modules.stock)return <Screen title="Lens stoğu kapalı" back><Copy>Özellikler ekranından açabilirsin. Önceki verilerin korunuyor.</Copy></Screen>;
  const unit=state.stock.unit==='pairs' ? 'çift' : 'lens';
  return <Screen title="Yeni başlangıçların." subtitle="Lens stoğunu kolayca takip et." back>
    <Card><Copy size={48} bold>{state.stock.unit==='pairs' ? state.stock.pieces/2 : state.stock.pieces} <Copy size={22}>{unit}</Copy></Copy><Copy muted>{state.stock.pieces} tek lens · bir çift = 2 lens</Copy>{state.stock.pieces<=2 && <Copy>Stoğun azaldı. Bir sonraki değişimden önce kontrol et.</Copy>}</Card>
    <View style={styles.wrap}><Chip title="Çift olarak göster" selected={state.stock.unit==='pairs'} onPress={()=>dispatch({ type:'stockSettings',autoDeduct:state.stock.autoDeduct,unit:'pairs' })}/><Chip title="Tek lens olarak göster" selected={state.stock.unit==='pieces'} onPress={()=>dispatch({ type:'stockSettings',autoDeduct:state.stock.autoDeduct,unit:'pieces' })}/></View>
    {state.modules.separate && <Copy size={12} muted>Ayrı takipte her göz için 1 lens düşer. Stok ortak toplamdır; farklı numaraları fiziksel olarak ayrıca kontrol et. Yarım çift = 1 lens.</Copy>}
    <Toggle title="Değişimde stoktan düş" description="Birlikte takipte 2, ayrı takipte 1 lens. Stok sıfırın altına inmez." value={state.stock.autoDeduct} onChange={autoDeduct=>dispatch({ type:'stockSettings',autoDeduct,unit:state.stock.unit })}/>
    <View style={styles.wrap}><Chip title="Stok ekle" selected={mode==='add'} onPress={()=>setMode('add')}/><Chip title="Toplamı düzelt" selected={mode==='set'} onPress={()=>setMode('set')}/></View>
    <Field label={`${mode==='add' ? 'Eklenecek' : 'Yeni toplam'} ${unit} sayısı`} value={amount} onChange={setAmount} numeric/>
    <Button title="Stoğu kaydet" onPress={async()=>{ if(!amount.trim())throw new Error('Miktar gir.'); const pieces=Number(amount.replace(',','.'))*(state.stock.unit==='pairs' ? 2 : 1); if(!Number.isInteger(pieces)||pieces<0)throw new Error('Geçerli miktar gir.'); await dispatch({ type:'stock',pieces:mode==='add' ? state.stock.pieces+pieces : pieces,reason:mode==='add' ? 'Stok eklendi' : 'Stok düzeltildi',id:uid(),date:today }); setAmount(''); }}/>
    <Copy bold>Stok hareketleri</Copy>{state.movements.length===0 ? <Copy muted>İlk stok işlemin burada görünecek.</Copy> : <PagedList items={[...state.movements].reverse()} renderItem={m=><Card style={{ marginBottom:10 }}><Copy bold>{m.delta>0 ? '+' : ''}{m.delta} lens · {m.reason}</Copy><Copy muted size={12}>{formatDate(m.date)}</Copy></Card>}/>}
  </Screen>;
}

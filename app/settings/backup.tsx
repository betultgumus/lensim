import React,{useState} from 'react';
import {Platform,Share,View} from 'react-native';
import {Button,Copy,Field,Screen} from '../../src/components/ui';
import {useApp} from '../../src/state/AppContext';
export default function Backup(){
 const {state,dispatch}=useApp();const [payload,setPayload]=useState('');
 const exportData=async()=>{const json=JSON.stringify({...state,exportedAt:new Date().toISOString(),product:'Lensim'},null,2);
  if(Platform.OS==='web') {const blob=new Blob([json],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`lensim-yedek-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);}
  else await Share.share({title:'Lensim veri yedeği',message:json});
 };
 const restore=async()=>{const parsed=JSON.parse(payload);delete parsed.exportedAt;delete parsed.product;await dispatch({type:'restore',state:parsed});setPayload('');};
 return <Screen title="Veri yedeği" subtitle="Yedeklerini sen kontrol edersin." back>
  <View style={{padding:16,borderWidth:1,borderColor:'#B9CDE5',backgroundColor:'#E9F3FF',borderRadius:6,gap:8}}><Copy bold>Yerel kopya + isteğe bağlı bulut yedeği</Copy><Copy muted>Lensim kayıtlarını telefonda tutar. Dosya yedeğini düzenli olarak başka bir yere kaydet. Google girişli otomatik yedek Firebase projesi yapılandırıldıktan sonra açılır.</Copy></View>
  <Button title="Şimdi dosya yedeği oluştur" icon="download-outline" onPress={exportData}/>
  <Copy size={18} bold>Dosyadan geri yükle</Copy><Copy muted size={13}>JSON yedeğinin içeriğini buraya yapıştır. Geri yükleme mevcut kayıtların yerine yedekteki kayıtları koyar.</Copy>
  <Field label="Yedek JSON" value={payload} onChange={setPayload} multiline placeholder="{ ... }"/>
  <Button title="Yedeği geri yükle" secondary disabled={!payload.trim()} onPress={restore}/>
 </Screen>;
}

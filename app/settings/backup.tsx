import React,{useState} from 'react';
import {Alert,View} from 'react-native';
import {Button,Card,Copy,Screen,useColors} from '../../src/components/ui';
import {useApp,errorText} from '../../src/state/AppContext';
import {validateState} from '../../src/domain/reducer';
import {formatDate} from '../../src/domain/dates';
import type {AppState} from '../../src/domain/types';
import {pickBackupFile,saveBackupFile} from '../../src/services/backupFile';

/** Parses and checks a backup before anything is replaced. */
function readBackup(text:string):{state:AppState;exportedAt?:string}{
 let parsed:Record<string,unknown>;
 try{parsed=JSON.parse(text);}catch{throw new Error('Bu dosya bir Lensim yedeği değil.');}
 const exportedAt=typeof parsed.exportedAt==='string'?parsed.exportedAt:undefined;delete parsed.exportedAt;delete parsed.product;
 return {state:validateState(parsed),exportedAt};
}

export default function Backup(){
 const {state,dispatch}=useApp();const t=useColors();const [message,setMessage]=useState<string|null>(null);const [undo,setUndo]=useState<{revision:number;previous:AppState}|null>(null);
 const exportData=async()=>{
  const json=JSON.stringify({...state,exportedAt:new Date().toISOString(),product:'Lensim'},null,2);
  const name=`lensim-yedek-${new Date().toISOString().slice(0,10)}.json`;
  const saved=await saveBackupFile(name,json);
  if(saved)setMessage(`${name} kaydedildi. Dosyayı güvenli bir yerde sakla; içinde göz numaraların da var.`);
 };
 const importData=async()=>{
  const text=await pickBackupFile();if(!text)return;
  const {state:incoming,exportedAt}=readBackup(text);
  const previous=state;
  const summary=`${exportedAt?`Yedek tarihi: ${formatDate(exportedAt.slice(0,10))}\n`:''}Yedekte ${incoming.packages.length} paket ve ${incoming.dailyStatuses.length} günlük kayıt var.\n\nBu telefondaki tüm Lensim kayıtları (${previous.packages.length} paket, ${previous.dailyStatuses.length} gün) silinip yedektekiyle değiştirilecek.`;
  Alert.alert('Yedek geri yüklensin mi?',summary,[{text:'Vazgeç',style:'cancel'},{text:'Kayıtları değiştir',style:'destructive',onPress:()=>{void dispatch({type:'restore',state:incoming}).then(next=>{
   setMessage('Yedek geri yüklendi. Yanlış dosyayı seçtiysen aşağıdan önceki kayıtlarına dönebilirsin.');setUndo({revision:next.revision,previous});
  }).catch(e=>Alert.alert('Geri yüklenemedi',errorText(e)));}}]);
 };
 return <Screen title="Veri yedeği" subtitle="Kayıtların yalnızca bu telefonda durur." back>
  <View style={{padding:16,borderWidth:1,borderColor:t.border,backgroundColor:t.soft,borderRadius:12,gap:8}}>
   <Copy bold>Yedek senin elinde</Copy>
   <Copy muted>Lensim internete veri göndermez ve otomatik bulut yedeği yoktur. Telefon değiştirmeden veya uygulamayı silmeden önce yedek dosyası al.</Copy>
  </View>
  <Card style={{gap:8}}><Copy bold>Yedek dosyası hakkında</Copy><Copy size={15}>Dosya türü: <Copy size={15} bold mono>.json</Copy> (ör. lensim-yedek-2026-11-17.json). PDF değildir; Lensim’e geri yüklemek için kullanılır.</Copy><Copy size={15}>İçinde paketlerin, günlük kayıtların ve reçete / göz numaraların bulunur. Dosya şifrelenmez; güvendiğin bir yerde sakla, başkalarıyla paylaşma.</Copy></Card>
  <Button title="Yedek dosyası kaydet (.json)" icon="download-outline" onPress={exportData}/>
  <Card><Copy bold>Dosyadan geri yükle</Copy><Copy muted size={15}>Daha önce kaydettiğin .json yedek dosyasını seç. Değiştirmeden önce sana ne olacağını gösterip onay isteriz.</Copy><Button title="Yedek dosyası seç" secondary icon="folder-open-outline" onPress={importData}/></Card>
  {message&&<Copy bold>{message}</Copy>}
  {undo&&state.revision===undo.revision&&<Button title="Önceki kayıtlara dön" secondary icon="arrow-undo-outline" onPress={async()=>{await dispatch({type:'undo',expectedRevision:undo.revision,previous:undo.previous});setUndo(null);setMessage('Önceki kayıtlarına dönüldü.');}}/>}
 </Screen>;
}

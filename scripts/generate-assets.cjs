const fs=require('node:fs');
const sharp=require(process.env.LENS_SHARP_PATH || 'sharp');
(async()=>{
  const svg=fs.readFileSync('assets/mascot.svg');
  const lens=await sharp(svg).resize(740,740).png().toBuffer();
  await sharp({create:{width:1024,height:1024,channels:4,background:'#F2EDFF'}}).composite([{input:lens,left:142,top:142}]).flatten({background:'#F2EDFF'}).png().toFile('assets/icon.png');
  await sharp({create:{width:1024,height:1024,channels:4,background:'#00000000'}}).composite([{input:await sharp(svg).resize(620,620).png().toBuffer(),left:202,top:202}]).png().toFile('assets/adaptive-icon.png');
  await sharp(svg).resize(512,512).png().toFile('assets/splash.png');
  await sharp(fs.readFileSync('assets/notification.svg')).resize(96,96).png().toFile('assets/notification.png');
  console.log('Generated icon, adaptive icon, splash and monochrome notification PNGs.');
})().catch(error=>{console.error(error);process.exitCode=1;});

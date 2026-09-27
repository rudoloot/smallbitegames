import {extractAtlas,compactDimensions} from './atlas.js?v=3d43dea3bde5';
const objects=new Map(),toys=new Map(),ghosts=new Map();
export async function prepareAssets(data){
  const response=await fetch('assets/generated/manifest.json?v=3d43dea3bde5');if(!response.ok)throw Error('Missing sprite manifest');
  const manifest=await response.json(),sheets=[...manifest.sheets,...manifest.toySheets];
  const images=await Promise.all(sheets.map(async sheet=>{const image=new Image();image.src=sheet.path;await image.decode();return image;}));
  for(let n=0;n<sheets.length;n++){
    const sheet=sheets[n],image=images[n],canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
    const subjects=extractAtlas(c.getImageData(0,0,canvas.width,canvas.height),sheet.columns||4,sheet.rows||4);
    for(let i=0;i<sheet.ids.length;i++){
      const subject=subjects[i],source=document.createElement('canvas');source.width=subject.width;source.height=subject.height;
      source.getContext('2d').putImageData(new ImageData(subject.data,subject.width,subject.height),0,0);
      const out=document.createElement('canvas');out.width=out.height=256;
      const size=compactDimensions(subject.width,subject.height);out.getContext('2d').drawImage(source,(256-size.width)/2,(256-size.height)/2,size.width,size.height);
      (sheet.toy?toys:objects).set(sheet.ids[i],out);
    }
  }
  for(const item of data.items)if(!objects.has(item.id))throw Error('Missing comic sprite '+item.id);
}
export function sprite(item,{toy=false,ghost=false}={}){
  const source=toy?(toys.get(item.id)||objects.get(item.id)):objects.get(item.id);
  if(!source)throw Error('Sprite is not ready: '+item.id);
  if(!ghost)return source;
  const key=`${item.id}:${toy}`;if(ghosts.has(key))return ghosts.get(key);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.drawImage(source,0,0);c.globalCompositeOperation='source-in';c.fillStyle='#c5b58e';c.fillRect(0,0,256,256);ghosts.set(key,canvas);return canvas;
}
export function paintIcon(canvas,item,options={}){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.drawImage(sprite(item,options),0,0,canvas.width,canvas.height);}

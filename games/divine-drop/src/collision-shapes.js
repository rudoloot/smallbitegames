// Alpha silhouettes are approximated by a compound of merged rectangular spans.
// Unlike a convex hull this preserves gaps, holes, legs, wings, and separated parts.
export function geometryFromAlpha(rgba,width,height,{resolution=32,threshold=64}={}){
  const occupied=Array.from({length:resolution},()=>new Uint8Array(resolution));
  for(let gy=0;gy<resolution;gy++)for(let gx=0;gx<resolution;gx++){
    let solid=0,total=0;
    const x0=Math.floor(gx*width/resolution),x1=Math.floor((gx+1)*width/resolution);
    const y0=Math.floor(gy*height/resolution),y1=Math.floor((gy+1)*height/resolution);
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){total++;if(rgba[(y*width+x)*4+3]>=threshold)solid++;}
    occupied[gy][gx]=solid/total>=.35?1:0;
  }
  const rectangles=[];let active=new Map();
  for(let y=0;y<resolution;y++){
    const next=new Map();
    for(let x=0;x<resolution;){if(!occupied[y][x]){x++;continue;}const start=x;while(x<resolution&&occupied[y][x])x++;
      const key=`${start}:${x}`,prior=active.get(key);if(prior){prior.h++;next.set(key,prior);}else{const rect={x:start,y,w:x-start,h:1};rectangles.push(rect);next.set(key,rect);}}
    active=next;
  }
  if(!rectangles.length)throw Error('Empty sprite silhouette');
  const unit=2/resolution;
  return {resolution,parts:rectangles.map(r=>({x:(r.x+r.w/2)*unit-1,y:(r.y+r.h/2)*unit-1,w:r.w*unit,h:r.h*unit}))};
}

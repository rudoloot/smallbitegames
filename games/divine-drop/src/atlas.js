// Assign entire alpha-connected subjects to their cells before cropping them.
export function extractAtlas(imageData,columns,rows){
  const {width,height,data}=imageData,n=width*height;
  const labels=new Int32Array(n),queue=new Int32Array(n),components=[];
  for(let start=0;start<n;start++){
    if(labels[start]||data[start*4+3]<24)continue;
    const label=components.length+1;let head=0,tail=1;queue[0]=start;labels[start]=label;
    let left=width,right=0,top=height,bottom=0,sx=0,sy=0;
    while(head<tail){const p=queue[head++],x=p%width,y=Math.floor(p/width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);sx+=x;sy+=y;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=width||yy>=height)continue;const q=yy*width+xx;if(!labels[q]&&data[q*4+3]>=24){labels[q]=label;queue[tail++]=q;}}
    }
    components.push({label,area:tail,left,right,top,bottom,cx:sx/tail,cy:sy/tail});
  }
  const buckets=Array.from({length:columns*rows},()=>[]),cw=width/columns,ch=height/rows;
  for(const part of components){const col=Math.min(columns-1,Math.floor(part.cx/cw)),row=Math.min(rows-1,Math.floor(part.cy/ch));buckets[row*columns+col].push(part);}
  return buckets.map((parts,index)=>{
    parts.sort((a,b)=>b.area-a.area);const main=parts[0];if(!main)throw Error(`Empty atlas subject at ${index}`);
    const kept=parts.filter(p=>p===main||p.area>=Math.max(16,main.area*.012)&&Math.max(0,main.left-p.right,p.left-main.right,main.top-p.bottom,p.top-main.bottom)<Math.max(cw,ch)*.25);
    const allowed=new Set(kept.map(p=>p.label));const left=Math.max(0,Math.min(...kept.map(p=>p.left))-2),top=Math.max(0,Math.min(...kept.map(p=>p.top))-2),right=Math.min(width-1,Math.max(...kept.map(p=>p.right))+2),bottom=Math.min(height-1,Math.max(...kept.map(p=>p.bottom))+2);
    const w=right-left+1,h=bottom-top+1,pixels=new Uint8ClampedArray(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const xx=x+left,yy=y+top,p=yy*width+xx;let include=allowed.has(labels[p]);
      if(!include&&labels[p]===0&&data[p*4+3]>0){for(let dy=-1;dy<=1&&!include;dy++)for(let dx=-1;dx<=1&&!include;dx++){const qx=xx+dx,qy=yy+dy;if(qx>=0&&qy>=0&&qx<width&&qy<height)include=allowed.has(labels[qy*width+qx]);}}
      if(include)pixels.set(data.subarray(p*4,p*4+4),(y*w+x)*4);
    }
    return {width:w,height:h,data:pixels,componentCount:kept.length};
  });
}
export function compactDimensions(width,height,maxSize=232){
  const max=Math.max(width,height),ratio=Math.min(width,height)/max;
  if(ratio<.82){if(width<height)width=height*.82;else height=width*.82;}
  const scale=maxSize/Math.max(width,height);return {width:width*scale,height:height*scale};
}

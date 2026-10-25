/* Shared measured geometry for the input board and composite preview. */
(() => {
  const context=document.createElement('canvas').getContext('2d');
  const profile=globalThis.StackLayoutProfile;
  const clues=profile?[...profile.rows.map(groups=>({axis:'row',groups})),...profile.columns.map(groups=>({axis:'col',groups}))]:[...C.clues.flat(),...C.combinedClues];
  const slots={row:Math.max(1,...clues.filter(c=>c.axis==='row').map(c=>c.groups.length)),col:Math.max(1,...clues.filter(c=>c.axis==='col').map(c=>c.groups.length))};
  const measurements=new Map(),viewMeasurements=new Map(),tokenMetrics=new Map();
  function measureToken(number,font){
    const key=`${font}:${number}`;
    if(!tokenMetrics.has(key)){
      context.font=`650 ${font}px system-ui`;
      const text=context.measureText(String(number));
      tokenMetrics.set(key,{width:text.width,height:text.actualBoundingBoxAscent+text.actualBoundingBoxDescent||font});
    }
    return tokenMetrics.get(key);
  }
  function tokenSizes(groups,axis,font){return groups.map(number=>measureToken(number,font)[axis==='row'?'width':'height']);}
  function tokenGap(a,b,stride,extra=0){return Math.max(0,stride-(a+b)/2)/2+extra;}
  function packedExtent(groups,axis,font,stride){
    const sizes=tokenSizes(groups,axis,font);
    const extra=axis==='col'?Math.min(1,font/9):0;
    return sizes.reduce((sum,size,i)=>sum+size+(i?tokenGap(sizes[i-1],size,stride,extra):0),0);
  }
  window.getStackCluePositions=(groups,axis,layout)=>{
    const row=axis==='row',sizes=tokenSizes(groups,axis,layout.font),positions=groups.map(()=>0);
    if(!groups.length)return positions;
    const last=groups.length-1,stride=row?layout.slotWidth:layout.lineHeight;
    positions[last]=(row?layout.left-layout.paddingX:layout.top-layout.paddingY)-sizes[last]/2;
    const extra=row?0:Math.min(1,layout.font/9);
    for(let i=last-1;i>=0;i--)positions[i]=positions[i+1]-(sizes[i]+sizes[i+1])/2-tokenGap(sizes[i],sizes[i+1],stride,extra);
    return positions;
  };
  window.getStackBoardLayout=(maxWidth,maxHeight=Infinity)=>{
    const view=clues;
    for(let font=maxWidth<600?9:11;font>=1;font-=.25){
      if(!measurements.has(font)){
        const slotWidth=Math.ceil(Math.max(font,...clues.filter(c=>c.axis==='row').flatMap(c=>c.groups.map(n=>measureToken(n,font).width+2))));
        const columnWidth=Math.max(font,...clues.filter(c=>c.axis==='col').flatMap(c=>c.groups.map(n=>measureToken(n,font).width+2)));
        const lineHeight=Math.ceil(Math.max(font+1,font*1.1)),referenceLeft=slots.row*slotWidth,referenceTop=slots.col*lineHeight,end=font+4;
        measurements.set(font,{slotWidth,columnWidth,lineHeight,referenceLeft,referenceTop,end});
      }
      const {slotWidth,columnWidth,lineHeight,referenceLeft,referenceTop,end}=measurements.get(font);
      // Keep glyph size and horizontal spacing stable while fitting the compact clue gutters.
      const referenceCell=Math.min((maxWidth-referenceLeft-end)/N,(maxHeight-referenceTop-end)/N);
      if(referenceCell<columnWidth&&font>1)continue;
      const key=font;
      if(!viewMeasurements.has(key)){
        const rowExtent=Math.max(0,...view.filter(c=>c.axis==='row').map(c=>packedExtent(c.groups,'row',font,slotWidth)));
        const colExtent=Math.max(0,...view.filter(c=>c.axis==='col').map(c=>packedExtent(c.groups,'col',font,lineHeight)));
        const paddingX=Math.min(4,Math.max(0,(referenceLeft-rowExtent)/2)),paddingY=Math.min(4,Math.max(0,(referenceTop-colExtent)/2));
        const labelWidth=measureToken(`${N},${N}`,font).width;
        const left=Math.min(referenceLeft,Math.ceil(Math.max(rowExtent+2*paddingX,labelWidth+12)));
        const top=Math.max(Math.ceil(colExtent+2*paddingY),Math.min(referenceTop,Math.ceil(font*1.2+12)));
        const coordinatePadding=Math.min(6,left/6,top/6);
        const coordinateSize=Math.max(1,Math.min(12,12*(left-2*coordinatePadding)/measureToken(`${N},${N}`,12).width,(top-2*coordinatePadding)/1.2));
        viewMeasurements.set(key,{left,top,paddingX,paddingY,coordinatePadding,coordinateSize});
      }
      const packed=viewMeasurements.get(key),{left,top}=packed;
      const cell=Math.max(.1,Math.min((maxWidth-left-end)/N,(maxHeight-top-end)/N));
      if(cell<columnWidth&&font>1)continue;
      return {width:left+N*cell+end,height:top+N*cell+end,...packed,end,cell,font,gap:0,padding:0,lineHeight,columnGap:0,slotWidth};
    }
  };
})();

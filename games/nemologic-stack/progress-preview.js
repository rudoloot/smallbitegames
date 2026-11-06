/* Draw current entries only, without solution access, grid lines or number overlays. */
(function(root){
 'use strict';
 function draw(canvas,values,palette,indices=null){
  if(!canvas||values.length!==canvas.width*canvas.height||palette.length!==4)return false;
  const context=canvas.getContext('2d');if(!context)return false;
  context.imageSmoothingEnabled=false;
  if(!indices)context.clearRect(0,0,canvas.width,canvas.height);
  for(const index of indices||values.keys()){
   const value=values[index];if(value!==null&&(!Number.isInteger(value)||value<0||value>3))continue;
   context.fillStyle=palette[value??0];context.fillRect(index%canvas.width,Math.floor(index/canvas.width),1,1);
  }
  return true;
 }
 const api={draw};root.StackProgressPreview=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);

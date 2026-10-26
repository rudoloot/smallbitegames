/* Display colors only: puzzle values, clues and saved progress stay unchanged. */
(function(root){
  'use strict';
  const grayscale=['#ffffff','#aaaaaa','#555555','#000000'];
  const palettes={
    ocean:['#f1faf7','#9cdbd2','#368faa','#183e57'],
    berry:['#fff5ed','#f5b8bc','#bd647e','#513951'],
    forest:['#faf9e9','#bfd49a','#649b70','#294c45'],
    caramel:['#fff8e8','#eacb91','#b68157','#503f39'],
    twilight:['#faf5fc','#d2bde8','#9572bc','#403955'],
    sunset:['#fff8e9','#f1cf93','#d7876c','#6a4756']
  };
  function paletteFor(puzzle={}){
    const subject=puzzle.subject||puzzle.source?.subject||'',category=puzzle.categoryId||puzzle.source?.categoryId;
    const key=/펭귄|고래|상어|돌고래|눈|빙수/.test(subject)?'ocean':
      /고양이|리본|딸기|체리/.test(subject)?'berry':
      /유령|마녀|마법|요정|우주/.test(subject)?'twilight':
      /석양|로켓|불/.test(subject)?'sunset':
      ({'01':'caramel','02':'forest','03':'ocean','04':'forest','05':'berry','06':'caramel','07':'berry','08':'ocean','09':'twilight','10':'ocean','11':'forest','12':'ocean','13':'caramel','14':'ocean','15':'twilight'}[category]||'ocean');
    return palettes[key];
  }
  const colors=(puzzle,mode)=>mode==='color'?paletteFor(puzzle):grayscale;
  function foreground(hex){
    const [r,g,b]=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    return .2126*r+.7152*g+.0722*b>.179?'#202522':'#ffffff';
  }
  function readMode(){try{return localStorage.getItem('nonogram-stack-mode')==='color'?'color':'monochrome';}catch{return 'monochrome';}}
  function writeMode(mode){try{localStorage.setItem('nonogram-stack-mode',mode);}catch{}}
  const api={grayscale,palettes,paletteFor,colors,foreground,readMode,writeMode};
  if(typeof module!=='undefined')module.exports=api;
  root.StackPalette=api;
})(typeof globalThis!=='undefined'?globalThis:this);

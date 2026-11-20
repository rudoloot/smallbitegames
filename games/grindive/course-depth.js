// CPU depth buffer for the editor and its test ride. Vertices are in camera
// space; reciprocal depth interpolates linearly after perspective projection.
class CourseDepthView {
  constructor(){
    this.canvas=document.createElement('canvas');
    this.ctx=this.canvas.getContext('2d');
    this.palette=new Map();
  }
  begin(width,height,focal,centerY,pick=false,scale=Math.min(1,1280/width,900/height)){
    const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
    if(!this.image||this.canvas.width!==w||this.canvas.height!==h){
      this.canvas.width=w;this.canvas.height=h;
      this.image=this.ctx.createImageData(w,h);
      this.pixels=new Uint32Array(this.image.data.buffer);
      this.depth=new Float32Array(w*h);
      this.ids=null;
    }
    this.pixels.fill(0);this.depth.fill(0);
    if(pick){this.ids??=new Int32Array(w*h);this.ids.fill(0);}
    this.pick=pick;this.width=width;this.height=height;
    this.fx=focal*w/width;this.fy=focal*h/height;this.cy=centerY*h/height;
  }
  color(css){
    if(css===null)return 0; // Transparent occluder that still writes depth.
    let value=this.palette.get(css);
    if(value!==undefined)return value;
    const rgb=css.startsWith('#')?[1,3,5].map(i=>parseInt(css.slice(i,i+2),16)):css.match(/\d+/g).map(Number);
    value=(255<<24)|(rgb[2]<<16)|(rgb[1]<<8)|rgb[0];
    this.palette.set(css,value);return value;
  }
  face(vertices,css,id=0,opacity=1){
    const points=[],near=.25;
    const project=v=>points.push({x:this.canvas.width/2+v.x*this.fx/v.z,y:this.cy+v.y*this.fy/v.z,d:1/v.z});
    for(let i=0;i<vertices.length;i++){
      const a=vertices[i],b=vertices[(i+1)%vertices.length];
      if(a.z>=near)project(a);
      if((a.z>=near)===(b.z>=near))continue;
      const t=(near-a.z)/(b.z-a.z);
      project({x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y),z:near});
    }
    for(let i=2;i<points.length;i++)this.triangle(points[0],points[i-1],points[i],this.color(css),id,opacity);
  }
  triangle(a,b,c,color,id,opacity){
    const w=this.canvas.width,h=this.canvas.height;
    const x0=Math.max(0,Math.ceil(Math.min(a.x,b.x,c.x)-.5)),x1=Math.min(w-1,Math.floor(Math.max(a.x,b.x,c.x)-.5));
    const y0=Math.max(0,Math.ceil(Math.min(a.y,b.y,c.y)-.5)),y1=Math.min(h-1,Math.floor(Math.max(a.y,b.y,c.y)-.5));
    const bx=b.x-a.x,by=b.y-a.y,cx=c.x-a.x,cy=c.y-a.y,det=bx*cy-by*cx;
    if(Math.abs(det)<1e-9||x0>x1||y0>y1)return;
    const du=cy/det,dv=-by/det,db=b.d-a.d,dc=c.d-a.d;
    const pixels=this.pixels,depth=this.depth,ids=this.pick?this.ids:null;
    for(let y=y0;y<=y1;y++){
      const dx=x0+.5-a.x,dy=y+.5-a.y;
      let u=(dx*cy-dy*cx)/det,v=(dy*bx-dx*by)/det;
      for(let x=x0,i=y*w+x0;x<=x1;x++,i++,u+=du,v+=dv){
        if(u< -1e-8||v< -1e-8||u+v>1.00000001)continue;
        const d=a.d+db*u+dc*v;
        if(d+1e-9<depth[i])continue;
        if(opacity===1){pixels[i]=color;depth[i]=d;if(ids)ids[i]=id;}
        else{
          const old=pixels[i],background=(old>>>24)/255*(1-opacity),alpha=opacity+background;
          const r=((old&255)*background+(color&255)*opacity)/alpha;
          const g=(((old>>>8)&255)*background+((color>>>8)&255)*opacity)/alpha;
          const b=(((old>>>16)&255)*background+((color>>>16)&255)*opacity)/alpha;
          pixels[i]=(Math.round(255*alpha)<<24)|(b<<16)|(g<<8)|r;
        }
      }
    }
  }
  sampleId(x,y){
    if(!this.pick||x<0||y<0||x>=this.width||y>=this.height)return 0;
    return this.ids[Math.floor(y*this.canvas.height/this.height)*this.canvas.width+Math.floor(x*this.canvas.width/this.width)];
  }
  paint(ctx){
    this.ctx.putImageData(this.image,0,0);
    ctx.drawImage(this.canvas,0,0,this.width,this.height);
  }
}

// The dive uses opaque triangles, so the GPU can depth-test the entire run in one draw.
class DiveDepthView extends CourseDepthView {
  constructor(){
    super();
    this.surface=document.createElement('canvas');
    const gl=this.surface.getContext('webgl',{alpha:true,depth:true,antialias:true});
    if(!gl)return;
    const program=gl.createProgram();
    const shaders=[
      [gl.VERTEX_SHADER,`attribute vec3 position;
       attribute vec3 color;
       uniform vec3 projection;
       varying lowp vec3 tint;
       void main(){
         float z=position.z;
         gl_Position=vec4(position.x*projection.x, z*projection.z-position.y*projection.y, z-0.5, z);
         tint=color;
       }`],
      [gl.FRAGMENT_SHADER,`precision mediump float;
       varying lowp vec3 tint;
       void main(){gl_FragColor=vec4(tint,1.0);}`]
    ];
    for(const [type,source] of shaders){
      const shader=gl.createShader(type);
      gl.shaderSource(shader,source);gl.compileShader(shader);
      gl.attachShader(program,shader);gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);return;}
    gl.useProgram(program);
    this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    for(const [name,offset] of [['position',0],['color',12]]){
      const loc=gl.getAttribLocation(program,name);
      gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,24,offset);
    }
    this.projection=gl.getUniformLocation(program,'projection');
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
    this.data=new Float32Array(32768);
    this.gl=gl;
  }
  begin(width,height,focal,centerY){
    const gl=this.gl;
    this.hardware=gl&&!gl.isContextLost();
    const density=Math.min(2,Math.max(1.25,devicePixelRatio||1));
    if(!this.hardware){
      return super.begin(width,height,focal,centerY,false,Math.min(density,Math.sqrt(1800000/(width*height))));
    }
    this.width=width;this.height=height;this.used=0;
    const scale=Math.min(density,Math.sqrt(4000000/(width*height)));
    const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
    if(this.surface.width!==w||this.surface.height!==h){this.surface.width=w;this.surface.height=h;}
    gl.viewport(0,0,w,h);
    gl.uniform3f(this.projection,2*focal/width,2*focal/height,1-2*centerY/height);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  }
  face(vertices,css){
    if(!this.hardware)return super.face(vertices,css);
    const packed=this.color(css),r=(packed&255)/255,g=((packed>>>8)&255)/255,b=((packed>>>16)&255)/255;
    const needed=this.used+Math.max(0,vertices.length-2)*18;
    if(needed>this.data.length){
      const data=new Float32Array(Math.max(needed,this.data.length*2));
      data.set(this.data);this.data=data;
    }
    for(let i=2;i<vertices.length;i++){
      for(const v of [vertices[0],vertices[i-1],vertices[i]]){
        const n=this.used;
        this.data[n]=v.x;this.data[n+1]=v.y;this.data[n+2]=v.z;
        this.data[n+3]=r;this.data[n+4]=g;this.data[n+5]=b;this.used+=6;
      }
    }
  }
  paint(ctx){
    if(!this.hardware)return super.paint(ctx);
    const gl=this.gl;
    gl.bufferData(gl.ARRAY_BUFFER,this.data.subarray(0,this.used),gl.STREAM_DRAW);
    gl.drawArrays(gl.TRIANGLES,0,this.used/6);
    ctx.drawImage(this.surface,0,0,this.width,this.height);
  }
}

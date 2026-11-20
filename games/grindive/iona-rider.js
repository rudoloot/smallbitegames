/* Draw the original Iona game mesh into the canvas rider pass. */
const ionaRider = (() => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', {alpha:true, antialias:true, premultipliedAlpha:true});
  if (!gl) return null;
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, `
    attribute vec3 position, normal;
    attribute vec2 uv;
    uniform mat4 projection;
    varying lowp vec3 flatColor;

    varying vec2 texcoord;
    varying float light;
    void main(){
      gl_Position=projection*vec4(position,1.);
      flatColor=normal;texcoord=uv;
      light=.83+.22*dot(normalize(normal),normalize(vec3(-.4,.8,.5)));
    }`], [gl.FRAGMENT_SHADER, `
    precision mediump float;
    uniform sampler2D atlas;
    uniform bool solidPass;
    varying lowp vec3 flatColor;
    varying vec2 texcoord;
    varying float light;
    void main(){gl_FragColor=solidPass?vec4(flatColor,1.):vec4(texture2D(atlas,texcoord).rgb*light,1.);}
  `]]) {
    const shader=gl.createShader(type);
    gl.shaderSource(shader,source); gl.compileShader(shader);
    gl.attachShader(program,shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const bytes = key => Uint8Array.from(atob(ionaMesh[key]), c=>c.charCodeAt(0));
  const buffers={};
  for(const [name,size] of [['position',3],['normal',3],['uv',2]]){
    buffers[name]=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffers[name]);
    gl.bufferData(gl.ARRAY_BUFFER,bytes(name),gl.STATIC_DRAW);
    const location=gl.getAttribLocation(program,name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location,size,gl.FLOAT,false,0,0);
  }
  const indices=bytes('index');
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
  gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
  const texture=new Image();
  let ready=false;
  texture.onload=()=>{
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,texture);
    gl.generateMipmap(gl.TEXTURE_2D);
    ready=true;
  };
  texture.src=ionaMesh.atlas;
  const projection=gl.getUniformLocation(program,'projection'),flat=gl.getUniformLocation(program,'solidPass');
  const passBuffer=gl.createBuffer();
  const attr=Object.fromEntries(['position','normal','uv'].map(name=>[name,gl.getAttribLocation(program,name)]));
  function drawCourseDepth(pass,w,h){
    const data=[];
    for(const face of pass.faces)for(let i=2;i<face.length;i++)
      for(const p of [face[0],face[i-1],face[i]])data.push(...p,0,0,0);
    const maskCount=data.length/6;
    for(const n of pass.solid)data.push(n);
    gl.uniformMatrix4fv(projection,false,[2*pass.focal/w,0,0,0, 0,-2*pass.focal/h,0,0, 0,1-2*.61,1,1, 0,0,-.5,0]);
    gl.uniform1i(flat,1);
    gl.bindBuffer(gl.ARRAY_BUFFER,passBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STREAM_DRAW);
    gl.vertexAttribPointer(attr.position,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(attr.normal,3,gl.FLOAT,false,24,12);
    gl.disableVertexAttribArray(attr.uv);
    gl.colorMask(false,false,false,false);gl.drawArrays(gl.TRIANGLES,0,maskCount);gl.colorMask(true,true,true,true);
    gl.drawArrays(gl.TRIANGLES,maskCount,pass.solid.length/6);
    for(const [name,size] of [['position',3],['normal',3],['uv',2]]){
      gl.bindBuffer(gl.ARRAY_BUFFER,buffers[name]);gl.enableVertexAttribArray(attr[name]);gl.vertexAttribPointer(attr[name],size,gl.FLOAT,false,0,0);
    }
    gl.uniform1i(flat,0);
  }
  const unpack = encoded => Uint8Array.from(atob(encoded), c=>c.charCodeAt(0));
  const joints=unpack(ionaMotion.joints), weights=new Float32Array(unpack(ionaMotion.weights).buffer);
  const clips=Object.fromEntries(Object.entries(ionaMotion.clips).map(([name,data])=>[name,new Float32Array(unpack(data).buffer)]));
  const stride=ionaMotion.bones*12, palette=new Float32Array(stride);
  const rest=new Float32Array(bytes('position').buffer), normals=new Float32Array(bytes('normal').buffer);
  const posed=new Float32Array(rest.length), lit=new Float32Array(rest.length);
  let lastTime=-1,lastClip='';
  function animate(name,time){
    if(time===lastTime&&name===lastClip)return;
    const dt=time-lastTime;
    const blend=lastTime<0||dt<0||dt>.3?1:1-Math.exp(-Math.max(dt,.001)*(name==='Tuck'?42:22));
    lastTime=time;lastClip=name;
    const clip=clips[name],frame=time*12,whole=Math.floor(frame),fraction=frame-whole;
    const count=clip.length/stride,first=whole%count*stride,next=(whole+1)%count*stride;
    for(let i=0;i<stride;i++){
      const target=clip[first+i]*(1-fraction)+clip[next+i]*fraction;
      palette[i]+=(target-palette[i])*blend;
    }
    for(let i=0,v=0;i<rest.length;i+=3,v+=4){
      posed.fill(0,i,i+3);lit.fill(0,i,i+3);
      for(let k=0;k<4;k++){
        const weight=weights[v+k];if(!weight)continue;
        let m=joints[v+k]*12;
        for(let axis=0;axis<3;axis++,m+=4){
          posed[i+axis]+=weight*(palette[m]*rest[i]+palette[m+1]*rest[i+1]+palette[m+2]*rest[i+2]+palette[m+3]);
          lit[i+axis]+=weight*(palette[m]*normals[i]+palette[m+1]*normals[i+1]+palette[m+2]*normals[i+2]);
        }
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER,buffers.position);gl.bufferSubData(gl.ARRAY_BUFFER,0,posed);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffers.normal);gl.bufferSubData(gl.ARRAY_BUFFER,0,lit);
  }
  return {get ready(){return ready}, draw(ctx,w,h,clip,action,time,pass){
    animate(action,time);
    const scale=Math.min(devicePixelRatio||1,2);
    const width=Math.round(w*scale),height=Math.round(h*scale);
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    gl.viewport(0,0,width,height);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    if(pass)drawCourseDepth(pass,w,h);
    const origin=clip(0,0,0),matrix=[];
    for(const axis of [[1,0,0],[0,1,0],[0,0,1]])
      matrix.push(...clip(...axis).map((v,i)=>v-origin[i]));
    gl.uniformMatrix4fv(projection,false,new Float32Array(matrix.concat(origin)));

    gl.drawElements(gl.TRIANGLES,indices.length/2,gl.UNSIGNED_SHORT,0);
    ctx.drawImage(canvas,0,0,w,h);
  }};
})();

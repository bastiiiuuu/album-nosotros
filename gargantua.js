import { GargantuaCinematic } from './gargantua-cinematic.js?v=20261010-cinematic';
import { GargantuaExperience } from './gargantua-experience.js?v=20261010-cinematic';

const vertexSource = `
attribute vec2 aPosition;
void main(){gl_Position=vec4(aPosition,0.0,1.0);}
`;

const fragmentSource = `
precision highp float;
uniform vec2 uResolution;
uniform float u_time;
uniform vec3 u_cameraPos;
uniform mat3 u_cameraRot;
uniform float u_zoom;
uniform vec2 uFraming;
const float PI=3.14159265359;
float hash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.0),f.x),f.y);}
float fbm(vec2 p){float v=.5*noise(p);p=mat2(.8,-.6,.6,.8)*p*2.03;v+=.25*noise(p);p=p*2.01+3.7;return v+.125*noise(p);}
vec3 stars(vec3 direction){
  vec2 sky=vec2(atan(direction.z,direction.x)/(2.0*PI)+.5,asin(clamp(direction.y,-1.0,1.0))/PI+.5);
  vec3 color=vec3(.0015,.0007,.0035);
  for(int layer=0;layer<2;layer++){
    float density=layer==0?420.0:790.0;
    vec2 p=sky*vec2(density,density*.5),cell=floor(p),local=fract(p)-.5;
    vec2 offset=vec2(hash(cell+13.1),hash(cell+57.9))*.6-.3;
    float seed=hash(cell+float(layer)*127.0),distance=length(local-offset);
    float point=exp(-distance*distance*(layer==0?950.0:1600.0));
    float visible=step(layer==0?.983:.993,seed);
    color+=mix(vec3(.39,.27,.62),vec3(.88,.86,1.0),seed)*point*visible*(layer==0?1.0:.6);
  }
  float cloud=fbm(sky*vec2(16.0,10.0));
  color+=vec3(.014,.002,.032)*pow(cloud,3.0);
  return color;
}
vec3 diskEmission(vec3 p,vec3 direction){
  float radius=length(p.xz),angle=atan(p.z,p.x);
  float edge=smoothstep(2.75,3.15,radius)*(1.0-smoothstep(7.0,9.1,radius));
  float omega=7.8/pow(max(radius,1.0),1.5),flow=angle-u_time*omega;
  vec2 curl=vec2(cos(flow),sin(flow));
  float turbulence=fbm(curl*4.0+vec2(radius*3.1,-radius*2.7));
  float fine=fbm(curl*8.0+vec2(radius*9.0,radius*2.0));
  float bands=.93+.07*sin(radius*16.0+turbulence*5.0);
  float filaments=.18+1.1*pow(clamp(turbulence*.6+fine*.7,0.0,1.0),2.1);
  float toward=dot(normalize(vec3(-p.z,0.0,p.x)),-normalize(direction));
  float beta=.64*sqrt(1.0/max(radius,1.0));
  float doppler=sqrt(1.0-beta*beta)/max(.2,1.0-beta*toward);
  float beaming=pow(doppler,3.0)*sqrt(max(.02,1.0-1.0/radius));
  float heat=pow(3.0/max(radius,3.0),1.65);
  vec3 color=mix(vec3(.14,.009,.3),vec3(.56,.1,1.0),heat);
  color=mix(color,vec3(.94,.78,1.0),pow(heat,2.0)*.65+max(toward,0.0)*.22);
  float flare=1.0+.14*sin(flow*3.0+radius*.8)+.1*sin(flow*7.0-radius*1.5);
  return color*edge*heat*bands*filaments*beaming*flare*1.8;
}
void main(){
  vec2 uv=(gl_FragCoord.xy-vec2(.5*uResolution.x,uFraming.y*uResolution.y))/uResolution.y;
  float focal=uFraming.x*clamp(pow(u_zoom/8.0,1.8),.035,1.0);
  vec3 camera=u_cameraPos;
  vec3 right=u_cameraRot[0],up=u_cameraRot[1],forward=-u_cameraRot[2];
  vec3 velocity=normalize(forward*focal+right*uv.x+up*uv.y);
  vec3 origin=camera;
  float entry=max(0.0,-dot(origin,velocity)-15.0);
  vec3 p=origin+velocity*entry;
  vec3 angular=cross(p,velocity);
  float h2=dot(angular,angular),closest=30.0,captured=0.0;
  if(h2>156.25){gl_FragColor=vec4(stars(normalize(velocity-camera*.001))*.28,1.0);return;}
  vec3 emission=vec3(0.0);
  vec3 nearest=p;
  float optical=0.0;
  for(int i=0;i<160;i++){
    float r2=dot(p,p),r=sqrt(r2);
    if(r<closest){closest=r;nearest=p;}
    if(r<1.0){captured=1.0;break;}
    if(r>28.0)break;
    float stepSize=clamp(r*.088,.045,.9);
    vec3 acceleration=-1.5*(h2/r2)*(p/r)/r2;
    vec3 midVelocity=velocity+acceleration*stepSize*.5;
    vec3 previous=p;
    p+=midVelocity*stepSize;
    float nextR2=max(dot(p,p),.01);
    velocity=midVelocity-1.5*(h2/nextR2)*(p/sqrt(nextR2))/nextR2*stepSize*.5;
    float radius=length(p.xz);

    if(radius>2.75&&radius<9.1){
      if(previous.y*p.y<0.0){
        float fraction=abs(previous.y)/max(abs(previous.y)+abs(p.y),.00001);
        vec3 crossing=mix(previous,p,fraction);
        float pathWeight=min(2.1,.36/max(abs(normalize(velocity).y),.12));
        emission+=diskEmission(crossing,velocity)*pathWeight*exp(-optical);
        optical+=pathWeight*.55;
      }
      float haze=exp(-abs(p.y)*3.8)*stepSize*.024;
      float pulse=.8+.2*sin(radius*3.0-u_time*1.8+atan(p.z,p.x)*2.0);
      emission+=vec3(.24,.002,.43)*haze*pow(2.5/radius,2.0)*pulse;
    }
  }
  vec3 color=stars(normalize(velocity))*exp(-optical)*(1.0-captured)+emission;
  float impact=sqrt(h2),critical=2.598;
  float photon=exp(-abs(impact-critical)*65.0)*(1.0-captured);
  float radiation=.95+.06*sin(atan(nearest.z,nearest.x)*4.0-u_time*.7);
  color+=vec3(.66,.22,1.0)*photon*.65*radiation;
  color+=vec3(.025,.001,.055)*exp(-abs(impact-critical)*6.0)*(1.0-captured);
  gl_FragColor=vec4(max(color,vec3(0.0))*.28,1.0);
}
`;

export class GargantuaView {
  constructor(canvas, controls) {
    this.canvas=canvas;this.controls=controls;this.gl=null;this.program=null;this.buffer=null;
    this.active=false;this.lost=false;this.frame=0;this.time=0;this.last=0;this.scale=1;
    this.samples=[];this.warmup=0;this.recovery=0;this.motion=matchMedia('(prefers-reduced-motion: reduce)');this.paused=this.motion.matches;
    this.exposure=1.35;this.destroyed=false;this.distance=23;this.targetDistance=23;
    this.orientation=new Float32Array([-Math.sin(.1),0,0,Math.cos(.1)]);
    this.targetOrientation=new Float32Array(this.orientation);this.rotation=new Float32Array(9);
    this.points=new Map();this.velocityX=0;this.velocityY=0;this.gesture=null;this.touching=false;this.tapOrigin=null;
    this.abort=new AbortController();const signal=this.abort.signal;
    this.tick=this.tick.bind(this);
    const root=canvas.closest('.page--gargantua');this.experience=root?new GargantuaExperience(this,root):null;
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.clearGesture();this.cancel();}else if(this.active)this.resume();},{signal});
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.lost=true;this.clearGesture();this.cancel();this.clearHandles();this.setStatus('La luz volverá en un instante…');},{signal});
    canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;if(!this.active)return;try{this.initialize();this.resume();}catch(error){this.fail(error);}},{signal});
    this.resizeObserver=new ResizeObserver(()=>{if(this.active&&!this.lost){this.resize();this.draw();this.wake();}});
    [canvas,controls.pause.parentElement,document.getElementById('player')].filter(Boolean).forEach(element=>this.resizeObserver.observe(element));
    window.addEventListener('resize',()=>{if(this.active&&!this.lost){this.resize();this.draw();this.wake();}},{signal});
    window.addEventListener('blur',()=>this.clearGesture(),{signal});
    this.motion.addEventListener('change',event=>{this.paused=event.matches;this.clearGesture();this.syncPause();if(this.active)this.resume();},{signal});
    controls.pause.addEventListener('click',()=>{this.paused=!this.paused;this.syncPause();if(this.active)this.resume();},{signal});
    controls.zoom.addEventListener('input',()=>{this.targetDistance=Number(controls.zoom.value);this.wake();},{signal});
    controls.exposure.addEventListener('input',()=>{this.exposure=Number(controls.exposure.value);if(this.active)this.draw();},{signal});
    controls.reset.addEventListener('click',()=>this.reset(),{signal});
    canvas.addEventListener('pointerdown',event=>{
      if(event.pointerType==='touch'||event.button!==0||!this.active||this.lost||!this.program)return;
      this.experience?.interact();this.tapOrigin={x:event.clientX,y:event.clientY,time:performance.now(),moved:false};
      canvas.focus({preventScroll:true});canvas.setPointerCapture(event.pointerId);
      this.points.set(event.pointerId,{x:event.clientX,y:event.clientY});this.beginGesture();event.preventDefault();
    },{signal});
    canvas.addEventListener('pointermove',event=>{
      if(event.pointerType==='touch'||!this.points.has(event.pointerId))return;
      if(this.tapOrigin&&Math.hypot(event.clientX-this.tapOrigin.x,event.clientY-this.tapOrigin.y)>8)this.tapOrigin.moved=true;
      this.points.set(event.pointerId,{x:event.clientX,y:event.clientY});this.moveGesture();
    },{signal});
    const release=event=>{
      if(event.pointerType==='touch'||!this.points.has(event.pointerId))return;
      const tap=this.tapOrigin;this.tapOrigin=null;
      this.points.delete(event.pointerId);
      if(event.type!=='pointerup'||performance.now()-(this.gesture?.time||0)>100)this.velocityX=this.velocityY=0;
      if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
      this.endGesture();
      if(event.type==='pointerup'&&tap&&!tap.moved&&performance.now()-tap.time<450)this.experience?.tap(event.clientX,event.clientY);
    };
    ['pointerup','pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,release,{signal}));
    canvas.addEventListener('touchstart',event=>{
      if(!this.active||this.lost||!this.program)return;
      this.experience?.interact();const first=event.touches[0];this.tapOrigin=event.touches.length===1?{x:first.clientX,y:first.clientY,time:performance.now(),moved:false}:null;
      event.preventDefault();canvas.focus({preventScroll:true});this.touching=true;this.readTouches(event);this.beginGesture();
    },{signal,passive:false});
    canvas.addEventListener('touchmove',event=>{
      if(!this.touching)return;event.preventDefault();const first=event.touches[0];if(this.tapOrigin&&(!first||event.touches.length!==1||Math.hypot(first.clientX-this.tapOrigin.x,first.clientY-this.tapOrigin.y)>8))this.tapOrigin.moved=true;this.readTouches(event);this.moveGesture();
    },{signal,passive:false});
    const endTouch=event=>{
      if(!this.touching)return;event.preventDefault();this.readTouches(event);
      const tap=this.tapOrigin;this.tapOrigin=null;
      if(event.type==='touchcancel'||performance.now()-(this.gesture?.time||0)>100)this.velocityX=this.velocityY=0;
      this.touching=this.points.size>0;this.endGesture();
      if(event.type==='touchend'&&!this.points.size&&tap&&!tap.moved&&performance.now()-tap.time<450){const point=event.changedTouches[0];if(point)this.experience?.tap(point.clientX,point.clientY);}
    };
    ['touchend','touchcancel'].forEach(type=>canvas.addEventListener(type,endTouch,{signal,passive:false}));
    canvas.addEventListener('wheel',event=>{
      if(!this.active||this.lost||!this.program)return;
      this.experience?.interact();
      event.preventDefault();const unit=event.deltaMode===1?16:event.deltaMode===2?innerHeight:1;
      this.setZoom(this.targetDistance*Math.exp(Math.max(-400,Math.min(400,event.deltaY*unit))*.0015));
    },{signal,passive:false});
    canvas.addEventListener('keydown',event=>{
      if(event.altKey||event.ctrlKey||event.metaKey)return;
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','_','Home'].includes(event.key))this.experience?.interact();
      const directions={ArrowLeft:[-.13,0],ArrowRight:[.13,0],ArrowUp:[0,-.13],ArrowDown:[0,.13]};
      if(directions[event.key]){event.preventDefault();event.stopPropagation();this.rotate(...directions[event.key]);this.wake();}
      else if(['+','=','-','_','Home'].includes(event.key)){event.preventDefault();event.stopPropagation();if(event.key==='Home')this.reset();else this.setZoom(this.targetDistance*(event.key==='-'||event.key==='_'?1.12:1/1.12));}
    },{signal});
    this.syncPause();this.updateCamera();
  }
  setStatus(message){this.controls.status.textContent=message;}
  syncPause(){this.controls.pause.textContent=this.paused?'Reanudar materia':'Pausar materia';this.controls.pause.setAttribute('aria-pressed',String(this.paused));}
  readTouches(event){this.points.clear();for(const point of event.touches)this.points.set(point.identifier,{x:point.clientX,y:point.clientY});}
  gestureState(){
    const points=[...this.points.values()];if(!points.length)return null;
    const a=points[0],b=points[1]||a;
    return {x:(a.x+b.x)*.5,y:(a.y+b.y)*.5,span:points.length>1?Math.hypot(a.x-b.x,a.y-b.y):0,time:performance.now(),count:points.length};
  }
  beginGesture(){this.velocityX=this.velocityY=0;this.gesture=this.gestureState();this.canvas.classList.add('is-dragging');this.wake();}
  moveGesture(){
    const next=this.gestureState(),previous=this.gesture;if(!next||!previous)return;
    if(next.count!==previous.count){this.beginGesture();return;}
    const sensitivity=4.2/Math.max(200,Math.min(innerWidth,innerHeight));
    const yaw=-(next.x-previous.x)*sensitivity,pitch=-(next.y-previous.y)*sensitivity;
    this.rotate(yaw,pitch);
    const dt=Math.max(.008,(next.time-previous.time)/1000);
    this.velocityX=this.motion.matches?0:Math.max(-5,Math.min(5,yaw/dt));
    this.velocityY=this.motion.matches?0:Math.max(-5,Math.min(5,pitch/dt));
    if(next.span>0&&previous.span>0)this.setZoom(this.targetDistance*previous.span/next.span);
    this.gesture=next;this.wake();
  }
  endGesture(){
    if(this.points.size){this.beginGesture();return;}
    this.gesture=null;this.canvas.classList.remove('is-dragging');this.wake();
  }
  clearGesture(){
    const ids=[...this.points.keys()];this.points.clear();this.gesture=null;this.touching=false;this.tapOrigin=null;this.velocityX=this.velocityY=0;
    for(const id of ids)if(this.canvas.hasPointerCapture(id))this.canvas.releasePointerCapture(id);
    this.canvas.classList.remove('is-dragging');
  }
  rotate(yaw,pitch){
    const q=this.targetOrientation,sx=Math.sin(pitch*.5),cx=Math.cos(pitch*.5),sy=Math.sin(yaw*.5),cy=Math.cos(yaw*.5);
    const x=sx*cy,y=sy*cx,z=-sy*sx,w=cy*cx,a=q[0],b=q[1],c=q[2],d=q[3];
    q[0]=d*x+a*w+b*z-c*y;q[1]=d*y-a*z+b*w+c*x;q[2]=d*z+a*y-b*x+c*w;q[3]=d*w-a*x-b*y-c*z;
    const length=Math.hypot(...q);for(let i=0;i<4;i++)q[i]/=length;
  }
  setZoom(distance){this.targetDistance=Math.max(1.8,Math.min(45,distance));this.controls.zoom.value=String(this.targetDistance);this.wake();}
  reset(){
    this.experience?.interact();
    this.clearGesture();this.targetOrientation.set([-Math.sin(.1),0,0,Math.cos(.1)]);this.targetDistance=23;this.exposure=1.35;
    this.controls.zoom.value='23';this.controls.exposure.value='1.35';this.wake();
  }
  updateCamera(){
    const [x,y,z,w]=this.orientation,m=this.rotation;
    m[0]=1-2*(y*y+z*z);m[1]=2*(x*y+z*w);m[2]=2*(x*z-y*w);
    m[3]=2*(x*y-z*w);m[4]=1-2*(x*x+z*z);m[5]=2*(y*z+x*w);
    m[6]=2*(x*z+y*w);m[7]=2*(y*z-x*w);m[8]=1-2*(x*x+y*y);
  }
  stepCamera(dt){
    if(!this.points.size){
      if(Math.abs(this.velocityX)+Math.abs(this.velocityY)>.002){this.rotate(this.velocityX*dt,this.velocityY*dt);const decay=Math.exp(-7*dt);this.velocityX*=decay;this.velocityY*=decay;}
      else this.velocityX=this.velocityY=0;
    }
    const q=this.orientation,target=this.targetOrientation;
    let dot=0;for(let i=0;i<4;i++)dot+=q[i]*target[i];
    const sign=dot<0?-1:1,blend=this.motion.matches?1:1-Math.exp(-15*dt);
    for(let i=0;i<4;i++)q[i]+=(target[i]*sign-q[i])*blend;
    const length=Math.hypot(...q);for(let i=0;i<4;i++)q[i]/=length;
    this.distance+=(this.targetDistance-this.distance)*blend;
    if(Math.abs(this.targetDistance-this.distance)<.001)this.distance=this.targetDistance;
    const framingBlend=this.motion.matches?1:1-Math.exp(-5*dt);
    this.focal+=(this.targetFocal-this.focal)*framingBlend;this.centerY+=(this.targetCenterY-this.centerY)*framingBlend;
    const framing=Math.abs(this.targetFocal-this.focal)+Math.abs(this.targetCenterY-this.centerY)>.0001;
    this.updateCamera();
    let remaining=0;for(let i=0;i<4;i++)remaining+=Math.abs(q[i]-target[i]*sign);
    return framing||remaining>.0001||Math.abs(this.targetDistance-this.distance)>.001||Math.abs(this.velocityX)+Math.abs(this.velocityY)>.002;
  }
  wake(){
    if(!this.active||this.lost||document.hidden||!this.program||this.ticking)return;
    if(this.motion.matches){this.orientation.set(this.targetOrientation);this.distance=this.targetDistance;this.focal=this.targetFocal;this.centerY=this.targetCenterY;this.updateCamera();this.experience?.update(0);this.draw();if(!this.frame&&this.experience?.needsFrame()){this.last=performance.now();this.frame=requestAnimationFrame(this.tick);this.canvas.dataset.running='true';}return;}
    if(!this.frame){this.last=performance.now();this.frame=requestAnimationFrame(this.tick);this.canvas.dataset.running='true';}
  }
  compile(type,source){
    const gl=this.gl,shader=gl.createShader(type);if(!shader)throw Error('No se pudo crear el shader');
    gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error(message||'Shader no compatible');}
    return shader;
  }
  initialize(){
    this.gl=this.gl||this.canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance'})||this.canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
    if(!this.gl)throw Error('WebGL no disponible');
    const gl=this.gl,isWebGL2=typeof WebGL2RenderingContext!=='undefined'&&gl instanceof WebGL2RenderingContext;
    const vertex=isWebGL2?'#version 300 es\n'+vertexSource.replace('attribute','in'):vertexSource;
    let fragment=fragmentSource;
    if(isWebGL2)fragment='#version 300 es\n'+fragment.replace('precision highp float;','precision highp float;\nout vec4 outColor;').replaceAll('gl_FragColor','outColor');
    else if(!gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT)?.precision)fragment=fragment.replace('precision highp float;','precision mediump float;');
    let vs=null,fs=null,program=null;
    try{
      vs=this.compile(gl.VERTEX_SHADER,vertex);fs=this.compile(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram();if(!program)throw Error('No se pudo crear el programa');
      gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'No se pudo enlazar WebGL');
      this.program=program;
    }catch(error){if(program)gl.deleteProgram(program);throw error;}
    finally{if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);}
    this.buffer=gl.createBuffer();if(!this.buffer)throw Error('No se pudo reservar el buffer');gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    this.position=gl.getAttribLocation(this.program,'aPosition');
    this.uniforms=Object.fromEntries(['uResolution','u_time','u_cameraPos','u_cameraRot','u_zoom','uFraming'].map(name=>[name,gl.getUniformLocation(this.program,name)]));
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);
    this.canvas.dataset.glVersion=isWebGL2?'2':'1';this.cinematic=new GargantuaCinematic(this);delete this.canvas.dataset.failed;this.resize();this.setStatus('');
    for(const control of ['pause','zoom','exposure','reset'])this.controls[control].disabled=false;
    this.experience?.enable(true);
  }
  resize(){
    if(!this.gl||this.lost)return;
    const width=Math.max(1,window.innerWidth),height=Math.max(1,window.innerHeight);
    const cinematic=this.experience?.cinema;
    const top=cinematic?height*.13:height*(width<768?.3:.24);
    const tools=this.experience?.ui.Tools;
    const bottom=cinematic?height*.87:(tools?.getBoundingClientRect().top||height*.82)-20;
    const space=Math.max(100,bottom-top);
    this.targetFocal=1.48*Math.min(1,width/height/1.65,space/(height*.58));
    this.targetCenterY=1-(top+space*.5)/height;
    if(this.focal===undefined||this.motion.matches){this.focal=this.targetFocal;this.centerY=this.targetCenterY;}
    const dpr=Math.min(window.devicePixelRatio||1,2.0);
    const budget=width<768?420000:820000;
    const ratio=Math.min(dpr,Math.sqrt(budget/(width*height)))*this.scale;
    const w=Math.max(1,Math.round(width*ratio)),h=Math.max(1,Math.round(height*ratio));
    if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
    this.cinematic?.resize(w,h);this.gl.viewport(0,0,w,h);this.canvas.dataset.renderScale=ratio.toFixed(2);
    this.experience?.resize();
  }
  projectionFocal(){const elevation=Math.max(0,Math.min(1,(Math.abs(this.rotation[7])-.15)/.8));return this.focal/(1+.65*elevation*elevation*(3-2*elevation))*Math.max(.035,Math.min(1,Math.pow(this.distance/8,1.8)));}
  draw(){
    const gl=this.gl;if(!this.active||this.lost||!this.program||!gl)return;
    this.cinematic?.begin();
    gl.useProgram(this.program);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.enableVertexAttribArray(this.position);gl.vertexAttribPointer(this.position,2,gl.FLOAT,false,0,0);
    gl.uniform2f(this.uniforms.uResolution,this.canvas.width,this.canvas.height);gl.uniform1f(this.uniforms.u_time,this.time);
    const elevation=Math.max(0,Math.min(1,(Math.abs(this.rotation[7])-.15)/.8));
    gl.uniform2f(this.uniforms.uFraming,this.focal/(1+.65*elevation*elevation*(3-2*elevation)),this.centerY);
    gl.uniformMatrix3fv(this.uniforms.u_cameraRot,false,this.rotation);
    gl.uniform3f(this.uniforms.u_cameraPos,this.rotation[6]*this.distance,this.rotation[7]*this.distance,this.rotation[8]*this.distance);
    gl.uniform1f(this.uniforms.u_zoom,this.distance);gl.drawArrays(gl.TRIANGLES,0,6);
    this.cinematic?.finish(this.experience);
  }
  tick(now){
    this.frame=0;if(!this.active||this.lost||document.hidden)return;
    this.ticking=true;
    const milliseconds=now-this.last;this.last=now;const dt=Math.min(milliseconds/1000,.05);
    if(!this.paused)this.time+=dt;
    this.experience?.beforeCamera(dt);
    const moving=this.stepCamera(dt);
    const experienceMoving=this.experience?.update(dt)||false;
    if(this.warmup++>45&&milliseconds>0){
      this.samples.push(milliseconds);
      if(this.samples.length===90){
        const average=this.samples.reduce((sum,value)=>sum+value,0)/this.samples.length;
        this.canvas.dataset.fps=String(Math.round(1000/average));
        if(average>19.5&&this.scale>.45){this.scale=Math.max(.45,this.scale*.84);this.recovery=0;this.resize();}
        else if(average<17.4&&this.scale<1){if(++this.recovery===4){this.scale=Math.min(1,this.scale*1.08);this.recovery=0;this.resize();}}
        else this.recovery=0;
        this.samples.length=0;
      }
    }
    this.draw();
    this.ticking=false;
    if(!this.paused||moving||experienceMoving)this.frame=requestAnimationFrame(this.tick);
    this.canvas.dataset.running=String(this.frame!==0);
  }
  start(){
    if(this.destroyed)return;this.active=true;this.canvas.dataset.active='true';
    if(this.lost)return;
    try{if(!this.program)this.initialize();this.experience?.start();this.resume();}catch(error){this.fail(error);}
  }
  resume(){
    this.cancel();if(!this.active||this.lost||document.hidden||!this.program)return;
    this.resize();const moving=this.stepCamera(0);this.experience?.update(0);this.draw();this.last=performance.now();this.warmup=0;this.samples.length=0;
    if(!this.paused||moving||this.experience?.needsFrame())this.frame=requestAnimationFrame(this.tick);
    this.canvas.dataset.running=String(this.frame!==0);
  }
  cancel(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;this.canvas.dataset.running='false';}
  clearHandles(){this.program=null;this.buffer=null;this.uniforms=null;this.cinematic=null;}
  stop(){
    this.active=false;this.canvas.dataset.active='false';this.clearGesture();this.cancel();
    this.experience?.stop();
    this.targetOrientation.set(this.orientation);this.targetDistance=this.distance;
    if(this.gl&&!this.lost){this.cinematic?.dispose();this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null);this.gl.useProgram(null);this.gl.bindBuffer(this.gl.ARRAY_BUFFER,null);if(this.position>=0)this.gl.disableVertexAttribArray(this.position);if(this.program)this.gl.deleteProgram(this.program);if(this.buffer)this.gl.deleteBuffer(this.buffer);this.canvas.width=1;this.canvas.height=1;}
    this.clearHandles();
  }
  fail(error){this.stop();console.error('Gargantua:',error);this.setStatus('Este dispositivo no pudo abrir la escena. Puedes volver al océano.');this.canvas.dataset.failed='true';for(const control of ['pause','zoom','exposure','reset'])this.controls[control].disabled=true;this.experience?.enable(false);}
  dispose(){this.stop();this.resizeObserver.disconnect();this.abort.abort();this.destroyed=true;}
}

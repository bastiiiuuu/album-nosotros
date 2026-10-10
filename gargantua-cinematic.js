const quadVertex=`
attribute vec2 aPosition;
varying vec2 vUV;
void main(){vUV=aPosition*.5+.5;gl_Position=vec4(aPosition,0.0,1.0);}
`;

const blurFragment=`
precision highp float;
precision highp int;
precision highp sampler2D;
uniform sampler2D uImage;
uniform vec2 uStep;
uniform float uExtract;
varying vec2 vUV;
vec3 sampleLight(vec2 uv){vec3 c=texture2D(uImage,uv).rgb;return c*mix(1.0,smoothstep(.055,.38,max(c.r,max(c.g,c.b))),uExtract);}
void main(){
vec3 c=sampleLight(vUV)*.227027;
c+=(sampleLight(vUV+uStep*1.384615)+sampleLight(vUV-uStep*1.384615))*.316216;
c+=(sampleLight(vUV+uStep*3.230769)+sampleLight(vUV-uStep*3.230769))*.070270;
gl_FragColor=vec4(c,1.0);
}
`;

const compositeFragment=`
precision highp float;
precision highp int;
precision highp sampler2D;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform sampler2D uWide;
uniform float uExposure;
uniform vec2 uTexel;
varying vec2 vUV;
vec3 film(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.0,1.0);}
float luminance(vec3 color){float value=dot(color,vec3(.299,.587,.114));return value/(1.0+value);}
vec3 antialiasScene(){
  vec3 center=texture2D(uScene,vUV).rgb;
  float middle=luminance(center);
  float nw=luminance(texture2D(uScene,vUV+vec2(-1.0,1.0)*uTexel).rgb);
  float ne=luminance(texture2D(uScene,vUV+uTexel).rgb);
  float sw=luminance(texture2D(uScene,vUV-uTexel).rgb);
  float se=luminance(texture2D(uScene,vUV+vec2(1.0,-1.0)*uTexel).rgb);
  float low=min(middle,min(min(nw,ne),min(sw,se))),high=max(middle,max(max(nw,ne),max(sw,se)));
  float contrast=high-low,threshold=max(.025,high*.18);
  if(contrast<threshold)return center;
  vec2 direction=vec2(-((nw+ne)-(sw+se)),(nw+sw)-(ne+se));
  float reduce=max((nw+ne+sw+se)*.03125,.0078125);
  direction=clamp(direction/(min(abs(direction.x),abs(direction.y))+reduce),vec2(-2.0),vec2(2.0))*uTexel;
  vec3 a=.5*(texture2D(uScene,vUV-direction/6.0).rgb+texture2D(uScene,vUV+direction/6.0).rgb);
  vec3 b=a*.5+.25*(texture2D(uScene,vUV-direction*.5).rgb+texture2D(uScene,vUV+direction*.5).rgb);
  float value=luminance(b);
  return mix(center,value<low||value>high?a:b,smoothstep(threshold,threshold*2.0,contrast));
}
void main(){
vec3 scene=antialiasScene();
vec3 bloom=texture2D(uBloom,vUV).rgb;
vec3 wide=texture2D(uWide,vUV).rgb;
vec3 color=film((scene+bloom*.7+wide*.48)*uExposure*3.0);
color=pow(color,vec3(1.0/2.2));
float vignette=1.0-.22*smoothstep(.15,.8,length((vUV-.5)*vec2(1.05,1.0)));
float dither=fract(dot(gl_FragCoord.xy,vec2(.754877666,.569840296)))-.5;
gl_FragColor=vec4(max(color*vignette+dither/255.0,0.0),1.0);
}
`;

const particleVertex=`
precision highp float;
attribute vec3 aPosition;
attribute vec4 aColor;
attribute vec3 aShape;
uniform mat3 uRotation;
uniform float uDistance;
uniform vec3 uProjection;
varying vec4 vColor;
varying vec3 vShape;
varying vec3 vWorld;
void main(){
vec3 camera=uRotation[2]*uDistance,relative=aPosition-camera;
float depth=-dot(relative,uRotation[2]);
vec2 plane=vec2(dot(relative,uRotation[0]),dot(relative,uRotation[1]));
gl_Position=vec4(plane.x*uProjection.x*2.0/uProjection.y,plane.y*uProjection.x*2.0+(uProjection.z*2.0-1.0)*depth,(depth-.1)*.98,depth);
vColor=aColor;vShape=aShape;vWorld=aPosition;
}
`;

const particleFragment=`
precision highp float;
precision highp int;
uniform mat3 uRotation;
uniform float uDistance;
varying vec4 vColor;
varying vec3 vShape;
varying vec3 vWorld;
void main(){
vec3 camera=uRotation[2]*uDistance,ray=vWorld-camera;
float along=clamp(-dot(camera,ray)/max(dot(ray,ray),.001),0.0,1.0);
float nearest=length(camera+ray*along);
float mask=smoothstep(2.5,2.72,nearest);
if(mask<.001)discard;
float r=length(vShape.xy),light;
if(vShape.z<.5){light=exp(-r*r*7.0)*.24+exp(-r*r*70.0)*1.8;}
else if(vShape.z<1.5){light=exp(-vShape.y*vShape.y*3.5)*(1.0-smoothstep(.72,1.0,abs(vShape.y)));}
else{
float body=1.0-smoothstep(.38,.43,r);
vec3 normal=vec3(vShape.xy/.43,sqrt(max(0.0,1.0-r*r/.1849)));
float surface=.1+.25*max(0.0,dot(normal,normalize(vec3(-.5,.7,1.0))));
float rim=pow(1.0-max(0.0,normal.z),2.0)*.75;
float specular=pow(max(0.0,dot(normal,normalize(vec3(-.3,.45,1.0)))),28.0)*1.8;
light=(surface+rim+specular)*body+exp(-r*r*5.0)*.055;
}
gl_FragColor=vec4(vColor.rgb*light*vColor.a*mask,0.0);
}
`;

const TAU=Math.PI*2;
const mix=(a,b,t)=>a+(b-a)*t;
const corners=[[-1,-1],[1,-1],[-1,1],[-1,1],[1,-1],[1,1]];

export class GargantuaCinematic {
  constructor(view){
    this.view=view;this.gl=view.gl;this.programs=[];this.targets=[];this.buffers=[];this.width=0;this.height=0;
    this.vertices=new Float32Array(180000);this.used=0;
    try{
      const modern=view.canvas.dataset.glVersion==='2',half=modern?null:this.gl.getExtension('OES_texture_half_float');
      this.floating=modern?!!this.gl.getExtension('EXT_color_buffer_float'):!!(half&&this.gl.getExtension('OES_texture_half_float_linear')&&this.gl.getExtension('EXT_color_buffer_half_float'));
      this.textureType=this.floating?(modern?this.gl.HALF_FLOAT:half.HALF_FLOAT_OES):this.gl.UNSIGNED_BYTE;
      this.textureFormat=this.floating&&modern?this.gl.RGBA16F:this.gl.RGBA;
      this.blur=this.program(quadVertex,blurFragment,['uImage','uStep','uExtract'],['aPosition']);
      this.composite=this.program(quadVertex,compositeFragment,['uScene','uBloom','uWide','uExposure','uTexel'],['aPosition']);
      this.particles=this.program(particleVertex,particleFragment,['uRotation','uDistance','uProjection'],['aPosition','aColor','aShape']);
      this.stream=this.gl.createBuffer();if(!this.stream)throw Error('No se pudo reservar la geometría');this.buffers.push(this.stream);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.stream);this.gl.bufferData(this.gl.ARRAY_BUFFER,this.vertices.byteLength,this.gl.DYNAMIC_DRAW);
      let seed=47391;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      this.dust=Array.from({length:420},()=>({angle:random()*TAU,radius:12+random()*48,height:(random()-.5)*34,size:.018+random()*.065,speed:.012+random()*.014,phase:random()*TAU}));
      this.streams=Array.from({length:30},()=>({angle:random()*TAU,radius:5.5+random()*6,height:(random()-.5)*.7,offset:random(),duration:14+random()*15}));
    }catch(error){this.dispose();throw error;}
  }
  program(vertex,fragment,uniforms,attributes){
    const gl=this.gl,modern=this.view.canvas.dataset.glVersion==='2';
    const vs=modern?'#version 300 es\n'+vertex.replaceAll('attribute','in').replaceAll('varying','out'):vertex;
    let fs=modern?'#version 300 es\n'+fragment.replace('precision highp float;','precision highp float;\nout vec4 outColor;').replaceAll('varying','in').replaceAll('texture2D','texture').replaceAll('gl_FragColor','outColor'):fragment;
    let v=null,f=null,handle=null;
    try{
      v=this.view.compile(gl.VERTEX_SHADER,vs);f=this.view.compile(gl.FRAGMENT_SHADER,fs);handle=gl.createProgram();if(!handle)throw Error('No se pudo crear el programa');
      gl.attachShader(handle,v);gl.attachShader(handle,f);gl.linkProgram(handle);
      if(!gl.getProgramParameter(handle,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(handle));
      this.programs.push(handle);
      return {handle,uniforms:Object.fromEntries(uniforms.map(name=>[name,gl.getUniformLocation(handle,name)])),attributes:Object.fromEntries(attributes.map(name=>[name,gl.getAttribLocation(handle,name)]))};
    }catch(error){if(handle)gl.deleteProgram(handle);throw error;}
    finally{if(v)gl.deleteShader(v);if(f)gl.deleteShader(f);}
  }
  target(width,height){
    const gl=this.gl,texture=gl.createTexture(),framebuffer=gl.createFramebuffer();
    const target={texture,framebuffer,width,height};this.targets.push(target);
    if(!texture||!framebuffer)throw Error('No se pudo reservar el resplandor');
    gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,this.textureFormat,width,height,0,gl.RGBA,this.textureType,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){
      this.floating=false;this.textureType=gl.UNSIGNED_BYTE;this.textureFormat=gl.RGBA;
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('El dispositivo no admite esta superficie');
    }
    return target;
  }
  clearTargets(){for(const t of this.targets){if(t.texture)this.gl.deleteTexture(t.texture);if(t.framebuffer)this.gl.deleteFramebuffer(t.framebuffer);}this.targets.length=0;}
  resize(width,height){
    if(width===this.width&&height===this.height)return;
    this.clearTargets();this.width=width;this.height=height;
    const w=Math.max(1,Math.ceil(width/2)),h=Math.max(1,Math.ceil(height/2));
    this.scene=this.target(width,height);this.smallA=this.target(w,h);this.smallB=this.target(w,h);
    this.wideA=this.target(Math.max(1,Math.ceil(w/2)),Math.max(1,Math.ceil(h/2)));this.wideB=this.target(this.wideA.width,this.wideA.height);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null);
  }
  begin(){const gl=this.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,this.scene.framebuffer);gl.viewport(0,0,this.width,this.height);gl.disable(gl.BLEND);}
  vertex(p,color,intensity,x,y,type){
    if(this.used+10>this.vertices.length)return;
    const v=this.vertices;let i=this.used;v[i++]=p[0];v[i++]=p[1];v[i++]=p[2];v[i++]=color[0];v[i++]=color[1];v[i++]=color[2];v[i++]=intensity;v[i++]=x;v[i++]=y;v[i++]=type;this.used=i;
  }
  orb(p,size,color,intensity=1,type=0){
    const m=this.view.rotation,v=this.vertices;
    if(this.used+60>v.length)return;
    let i=this.used;
    for(const [x,y] of corners){v[i++]=p[0]+size*(m[0]*x+m[3]*y);v[i++]=p[1]+size*(m[1]*x+m[4]*y);v[i++]=p[2]+size*(m[2]*x+m[5]*y);v[i++]=color[0];v[i++]=color[1];v[i++]=color[2];v[i++]=intensity;v[i++]=x;v[i++]=y;v[i++]=type;}
    this.used=i;
  }
  ribbon(points,width,color,intensity){
    const m=this.view.rotation,camera=[m[6]*this.view.distance,m[7]*this.view.distance,m[8]*this.view.distance];
    let previous=null;
    for(let i=0;i<points.length;i++){
      const p=points[i],next=points[Math.min(i+1,points.length-1)],prev=points[Math.max(0,i-1)];
      const dx=next[0]-prev[0],dy=next[1]-prev[1],dz=next[2]-prev[2],vx=camera[0]-p[0],vy=camera[1]-p[1],vz=camera[2]-p[2];
      let sx=dy*vz-dz*vy,sy=dz*vx-dx*vz,sz=dx*vy-dy*vx;const norm=Math.hypot(sx,sy,sz)||1;
      const t=i/(points.length-1),thickness=width*(.14+.86*t);sx*=thickness/norm;sy*=thickness/norm;sz*=thickness/norm;
      const current={a:[p[0]-sx,p[1]-sy,p[2]-sz],b:[p[0]+sx,p[1]+sy,p[2]+sz],alpha:intensity*t*t};
      if(previous){
        this.vertex(previous.a,color,previous.alpha,0,-1,1);this.vertex(previous.b,color,previous.alpha,0,1,1);this.vertex(current.a,color,current.alpha,1,-1,1);
        this.vertex(current.a,color,current.alpha,1,-1,1);this.vertex(previous.b,color,previous.alpha,0,1,1);this.vertex(current.b,color,current.alpha,1,1,1);
      }
      previous=current;
    }
  }
  geometry(experience){
    this.used=0;const time=this.view.time;
    for(const dust of this.dust){
      const angle=dust.angle+time*dust.speed;
      this.orb([Math.cos(angle)*dust.radius,dust.height+Math.sin(time*.07+dust.phase)*.4,Math.sin(angle)*dust.radius],dust.size,[.5,.61,1],.21+.08*Math.sin(time*.45+dust.phase));
    }
    for(const stream of this.streams){
      const phase=(time/stream.duration+stream.offset)%1,points=[];
      for(let j=0;j<20;j++){
        const t=Math.max(0,phase-(19-j)*.0028),r=Math.pow(mix(Math.pow(stream.radius,1.5),1.05,t),2/3),angle=stream.angle+4.7*Math.log(stream.radius/r);
        points.push([Math.cos(angle)*r,stream.height*Math.pow(1-t,1.6),Math.sin(angle)*r]);
      }
      const fade=Math.min(1,phase*10,(1-phase)*8);this.ribbon(points,.018,[.58,.17,1],fade*.28);
      this.orb(points[points.length-1],.052,[.78,.53,1],fade*.33);
    }
    experience?.emitGeometry(this);
    const gl=this.gl,p=this.particles,u=p.uniforms;
    gl.useProgram(p.handle);gl.bindBuffer(gl.ARRAY_BUFFER,this.stream);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.vertices.subarray(0,this.used));
    const bindings=[['aPosition',3,0],['aColor',4,12],['aShape',3,28]];
    for(const [name,size,offset] of bindings){const location=p.attributes[name];gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,40,offset);}
    gl.uniformMatrix3fv(u.uRotation,false,this.view.rotation);gl.uniform1f(u.uDistance,this.view.distance);
    gl.uniform3f(u.uProjection,this.view.projectionFocal(),this.width/this.height,this.view.centerY);
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.drawArrays(gl.TRIANGLES,0,this.used/10);gl.disable(gl.BLEND);
    for(const [name] of bindings)gl.disableVertexAttribArray(p.attributes[name]);
  }
  quad(program,target){
    const gl=this.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,target?.framebuffer||null);gl.viewport(0,0,target?.width||this.width,target?.height||this.height);
    gl.useProgram(program.handle);gl.bindBuffer(gl.ARRAY_BUFFER,this.view.buffer);gl.enableVertexAttribArray(program.attributes.aPosition);gl.vertexAttribPointer(program.attributes.aPosition,2,gl.FLOAT,false,0,0);
  }
  texture(unit,texture,location){const gl=this.gl;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(location,unit);}
  blurPass(source,target,x,y,extract=0){
    const gl=this.gl,u=this.blur.uniforms;this.quad(this.blur,target);this.texture(0,source.texture,u.uImage);gl.uniform2f(u.uStep,x/source.width,y/source.height);gl.uniform1f(u.uExtract,extract);gl.drawArrays(gl.TRIANGLES,0,6);
  }
  finish(experience){
    this.geometry(experience);
    this.blurPass(this.scene,this.smallA,2,0,1);this.blurPass(this.smallA,this.smallB,0,1.5);
    this.blurPass(this.smallB,this.wideA,3,0);this.blurPass(this.wideA,this.wideB,0,2);
    const gl=this.gl,u=this.composite.uniforms;this.quad(this.composite,null);
    this.texture(0,this.scene.texture,u.uScene);this.texture(1,this.smallB.texture,u.uBloom);this.texture(2,this.wideB.texture,u.uWide);
    gl.uniform1f(u.uExposure,this.view.exposure);gl.uniform2f(u.uTexel,1/this.width,1/this.height);gl.drawArrays(gl.TRIANGLES,0,6);gl.activeTexture(gl.TEXTURE0);
  }
  dispose(){this.clearTargets();for(const p of this.programs)this.gl.deleteProgram(p);for(const b of this.buffers)this.gl.deleteBuffer(b);this.programs.length=0;this.buffers.length=0;}
}

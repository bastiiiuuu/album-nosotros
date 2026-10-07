import { memories } from './recuerdos.js?v=20261006-polished';
import { createJourney, phraseParts, awakenings } from './ocean-journey.js?v=20261006-journey';
import { createOceanLife } from './ocean-life.js?v=20261006-journey';

const $ = id => document.getElementById(id);
const app = $('oceanApp'), dialog = $('memoryDialog'), canvas = $('oceanCanvas');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let world = null, selected = -1, lastFocus = null, request = 0;
let paused = reducedMotion.matches;
let lightweight = matchMedia('(max-width: 680px)').matches || (navigator.deviceMemory || 8) <= 4;
let disposed = false;
const colors = ['#6be7db','#df99ea','#93adff','#f2ca8a','#ed9bc5'];
const status = text => { $('sceneStatus').textContent = text; };
const duration = () => paused || reducedMotion.matches ? 0 : 2.1;

document.querySelectorAll('[data-memory]').forEach((button, i) => {
  button.style.setProperty('--pearl', colors[i]);
  button.addEventListener('click', () => selectMemory(i));
});
function fillMemory(index) {
  const memory = memories[index];
  dialog.style.setProperty('--pearl', colors[index]);
  $('memoryNumber').textContent = `PERLA ${String(index + 1).padStart(2,'0')} / 05`;
  $('artNumber').textContent = String(index + 1).padStart(2,'0');
  $('memoryTitle').textContent = memory.title;
  $('memoryDate').textContent = memory.date;
  $('memoryText').textContent = memory.text;
  dialog.querySelector('.memory-content').scrollTop = 0;
  discoverMemory(index);
}
async function selectMemory(index) {
  if (!memories[index] || journeyMode!=='explore') return;
  const token = ++request;
  if (!dialog.open && selected < 0) lastFocus = document.activeElement;
  selected = index;
  app.classList.add('exploring');
  document.querySelectorAll('[data-memory]').forEach((b,i) => b.setAttribute('aria-current',String(i===index)));
  if (dialog.open) { fillMemory(index); world?.focus(index, duration() * .7); world?.revealContent(); return; }
  status('Acercándonos a un recuerdo…');
  if (world) await world.focus(index, duration());
  if (token !== request || disposed) return;
  fillMemory(index); status('');
  dialog.showModal(); $('closeMemory').focus();
  world?.revealDialog();
}
function returnToOcean() {
  ++request; selected = -1;
  document.querySelectorAll('[data-memory]').forEach(b => b.removeAttribute('aria-current'));
  releaseWords(freshDiscovery);freshDiscovery=-1;
  if(journey.snapshot().complete&&!journey.snapshot().finaleSeen){startMeeting();return;}
  world?.panorama(duration()); status(journey.snapshot().count?'Una corriente te acompaña hacia lo que falta por descubrir.':'');
  if (lastFocus?.isConnected) lastFocus.focus();
}
$('closeMemory').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', returnToOcean);
let outsideDown = false;
const isOutside = e => { const r = dialog.getBoundingClientRect(); return e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom; };
dialog.addEventListener('pointerdown', e => { outsideDown = e.target===dialog && isOutside(e); });
dialog.addEventListener('click', e => { if(outsideDown && e.target===dialog && isOutside(e)) dialog.close(); outsideDown=false; });
$('nextMemory').addEventListener('click', () => selectMemory((selected + 1) % memories.length));
$('explore').addEventListener('click', () => { app.classList.add('exploring'); world?.invalidate(); status(world ? 'Toca una perla o elige una luz abajo.' : 'Elige una luz para abrir su mensaje.'); });
$('home').addEventListener('click', () => { if(journeyMode!=='explore'){leaveMeeting();return;} ++request; if(dialog.open) dialog.close(); else returnToOcean(); app.classList.remove('exploring'); });
$('motion').addEventListener('click', () => { paused=!paused; syncMotion(); });
function syncMotion() {
  document.body.classList.toggle('water-paused', paused);
  $('motion').textContent=paused?'Reanudar agua':'Pausar agua';
  $('motion').setAttribute('aria-pressed',String(paused));
  world?.setPaused(paused);
  world?.invalidate();
}
reducedMotion.addEventListener('change', e => { if(e.matches) paused=true; syncMotion(); });
$('quality').addEventListener('click', () => { lightweight=!lightweight; world?.quality(); syncQuality(); });
function syncQuality() { $('quality').setAttribute('aria-pressed',String(lightweight)); }
document.addEventListener('keydown', e => {
  if(e.key==='Escape' && !dialog.open && selected>=0) returnToOcean();
});
function fallback(error) {
  if(disposed) return;
  console.warn('Ocean switched to its accessible reading view:', error);
  world?.dispose(); world=null;
  document.body.classList.add('fallback');
  $('labels').replaceChildren();
  status('El océano 3D no está disponible. Tus cinco luces siguen aquí: elige una abajo.');
  $('motion').disabled=true; $('quality').disabled=true; $('home').disabled=true;
  if(selected>=0 && !dialog.open) selectMemory(selected);
}

let journeyStorage;
try { journeyStorage=localStorage; } catch { journeyStorage=null; }
const journey=createJourney(journeyStorage);
let journeyMode='explore',finaleEpoch=0,freshDiscovery=-1,lastOpened=-1;

function syncJourney(immediate=false) {
  const state=journey.snapshot();
  $('journeyCount').textContent=`${state.count} / 5`;
  $('journeyMeter').setAttribute('aria-valuenow',String(state.count));
  $('journeyMeter').style.setProperty('--progress',`${state.count/5*100}%`);
  $('journeyChapter').textContent=state.count?awakenings[state.count-1]:'Cada recuerdo enciende algo';
  $('journeySaved').textContent=state.persistent?'Tu recorrido se guarda en este navegador':'Tu recorrido se conserva durante esta visita';
  $('resetJourney').disabled=state.count===0;
  $('watchMeeting').hidden=!state.complete;
  $('watchMeeting').textContent=state.finaleSeen?'Volver a ver nuestro encuentro':'Ver nuestro encuentro';
  $('journeyPhrase').replaceChildren(...phraseParts.map((part,i)=>{
    const span=document.createElement('span');span.textContent=i<state.count?part:'···';span.className=i<state.count?'phrase-found':'phrase-hidden';return span;
  }));
  document.querySelectorAll('[data-memory]').forEach((button,i)=>{
    const found=state.visited.includes(i);button.classList.toggle('is-visited',found);
    button.setAttribute('aria-label',`${memories[i].short}${found?', descubierta':''}`);
  });
  world?.setProgress(state.visited,lastOpened,immediate);
}
function discoverMemory(index) {
  lastOpened=index;
  if(journey.visit(index))freshDiscovery=index;
  syncJourney();
}
function releaseWords(index) {
  if(paused||reducedMotion.matches||index<0)return;
  const fragments=[memories[index].short,...phraseParts.slice(0,journey.snapshot().count).slice(-2)];
  $('wordCurrent').replaceChildren();
  fragments.forEach((text,i)=>{
    const span=document.createElement('span');span.textContent=text;
    span.style.setProperty('--word-x',`${30+i*19}%`);span.style.setProperty('--word-delay',`${i*.35}s`);
    span.addEventListener('animationend',()=>span.remove(),{once:true});$('wordCurrent').append(span);
  });
}
function applyJourneyMode(mode) {
  journeyMode=mode;
  const active=mode!=='explore';
  app.classList.toggle('finale-active',active);app.classList.toggle('contemplating',mode==='contemplate');
  $('memoryNav').inert=active;$('labels').inert=active;
  $('journeyHud').inert=active;$('explore').disabled=active;
  $('finalePanel').hidden=!active;
  $('finalePanel').inert=mode==='contemplate';
  $('exitContemplate').hidden=mode!=='contemplate';
  document.querySelector('.ocean-header').inert=mode==='contemplate';
}
async function startMeeting() {
  if(!journey.snapshot().complete||disposed)return;
  const epoch=++finaleEpoch;++request;
  selected=-1;freshDiscovery=-1;
  applyJourneyMode('meeting');app.classList.add('exploring');
  $('wordCurrent').replaceChildren();
  $('finaleTitle').textContent='Dos corrientes. Un mismo lugar.';
  $('finaleSubtitle').textContent='Lo que fuimos guardando nos acerca.';
  $('finaleActions').hidden=true;$('skipMeeting').hidden=false;
  $('skipMeeting').focus();status('');
  if(world)await world.meet(paused||reducedMotion.matches);
  if(epoch!==finaleEpoch||disposed)return;
  journey.finish();syncJourney();applyJourneyMode('complete');
  $('finaleTitle').textContent=phraseParts.join(' ');
  $('finaleSubtitle').textContent='Mira todo lo que nació de nosotros.';
  $('skipMeeting').hidden=true;$('finaleActions').hidden=false;
  $('contemplate').focus();
}
function leaveMeeting() {
  ++finaleEpoch;++request;
  applyJourneyMode('explore');
  world?.cancelMeeting();world?.panorama(duration());
  $('wordCurrent').replaceChildren();status('');
  $('watchMeeting').focus();
}
function leaveContemplation() {
  if(journeyMode!=='contemplate')return;
  applyJourneyMode('complete');$('contemplate').focus();
}
$('watchMeeting').addEventListener('click',startMeeting);
$('repeatMeeting').addEventListener('click',startMeeting);
$('skipMeeting').addEventListener('click',()=>world?.skipMeeting());
$('backToOcean').addEventListener('click',leaveMeeting);
$('contemplate').addEventListener('click',()=>{applyJourneyMode('contemplate');$('exitContemplate').focus();});
$('exitContemplate').addEventListener('click',leaveContemplation);
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||dialog.open||$('resetJourneyDialog').open)return;
  if(journeyMode==='contemplate')leaveContemplation();else if(journeyMode!=='explore')leaveMeeting();
});
$('resetJourney').addEventListener('click',()=>{$('resetJourneyDialog').showModal();$('cancelReset').focus();});
$('cancelReset').addEventListener('click',()=>$('resetJourneyDialog').close());
$('confirmReset').addEventListener('click',()=>{
  ++finaleEpoch;++request;journey.reset();freshDiscovery=-1;lastOpened=-1;
  applyJourneyMode('explore');world?.cancelMeeting();syncJourney(true);
  world?.panorama(duration());app.classList.remove('exploring');
  $('wordCurrent').replaceChildren();$('resetJourneyDialog').close();
  status('El océano está listo para un nuevo recorrido.');$('explore').focus();
});

async function boot() {
  let timeout;
  try {
    const modules = await Promise.race([
      Promise.all([import('three'), import('three/addons/controls/OrbitControls.js'),
        import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'),
        import('three/addons/postprocessing/UnrealBloomPass.js'), import('three/addons/postprocessing/OutputPass.js'), import('gsap')]),
      new Promise((_, reject) => { timeout=setTimeout(()=>reject(new Error('CDN timeout')),20000); })
    ]);
    clearTimeout(timeout);
    if(disposed) return;
    world = createWorld(...modules);
    $('motion').disabled=false; $('quality').disabled=false; $('home').disabled=false;
    syncMotion(); syncQuality(); syncJourney(true); status('');
    if(journeyMode!=='explore')world.meet(true);
    if (selected>=0) world.focus(selected,0);
  } catch(error) { clearTimeout(timeout); fallback(error); }
}

function createWorld(THREE, {OrbitControls}, {EffectComposer}, {RenderPass}, {UnrealBloomPass}, {OutputPass}, gsapModule) {
  const gsap=gsapModule.gsap;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});
  renderer.debug.onShaderError=(gl,program,vertexShader,fragmentShader)=>{
    throw new Error('Ocean shader: '+[gl.getProgramInfoLog(program),gl.getShaderInfoLog(vertexShader),gl.getShaderInfoLog(fragmentShader)].filter(Boolean).join('\n'));
  };
  renderer.setClearColor('#030b14');
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05;
  const scene=new THREE.Scene(); scene.background=new THREE.Color('#030b14'); scene.fog=new THREE.FogExp2('#03131f',.036);
  const camera=new THREE.PerspectiveCamera(47,1,.1,120);
  const controls=new OrbitControls(camera,canvas);
  controls.enableDamping=true; controls.dampingFactor=.045; controls.enablePan=false;
  controls.rotateSpeed=.28; controls.zoomSpeed=.48;
  controls.minPolarAngle=Math.PI*.27; controls.maxPolarAngle=Math.PI*.53;
  controls.minAzimuthAngle=-.72; controls.maxAzimuthAngle=.72;
  controls.minDistance=12; controls.maxDistance=43;
  const homePosition=()=>new THREE.Vector3(0,4.5,innerWidth<680?36:24);
  const homeTarget=new THREE.Vector3(0,1,0);
  camera.position.copy(homePosition()); controls.target.copy(homeTarget); controls.update();
  const composer=new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene,camera));
  const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),1.25,.5,.22);
  const output=new OutputPass(); composer.addPass(bloom); composer.addPass(output);
  const hemisphere=new THREE.HemisphereLight('#78d9e7','#020813',1.6);scene.add(hemisphere);
  const sun=new THREE.DirectionalLight('#83e9e4',2.2);sun.position.set(-6,16,-5);scene.add(sun);
  const pink=new THREE.PointLight('#dc73be',18,24,2); pink.position.set(9,2,0);scene.add(pink);
  let alive=true,dirty=true,elapsed=0,last=performance.now(),trip=null,resolveTrip=null,hovered=-1;
  const time={value:0};
  let slowFrameTime=0, performanceFrames=0;
  const random=(()=>{let s=122022;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296);})();
  const fogUniforms=()=>THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
  const fogVertex=`\n#include <fog_pars_vertex>\n`;
  const fogFragment=`\n#include <fog_pars_fragment>\n`;
  const floorMaterial=new THREE.ShaderMaterial({fog:true,uniforms:{...fogUniforms(),uTime:time,uAwake:{value:.35}},
    vertexShader:`varying vec2 vUv; ${fogVertex}
      void main(){vUv=uv;vec3 p=position;p.z+=sin(p.x*.23)*.55+cos(p.y*.31)*.4;
      vec4 mvPosition=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader:`uniform float uTime; uniform float uAwake; varying vec2 vUv; ${fogFragment}
      void main(){vec2 p=vUv*85.;float t=uTime*.13;
      float a=sin(p.x+sin(p.y*1.3+t)*1.7),b=cos(p.y+sin(p.x*.8-t)*1.8);
      float caustic=pow(max(0.,1.-abs(a+b)*.62),15.);
      vec3 c=vec3(.006,.028,.036)+vec3(.02,.17,.16)*caustic;
      gl_FragColor=vec4(c*uAwake,1.);
      #include <fog_fragment>
      }`});
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(90,90,70,70),floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=-4.3;scene.add(floor);
  const shaftMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    uniforms:{uTime:time},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;uniform float uTime;void main(){float edge=pow(sin(vUv.x*3.14159),3.);float fade=pow(vUv.y,1.4)*(1.-smoothstep(.94,1.,vUv.y));float shimmer=.8+.2*sin(vUv.y*15.+uTime*.35);gl_FragColor=vec4(.16,.52,.58,edge*fade*shimmer*.075);}`});
  for(let i=0;i<7;i++){const shaft=new THREE.Mesh(new THREE.PlaneGeometry(2.5+random()*2.5,29),shaftMaterial);shaft.position.set(-14+i*5,8,-13-random()*8);shaft.rotation.z=-.23;scene.add(shaft);}
  const rockGeo=new THREE.IcosahedronGeometry(1,1),rockMat=new THREE.MeshStandardMaterial({color:'#0b2430',roughness:.96});
  for(let i=0;i<32;i++){const rock=new THREE.Mesh(rockGeo,rockMat);rock.position.set((random()-.5)*44,-4.1,-12+random()*21);rock.scale.set(1+random()*2.5,.5+random()*1.3,.8+random()*2);rock.rotation.set(random(),random()*6,random());scene.add(rock);}
  function filaments(count,length,radius,color){
    const positions=[],weights=[],phases=[];
    for(let strand=0;strand<count;strand++){
      const angle=strand/count*Math.PI*2;
      for(let j=0;j<25;j++)for(const k of [j,j+1]){
        const f=k/25;positions.push(Math.cos(angle)*radius,-f*length,Math.sin(angle)*radius);
        weights.push(f*f);phases.push(angle);
      }
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('aWeight',new THREE.Float32BufferAttribute(weights,1));geometry.setAttribute('aPhase',new THREE.Float32BufferAttribute(phases,1));
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:true,
      uniforms:{...fogUniforms(),uTime:time,uColor:{value:new THREE.Color(color)}},
      vertexShader:`uniform float uTime;attribute float aWeight;attribute float aPhase;varying float vWeight;${fogVertex}
        void main(){vWeight=aWeight;vec3 p=position;p.x+=sin(p.y*1.5+uTime*.8+aPhase)*aWeight*.5;p.z+=cos(p.y+uTime*.6+aPhase)*aWeight*.4;vec4 mvPosition=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader:`uniform vec3 uColor;varying float vWeight;${fogFragment}
        void main(){gl_FragColor=vec4(uColor*1.7,(1.-vWeight*.65)*.65);
        #include <fog_fragment>
        }`});
    return new THREE.LineSegments(geometry,material);
  }
  const jellyGeometry=new THREE.SphereGeometry(1,32,20,0,Math.PI*2,0,Math.PI*.5);
  const jellyfish=[];
  const jellyColors=['#58dccd','#9c86ec','#66bcf0','#e19ccc'];
  for(let i=0;i<8;i++){
    const group=new THREE.Group(),color=jellyColors[i%4];
    const phase=i*.93;
    const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:true,
      uniforms:{...fogUniforms(),uTime:time,uPhase:{value:phase},uColor:{value:new THREE.Color(color)}},
      vertexShader:`uniform float uTime;uniform float uPhase;varying vec3 vNormal;varying vec3 vView;varying vec2 vUv;${fogVertex}
        void main(){vUv=uv;vec3 p=position;float pulse=sin(uTime*1.2+uPhase);p.xz*=1.+pulse*.08;p.y*=.62-pulse*.06;p.y+=sin(atan(p.z,p.x)*12.+uTime)*.035*(1.-position.y);vec4 mvPosition=modelViewMatrix*vec4(p,1.);vNormal=normalize(normalMatrix*normal);vView=-mvPosition.xyz;gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader:`uniform vec3 uColor;varying vec3 vNormal;varying vec3 vView;varying vec2 vUv;${fogFragment}
        void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),2.);float ribs=pow(abs(sin(vUv.x*37.699)),18.);float edge=pow(1.-vUv.y,16.);vec3 c=uColor*(.15+rim*.8+ribs*.28+edge*.55);gl_FragColor=vec4(c,.25+rim*.45);
        #include <fog_fragment>
        }`});
    group.add(new THREE.Mesh(jellyGeometry,material));group.add(filaments(13,3.2,.62,color));
    group.position.set(i===0?5.6:(random()-.5)*29,i===0?5:1+random()*8,i===0?0:-7-random()*13);
    const size=i===0?1.65:.5+random()*.8;group.scale.setScalar(size);group.userData={base:group.position.clone(),phase};jellyfish.push(group);scene.add(group);
  }
  for(let i=0;i<22;i++){const plant=filaments(9,.8+random()*2.1,.12,jellyColors[i%4]);plant.rotation.z=Math.PI;plant.position.set((random()-.5)*37,-3.8,-9+random()*16);scene.add(plant);}
  const positions=[],sizes=[],seeds=[];
  for(let i=0;i<950;i++){positions.push((random()-.5)*48,random()*24-5,(random()-.5)*42);sizes.push(1+random()*2);seeds.push(random());}
  const snowGeo=new THREE.BufferGeometry();snowGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));snowGeo.setAttribute('aSize',new THREE.Float32BufferAttribute(sizes,1));snowGeo.setAttribute('aSeed',new THREE.Float32BufferAttribute(seeds,1));
  const snowMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:true,
    uniforms:{...fogUniforms(),uTime:time,uDpr:{value:1}},
    vertexShader:`uniform float uTime;uniform float uDpr;attribute float aSize;attribute float aSeed;varying float vSeed;${fogVertex}
      void main(){vSeed=aSeed;vec3 p=position;p.y=mod(p.y+5.+uTime*(.12+aSeed*.15),24.)-5.;p.x+=sin(uTime*.16+aSeed*30.)*.6;vec4 mvPosition=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mvPosition;gl_PointSize=clamp(aSize*uDpr*(aSeed>.96?90.:32.)/max(1.,-mvPosition.z),1.,24.);
      #include <fog_vertex>
      }`,
    fragmentShader:`varying float vSeed;${fogFragment}
      void main(){vec2 p=gl_PointCoord*2.-1.;float r=length(p);float a;
      if(vSeed>.985){p.y=-p.y;float q=dot(p,p)-.55;float heart=q*q*q-p.x*p.x*p.y*p.y*p.y;a=1.-smoothstep(-.025,.025,heart);}
      else if(vSeed>.96){a=(1.-smoothstep(.7,1.,r))*smoothstep(.45,.72,r);}
      else {a=pow(max(0.,1.-r),2.);}
      if(a<.01)discard;gl_FragColor=vec4(mix(vec3(.3,.65,.7),vec3(.9,.55,.72),step(.985,vSeed)),a*.48);
      #include <fog_fragment>
      }`});
  const snow=new THREE.Points(snowGeo,snowMaterial);scene.add(snow);
  const pearlGeometry=new THREE.SphereGeometry(.78,40,28);
  const locations=[[-7.2,.3,2],[-3.6,2,-1],[.8,.4,3],[4.7,1.9,2],[8.4,-.5,-1]];
  const pearls=[],labels=[];
  locations.forEach((xyz,i)=>{
    const material=new THREE.ShaderMaterial({fog:true,uniforms:{...fogUniforms(),uTime:time,uColor:{value:new THREE.Color(colors[i])},uHover:{value:0}},
      vertexShader:`varying vec3 vNormal;varying vec3 vView;varying vec3 vPosition;${fogVertex}
        void main(){vPosition=position;vec4 mvPosition=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=-mvPosition.xyz;gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader:`uniform float uTime;uniform float uHover;uniform vec3 uColor;varying vec3 vNormal;varying vec3 vView;varying vec3 vPosition;${fogFragment}
        void main(){vec3 n=normalize(vNormal);float facing=max(0.,dot(n,normalize(vView)));float rim=pow(1.-facing,2.8);float shine=pow(max(0.,dot(n,normalize(vec3(-.6,.8,1.)))),36.);float ribbons=pow(.5+.5*sin(vPosition.y*15.+sin(vPosition.x*8.+uTime*.4)*2.),7.);vec3 c=uColor*(.07+rim*1.8+ribbons*.055+uHover*.3)+vec3(shine*.85);gl_FragColor=vec4(c,1.);
        #include <fog_fragment>
        }`});
    const mesh=new THREE.Mesh(pearlGeometry,material);mesh.position.set(...xyz);mesh.userData={index:i,baseY:xyz[1]};scene.add(mesh);pearls.push(mesh);
    const light=new THREE.PointLight(colors[i],2,5,2);mesh.add(light);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.1,.008,5,80),new THREE.MeshBasicMaterial({color:colors[i],transparent:true,opacity:.32}));ring.rotation.x=1.2;ring.rotation.y=.4;mesh.add(ring);
    const label=document.createElement('button');label.type='button';label.className='pearl-label';label.setAttribute('aria-label',`Abrir ${memories[i].title}`);label.style.setProperty('--pearl',colors[i]);
    const number=document.createElement('span');number.textContent=String(i+1).padStart(2,'0');label.append(number,document.createTextNode(memories[i].short));label.addEventListener('click',()=>selectMemory(i));$('labels').append(label);labels.push(label);
  });
  const life=createOceanLife(THREE,{scene,pearls,labels,jellyfish,hemisphere,sun,floorMaterial,random,memories});
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),projected=new THREE.Vector3();
  function pick(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(pearls,false)[0]?.object.userData.index??-1;}
  function hover(index){if(index===hovered)return;hovered=index;canvas.style.cursor=index<0?'grab':'pointer';dirty=true;}
  const touches=new Map();let multiTouch=false;
  const onDown=e=>{touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size>1)multiTouch=true;};
  const onUp=e=>{const start=touches.get(e.pointerId);touches.delete(e.pointerId);const moved=!start||Math.hypot(e.clientX-start.x,e.clientY-start.y)>8;
    if(!multiTouch&&!moved&&e.button===0&&selected<0&&journeyMode==='explore'){const index=pick(e);if(index>=0)selectMemory(index);}
    if(!touches.size)multiTouch=false;};
  const onMove=e=>{if(e.pointerType!=='touch'&&selected<0)hover(pick(e));};
  const onCancel=e=>{touches.delete(e.pointerId);if(!touches.size)multiTouch=false;hover(-1);};
  canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onCancel);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerleave',()=>hover(-1));
  controls.addEventListener('change',()=>{dirty=true;});
  function cancelTrip(){trip?.kill();trip=null;resolveTrip?.();resolveTrip=null;}
  function travel(position,target,seconds,restore){
    cancelTrip();controls.enabled=false;
    controls.enableDamping=false;controls.update();
    controls.minDistance=1;
    if(!seconds){camera.position.copy(position);controls.target.copy(target);controls.update();controls.enableDamping=true;controls.enabled=restore;controls.minDistance=restore?12:1;dirty=true;return Promise.resolve();}
    return new Promise(resolve=>{resolveTrip=resolve;trip=gsap.timeline({onComplete:()=>{trip=null;resolveTrip=null;controls.enableDamping=true;controls.enabled=restore;controls.minDistance=restore?12:1;resolve();}});
      trip.to(camera.position,{x:position.x,y:position.y,z:position.z,duration:seconds,ease:'sine.inOut'},0);
      trip.to(controls.target,{x:target.x,y:target.y,z:target.z,duration:seconds,ease:'sine.inOut'},0);
    });
  }
  function focus(index,seconds){const target=pearls[index].position.clone();return travel(target.clone().add(new THREE.Vector3(0,1,6)),target,seconds,false);}
  function panorama(seconds){return travel(homePosition(),homeTarget,seconds,true);}
  function resize(){if(!alive)return;const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
    const ratio=Math.min(devicePixelRatio||1,lightweight?1:1.6);
    renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);composer.setPixelRatio(ratio);composer.setSize(w,h);
    camera.aspect=w/h;camera.updateProjectionMatrix();snowMaterial.uniforms.uDpr.value=ratio;
    snowGeo.setDrawRange(0,lightweight?450:950);jellyfish.forEach((j,i)=>j.visible=!lightweight||i<5);dirty=true;
  }
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  const visible=()=>{last=performance.now();if(document.hidden){renderer.setAnimationLoop(null);trip?.pause();}else{trip?.resume();dirty=true;renderer.setAnimationLoop(frame);}};
  document.addEventListener('visibilitychange',visible);
  function frame(now){
    if(!alive)return;
    const rawDt=(now-last)/1000;
    const dt=Math.min(rawDt,.05);last=now;
    if(!paused&&!lightweight&&rawDt>0&&rawDt<.12){
      slowFrameTime+=rawDt;performanceFrames++;
      if(performanceFrames===150){
        if(slowFrameTime/performanceFrames>.029){lightweight=true;resize();syncQuality();}
        slowFrameTime=0;performanceFrames=0;
      }
    }
    if(!paused){elapsed+=dt;time.value=elapsed;dirty=true;}
    if(trip||(!paused&&life.animating))dirty=true;
    controls.update(dt);
    if(!dirty)return;
    pearls.forEach((pearl,i)=>{
      if(!paused)pearl.position.y=pearl.userData.baseY+Math.sin(elapsed*.32+i)*.1;
      const hoverValue=i===hovered?1:0;
      pearl.material.uniforms.uHover.value=paused?hoverValue:THREE.MathUtils.damp(pearl.material.uniforms.uHover.value,hoverValue,8,dt);
      const scale=1+pearl.material.uniforms.uHover.value*.12;pearl.scale.setScalar(scale);
      projected.copy(pearl.position);projected.y-=1.25;projected.project(camera);
      const x=(projected.x*.5+.5)*canvas.clientWidth,y=(-projected.y*.5+.5)*canvas.clientHeight;
      const show=journeyMode==='explore'&&selected<0&&app.classList.contains('exploring')&&projected.z>-1&&projected.z<1&&x>40&&x<canvas.clientWidth-40&&y>75&&y<canvas.clientHeight-170;
      labels[i].hidden=!show;if(show)labels[i].style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;
    });
    if(!paused)jellyfish.forEach(j=>{j.position.y=j.userData.base.y+Math.sin(elapsed*.28+j.userData.phase)*.24;j.rotation.z=Math.sin(elapsed*.19+j.userData.phase)*.05;});
    life.update(dt,elapsed,{inMemory:selected>=0,paused,reduced:reducedMotion.matches,lightweight,finale:journeyMode!=='explore'});
    try { composer.render(dt);dirty=false; }
    catch(error) { fallback(error); }
  }
  const contextLost=e=>{e.preventDefault();fallback(new Error('WebGL context lost'));};
  canvas.addEventListener('webglcontextlost',contextLost);
  renderer.setAnimationLoop(frame);
  return {focus,panorama,quality:resize,invalidate:()=>{dirty=true;},
    setProgress:(indices,last,immediate)=>{life.setProgress(indices,last,immediate);dirty=true;},
    meet(immediate){dirty=true;return Promise.all([
      travel(new THREE.Vector3(0,4.5,innerWidth<680?25:20),new THREE.Vector3(0,.7,0),immediate?0:3.4,false),
      life.startFinale(immediate)
    ]);},
    skipMeeting(){trip?.progress(1);life.finishFinale();dirty=true;},
    cancelMeeting(){life.cancelFinale();dirty=true;},
    setPaused(value){if(value&&reducedMotion.matches){trip?.progress(1);if(journeyMode==='meeting')life.finishFinale();}else trip?.paused(value||document.hidden);dirty=true;},
    revealDialog:()=>{if(!reducedMotion.matches&&!paused)gsap.fromTo(dialog,{opacity:0,y:10},{opacity:1,y:0,duration:.65,ease:'sine.out',overwrite:true,clearProps:'all'});},
    revealContent:()=>{if(!reducedMotion.matches&&!paused)gsap.fromTo(dialog.querySelector('.memory-content'),{opacity:.35,y:5},{opacity:1,y:0,duration:.5,ease:'sine.out',overwrite:true,clearProps:'all'});},
    dispose(){if(!alive)return;alive=false;life.dispose();cancelTrip();renderer.setAnimationLoop(null);observer.disconnect();document.removeEventListener('visibilitychange',visible);canvas.removeEventListener('webglcontextlost',contextLost);controls.dispose();
      const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());bloom.dispose();output.dispose();composer.dispose();renderer.dispose();gsap.killTweensOf([dialog,dialog.querySelector('.memory-content')]);
    }};
}
window.addEventListener('pagehide',()=>{disposed=true;++request;++finaleEpoch;world?.dispose();});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
syncMotion();
syncJourney(true);
boot();

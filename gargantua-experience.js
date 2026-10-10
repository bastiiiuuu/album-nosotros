import { createJourney, JOURNEY_KEY } from './ocean-journey.js';
import { memories } from './recuerdos.js';

const TAU=Math.PI*2;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const direction=[.6,.34,.724154679];
const directionLength=Math.hypot(...direction);
for(let i=0;i<3;i++)direction[i]/=directionLength;
const destination=direction.map(value=>value*23);
const signalStars=[.52,.78].map(fraction=>destination.map((value,i)=>value+([3,2,-1][i]-value)*fraction));

export function lookQuaternion(vector){
  const length=Math.hypot(...vector)||1,x=vector[0]/length,y=vector[1]/length,z=vector[2]/length;
  if(z<-.999999)return new Float32Array([0,1,0,0]);
  const q=new Float32Array([-y,x,0,1+z]),norm=Math.hypot(...q);
  for(let i=0;i<4;i++)q[i]/=norm;
  return q;
}

export function projectPoint(point,camera){
  const m=camera.rotation,d=camera.distance;
  const x=point[0]-m[6]*d,y=point[1]-m[7]*d,z=point[2]-m[8]*d;
  const depth=-(x*m[6]+y*m[7]+z*m[8]);
  if(depth<=.05)return null;
  const scale=camera.height*camera.focal/depth;
  const px=camera.width*.5+(x*m[0]+y*m[1]+z*m[2])*scale;
  const py=camera.height*(1-camera.centerY)-(x*m[3]+y*m[4]+z*m[5])*scale;
  const length=x*x+y*y+z*z;
  const along=-(m[6]*d*x+m[7]*d*y+m[8]*d*z)/Math.max(.001,length);
  const nearX=m[6]*d+x*along,nearY=m[7]*d+y*along,nearZ=m[8]*d+z*along;
  const occluded=along>0&&along<1&&nearX*nearX+nearY*nearY+nearZ*nearZ<6.8;
  return {x:px,y:py,depth,scale,occluded,visible:px>-30&&px<camera.width+30&&py>-30&&py<camera.height+30};
}

export function starPosition(shot,progress){
  const phase=clamp(progress,0,1);
  const radius=Math.pow(Math.pow(shot.radius,1.5)*(1-phase)+Math.pow(1.02,1.5)*phase,2/3);
  const angle=shot.angle+5.2*Math.log(shot.radius/radius);
  const height=shot.height*Math.pow(radius/shot.radius,1.6)+Math.sin(angle*2+phase*4)*.12*(1-phase);
  return [Math.cos(angle)*radius,height,Math.sin(angle)*radius];
}

export class GargantuaExperience {
  constructor(view,root){
    this.view=view;this.root=root;this.revealAge=10;
    this.ui=Object.fromEntries(['Cinema','CinemaExit','Signal','SignalPanel','SignalSearch','SignalRevealed','SignalHint','SignalMeter','SignalAssist','SignalReplay','SignalClose','Launch','Settings','SettingsPanel','Bridge','BridgePanel','BridgeClose','BridgeCount','BridgeCopy','BridgeList','OceanVisit','Feedback','Tools'].map(name=>[name,root.querySelector('#gargantua'+name)]));
    this.shots=[];this.clock=0;this.lastLaunch=-10;this.feedbackUntil=0;this.cinema=false;this.signal=false;this.revealed=false;this.hold=0;this.alignment=0;this.snapshot={visited:[],count:0};
    this.camera={rotation:view.rotation,distance:23,width:1,height:1,focal:1,centerY:.5};
    this.player=document.getElementById('player');this.playerInert=false;
    const signal=view.abort.signal;
    this.ui.Cinema.addEventListener('click',()=>this.setCinema(true),{signal});
    this.ui.CinemaExit.addEventListener('click',()=>this.setCinema(false),{signal});
    this.ui.Signal.addEventListener('click',()=>this.toggleSignal(),{signal});
    this.ui.SignalClose.addEventListener('click',()=>this.closeSignal(),{signal});
    this.ui.SignalAssist.addEventListener('click',()=>this.followSignal(),{signal});
    this.ui.SignalReplay.addEventListener('click',()=>this.beginSignal(),{signal});
    this.ui.Launch.addEventListener('click',()=>this.launch(),{signal});
    this.ui.Settings.addEventListener('click',()=>this.toggleSettings(),{signal});
    this.ui.Bridge.addEventListener('click',()=>this.toggleBridge(),{signal});
    this.ui.BridgeClose.addEventListener('click',()=>this.toggleBridge(false),{signal});
    this.ui.OceanVisit.addEventListener('click',()=>document.getElementById('gargantuaBack').click(),{signal});
    root.addEventListener('keydown',event=>{
      if(event.key!=='Escape')return;
      if(this.cinema)this.setCinema(false);
      else if(!this.ui.BridgePanel.hidden)this.toggleBridge(false);
      else if(!this.ui.SignalPanel.hidden)this.closeSignal();
      else if(!this.ui.SettingsPanel.hidden)this.toggleSettings(false);
      else return;
      event.preventDefault();event.stopPropagation();
    },{signal});
    view.canvas.addEventListener('keydown',event=>{
      if(event.altKey||event.ctrlKey||event.metaKey||!['Enter',' '].includes(event.key))return;
      event.preventDefault();event.stopPropagation();this.launch();
    },{signal});
    window.addEventListener('storage',event=>{if((event.key===JOURNEY_KEY||event.key===null)&&view.active){this.refreshJourney();view.wake();}},{signal});
    this.refreshJourney();
  }
  enable(enabled){for(const name of ['Cinema','Signal','Launch'])this.ui[name].disabled=!enabled;}
  start(){this.refreshJourney();this.resize();}
  refreshJourney(){
    let storage=null;try{storage=window.localStorage;}catch{}
    this.snapshot=createJourney(storage).snapshot();
    this.ui.BridgeCount.textContent=this.snapshot.count+' / 5';
    this.ui.BridgeCopy.textContent=this.snapshot.count===5?'Las cinco luces de nuestro océano siguen brillando aquí.':this.snapshot.count?'Cada recuerdo que abriste viajó contigo hasta aquí.':'Cada perla que abras encenderá una estrella aquí.';
    this.ui.BridgeList.replaceChildren();
    memories.forEach((memory,index)=>{
      const item=document.createElement('li'),number=document.createElement('span'),label=document.createElement('span');
      const visited=this.snapshot.visited.includes(index);
      number.textContent=String(index+1).padStart(2,'0');label.textContent=memory.short;
      item.classList.toggle('is-discovered',visited);item.setAttribute('aria-label',memory.short+(visited?', estrella encendida':', perla por descubrir'));
      item.append(number,label);this.ui.BridgeList.append(item);
    });
    this.root.dataset.oceanStars=String(this.snapshot.count);
  }
  resize(){
    this.camera.width=innerWidth;this.camera.height=innerHeight;
  }
  feedback(message){this.ui.Feedback.textContent=message;this.feedbackUntil=this.clock+3.2;}
  setCinema(enabled){
    if(enabled===this.cinema)return;
    this.cinema=enabled;
    if(enabled){
      this.closeSignal(false);this.toggleBridge(false);this.toggleSettings(false);
      this.previousPaused=this.view.paused;this.view.clearGesture();
      this.cinemaTime=0;this.cinemaYaw=Math.atan2(this.view.rotation[6],this.view.rotation[8]);
      this.cinemaPitch=Math.asin(clamp(this.view.rotation[7],-.9,.9));
      if(!this.view.motion.matches)this.view.paused=false;
      this.playerInert=this.player?.inert||false;
      if(this.player)this.player.inert=true;
    }else{
      this.view.paused=this.previousPaused;
      this.view.targetOrientation.set(this.view.orientation);this.view.targetDistance=this.view.distance;
      this.view.controls.zoom.value=String(this.view.distance);
      if(this.player)this.player.inert=this.playerInert;
    }
    this.root.classList.toggle('is-cinema',enabled);document.body.classList.toggle('gargantua-cinema',enabled);
    this.ui.CinemaExit.hidden=!enabled;this.ui.Cinema.setAttribute('aria-pressed',String(enabled));
    this.root.dataset.cinema=String(enabled);this.view.syncPause();
    this.view.resize();this.view.wake();
    (enabled?this.ui.CinemaExit:this.ui.Cinema).focus({preventScroll:true});
  }
  interact(){if(this.cinema)this.setCinema(false);}
  toggleSettings(force){
    const open=force??this.ui.SettingsPanel.hidden;this.ui.SettingsPanel.hidden=!open;
    this.ui.Settings.setAttribute('aria-expanded',String(open));this.view.resize();this.view.wake();
  }
  toggleBridge(force){
    const open=force??this.ui.BridgePanel.hidden;
    if(open){this.refreshJourney();this.closeSignal(false);this.toggleSettings(false);}
    this.ui.BridgePanel.hidden=!open;this.ui.Bridge.setAttribute('aria-expanded',String(open));
    if(open)this.ui.BridgeClose.focus({preventScroll:true});
    else if(this.ui.BridgePanel.contains(document.activeElement))this.ui.Bridge.focus({preventScroll:true});
  }
  toggleSignal(){
    if(!this.ui.SignalPanel.hidden){this.closeSignal();return;}
    if(this.revealed){this.showMessage();return;}
    this.beginSignal();
  }
  beginSignal(){
    this.toggleBridge(false);this.toggleSettings(false);this.signal=true;this.hold=0;
    this.ui.SignalPanel.hidden=false;this.ui.SignalSearch.hidden=false;this.ui.SignalRevealed.hidden=true;
    this.ui.Signal.setAttribute('aria-pressed','true');this.root.classList.add('is-signaling');this.root.classList.remove('has-signal');
    this.view.setZoom(23);this.view.resize();this.view.wake();
    this.ui.SignalHint.textContent='Gira el cielo hasta que las dos luces se encuentren.';
  }
  closeSignal(focus=true){
    this.signal=false;this.hold=0;this.ui.SignalPanel.hidden=true;this.ui.Signal.setAttribute('aria-pressed','false');
    this.root.classList.remove('is-signaling','has-signal');
    if(focus)this.ui.Signal.focus({preventScroll:true});
    this.view.resize();this.view.wake();
  }
  followSignal(){
    this.view.clearGesture();this.view.targetOrientation.set(lookQuaternion(direction));this.view.targetDistance=23;this.view.controls.zoom.value='23';this.view.wake();
  }
  showMessage(){
    if(!this.revealed)this.revealAge=0;
    this.revealed=true;this.signal=false;this.ui.SignalPanel.hidden=false;this.ui.SignalSearch.hidden=true;this.ui.SignalRevealed.hidden=false;
    this.ui.Signal.setAttribute('aria-pressed','true');this.ui.Signal.textContent='Nuestra señal';
    this.root.classList.add('is-signaling','has-signal');this.root.dataset.signalFound='true';
    this.feedback('Dos luces. El mismo lugar.');this.view.resize();this.view.wake();
    this.ui.SignalRevealed.querySelector('.gargantua-quote').focus({preventScroll:true});
  }
  launch(x,y){
    if(!this.view.active||this.view.lost||!this.view.program||this.clock-this.lastLaunch<.22)return;
    this.interact();this.lastLaunch=this.clock;
    const c=this.camera,m=this.view.rotation,d=this.view.distance;
    const chosenX=x??c.width*(Math.random()>.5?.76:.24),chosenY=y??c.height*(1-c.centerY)-c.height*.1;
    const localX=(chosenX-c.width*.5)/c.height*d/Math.max(.01,c.focal);
    const localY=(c.height*(1-c.centerY)-chosenY)/c.height*d/Math.max(.01,c.focal);
    let px=m[0]*localX+m[3]*localY,py=m[1]*localX+m[4]*localY,pz=m[2]*localX+m[5]*localY;
    let radius=Math.hypot(px,pz);
    if(radius<5){const angle=Math.atan2(pz,px)||.8;px=Math.cos(angle)*8;pz=Math.sin(angle)*8;radius=8;}
    const limit=Math.min(1,13/radius);px*=limit;pz*=limit;py=clamp(py*limit,-5,5);radius=Math.hypot(px,pz);
    const shot={radius,angle:Math.atan2(pz,px),height:py,age:0,duration:this.view.motion.matches?.7:7.2+radius*.12};
    shot.position=starPosition(shot,0);
    if(this.shots.length===6)this.shots.shift();this.shots.push(shot);
    this.root.dataset.launched=String(Number(this.root.dataset.launched||0)+1);
    this.feedback('Una pequeña luz, un viaje inmenso.');this.view.wake();
  }
  tap(x,y){if(!this.signal)this.launch(x,y);}
  beforeCamera(dt){
    if(!this.cinema||this.view.motion.matches)return;
    this.cinemaTime+=dt;
    const t=this.cinemaTime,yaw=this.cinemaYaw+t*.045,pitch=this.cinemaPitch*Math.exp(-t*.1)+.22+.19*Math.sin(t*.085-.8);
    this.view.targetOrientation.set(lookQuaternion([Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)]));
    this.view.targetDistance=22+2.8*Math.sin(t*.07);
  }
  update(dt){
    this.clock+=dt;this.revealAge+=dt;
    this.camera.distance=this.view.distance;this.camera.centerY=this.view.centerY;this.camera.focal=this.view.projectionFocal();
    for(let i=this.shots.length-1;i>=0;i--){
      const shot=this.shots[i];shot.age+=dt;
      if(shot.age>shot.duration+.25){this.shots.splice(i,1);continue;}
      shot.position=starPosition(shot,shot.age/shot.duration);
    }
    if(this.signal){
      const first=projectPoint(signalStars[0],this.camera),second=projectPoint(signalStars[1],this.camera);
      const distance=first&&second?Math.hypot(first.x-second.x,first.y-second.y):Infinity;
      const eligible=first?.visible&&second?.visible&&!first.occluded&&!second.occluded;
      this.alignment=eligible?clamp(1-distance/Math.max(45,this.camera.width*.15),0,1):0;
      this.ui.SignalMeter.value=this.alignment;
      const aligned=eligible&&distance<Math.max(6,this.camera.width*.009);
      this.hold=aligned&&!this.view.points.size?this.hold+dt:0;
      const hint=aligned?'Quédate un instante. Las dos luces ya se encontraron.':this.alignment>.8?'Muy cerca. Un movimiento pequeño.':this.alignment>.4?'Las dos luces se están acercando.':'Gira el cielo hasta que las dos luces se encuentren.';
      if(this.ui.SignalHint.textContent!==hint)this.ui.SignalHint.textContent=hint;
      if(this.hold>.85)this.showMessage();
    }
    if(this.feedbackUntil&&this.clock>this.feedbackUntil){this.feedbackUntil=0;this.ui.Feedback.textContent='';}
    this.root.dataset.shots=String(this.shots.length);
    return this.needsFrame();
  }
  needsFrame(){return this.shots.length>0||this.feedbackUntil>this.clock||this.revealAge<4&&!this.view.motion.matches||this.signal&&(this.hold>0||this.alignment>.94)||this.cinema&&!this.view.motion.matches;}
  emitGeometry(renderer){
    const time=this.view.time;
    for(const index of this.snapshot.visited){
      const angle=index*TAU/5+time*.025,radius=10.8+index*.4;
      const p=[Math.cos(angle)*radius,2.4+Math.sin(angle+index)*1.6,Math.sin(angle)*radius];
      renderer.orb(p,.32,[1,.63,.24],.4,2);
      renderer.orb(p,.58,[1,.44,.15],.045);
      const arc=[];
      for(let j=0;j<34;j++){
        const a=angle-.48+j*.48/33;
        arc.push([Math.cos(a)*radius,2.4+Math.sin(a+index)*1.6,Math.sin(a)*radius]);
      }
      renderer.ribbon(arc,.026,[1,.53,.19],.18);
      for(let j=0;j<7;j++){
        const a=time*.42+j*TAU/7+index,r=.48+j*.025;
        renderer.orb([p[0]+Math.cos(a)*r,p[1]+Math.sin(a)*r*.6,p[2]+Math.sin(a)*r*.8],.038,[1,.7,.3],.4);
      }
    }
    if(this.signal||!this.ui.SignalPanel.hidden){
      signalStars.forEach((p,index)=>{
        const color=index?[1,.59,.22]:[.2,.75,1];
        renderer.orb(p,.38,color,1.3,2);renderer.orb(p,.82,color,.25);
        const arc=[];
        for(let j=0;j<56;j++){
          const a=j*TAU/55+time*.4,r=.48+Math.sin(time*.8)*.025;
          arc.push([p[0]+Math.cos(a)*r,p[1]+Math.sin(a)*r*.7,p[2]+Math.sin(a)*r*.65]);
        }
        renderer.ribbon(arc,.014,color,.45);
      });
      if(this.revealAge<4&&!this.view.motion.matches){
        const age=this.revealAge,t=age/4,p=signalStars[1];
        for(let i=0;i<60;i++){
          const a=i*2.399963,r=Math.sqrt(i/60)*(1+t*4),y=(i/60-.5)*t*2;
          renderer.orb([p[0]+Math.cos(a)*r*t,p[1]+Math.sin(a)*r*t,p[2]+y],.05,[.92,.48,1],Math.sin(Math.PI*t)*.65);
        }
      }
    }
    for(const shot of this.shots){
      const fade=clamp((shot.duration+.25-shot.age)/.5,0,1),points=[];
      for(let i=0;i<72;i++)points.push(starPosition(shot,Math.max(0,shot.age-(71-i)/71*1.5)/shot.duration));
      renderer.ribbon(points,.095,[.6,.14,1],fade*.38);
      renderer.ribbon(points,.023,[.94,.7,1],fade*1.1);
      if(shot.age<shot.duration){
        renderer.orb(shot.position,.28,[.85,.64,1],fade*1.8);
        for(let i=0;i<16;i++){
          const tail=starPosition(shot,Math.max(0,shot.age-i*.032)/shot.duration),angle=i*2.4+shot.age*2,spread=i*.005;
          renderer.orb([tail[0]+Math.cos(angle)*spread,tail[1]+Math.sin(angle)*spread,tail[2]],.03,[.7,.32,1],fade*(1-i/16)*.7);
        }
      }
    }
  }
  stop(){
    if(this.cinema)this.setCinema(false);
    this.signal=false;this.hold=0;this.shots.length=0;this.feedbackUntil=0;this.ui.Feedback.textContent='';
    this.ui.SignalPanel.hidden=true;this.ui.SettingsPanel.hidden=true;this.ui.BridgePanel.hidden=true;
    this.ui.Signal.setAttribute('aria-pressed','false');this.ui.Settings.setAttribute('aria-expanded','false');this.ui.Bridge.setAttribute('aria-expanded','false');
    this.root.classList.remove('is-signaling','has-signal');this.root.dataset.shots='0';
  }
}

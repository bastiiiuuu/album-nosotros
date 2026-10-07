export function createOceanLife(THREE, options) {
  const {scene, pearls, labels, jellyfish, hemisphere, sun, floorMaterial, random} = options;
  const root=new THREE.Group();root.name='Our living ocean';scene.add(root);
  const gold=new THREE.Color('#e9c787'),cyan=new THREE.Color('#77e2cf'),rose=new THREE.Color('#e4a0d1');
  const awake={value:0},celebration={time:0,active:false,formed:0};
  let visited=new Set(),lastOpened=-1,next=-1,progress=0,resolveFinale=null,dead=false;
  const clamp=n=>Math.max(0,Math.min(1,n));
  const ease=n=>{n=clamp(n);return n*n*(3-2*n);};
  const additive=color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false});
  const layers=Array.from({length:5},()=>{const g=new THREE.Group();g.scale.setScalar(.001);root.add(g);return g;});
  const halos=pearls.map(pearl=>{
    const halo=new THREE.Mesh(new THREE.TorusGeometry(1.02,.018,6,70),additive(gold));
    halo.rotation.x=.28;halo.rotation.y=-.2;halo.material.opacity=0;pearl.add(halo);return halo;
  });
  const budGeometry=new THREE.IcosahedronGeometry(.105,1),stemMaterial=additive('#469d99');
  for(let i=0;i<18;i++){
    const x=(random()-.5)*26,z=-5+random()*9,h=.5+random()*1.2;
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,-4,z),new THREE.Vector3(x+.2,-4+h*.45,z),new THREE.Vector3(x-.1,-4+h,z)]);
    const stem=new THREE.Mesh(new THREE.TubeGeometry(curve,10,.024,4,false),stemMaterial);layers[0].add(stem);
    for(let branch=0;branch<3;branch++){
      const side=branch%2?1:-1;
      const tip=new THREE.Vector3(x+side*(.25+branch*.12),-4+h*(.55+branch*.16),z+.12*branch);
      const twig=new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(x,-4+h*.35,z),tip),1,.018,4,false),stemMaterial);layers[0].add(twig);
      const bud=new THREE.Mesh(budGeometry,additive(branch%2?'#eea4c8':'#81eac8'));bud.position.copy(tip);layers[0].add(bud);
    }
  }
  const fishGeometry=new THREE.ConeGeometry(.065,.24,4);fishGeometry.rotateZ(-Math.PI/2);
  const fish=new THREE.InstancedMesh(fishGeometry,additive('#95e8de'),36);layers[1].add(fish);
  fish.instanceMatrix.setUsage(THREE.DynamicDrawUsage);fish.frustumCulled=false;
  const dummy=new THREE.Object3D();
  const fishSeeds=Array.from({length:36},()=>({phase:random()*Math.PI*2,radius:2+random()*3,height:random()*1.8}));
  const petalGeometry=new THREE.SphereGeometry(.17,8,6);
  for(let i=0;i<12;i++){
    const flower=new THREE.Group();flower.position.set((random()-.5)*22,-3.6,-4+random()*8);
    for(let p=0;p<5;p++){
      const angle=p/5*Math.PI*2,petal=new THREE.Mesh(petalGeometry,additive(i%2?'#9aaff0':'#de9ddf'));
      petal.position.set(Math.cos(angle)*.24,.05,Math.sin(angle)*.24);petal.scale.set(1.6,.35,.9);petal.rotation.y=-angle;flower.add(petal);
    }
    const core=new THREE.Mesh(budGeometry,additive('#f5d99c'));core.position.y=.11;flower.add(core);layers[2].add(flower);
  }
  for(let i=0;i<5;i++){
    const points=Array.from({length:80},(_,j)=>{const t=j/79;return new THREE.Vector3(-12+t*24,-3.1+Math.sin(t*10+i)*.28,-4+Math.sin(t*5+i)*3);});
    const ribbon=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:i%2?'#a398ed':'#71cfcb',transparent:true,opacity:.25,blending:THREE.AdditiveBlending,depthWrite:false}));layers[3].add(ribbon);
  }
  const pollenPositions=new Float32Array(90*3);
  for(let i=0;i<90;i++){pollenPositions[i*3]=(random()-.5)*12;pollenPositions[i*3+1]=random()*8-2;pollenPositions[i*3+2]=(random()-.5)*5;}
  const pollenGeo=new THREE.BufferGeometry();pollenGeo.setAttribute('position',new THREE.BufferAttribute(pollenPositions,3));
  const pollen=new THREE.Points(pollenGeo,new THREE.PointsMaterial({color:gold,size:.035,transparent:true,opacity:.65,blending:THREE.AdditiveBlending,depthWrite:false}));layers[4].add(pollen);
  const couple=jellyfish.slice(0,2);
  couple.forEach((j,i)=>{j.scale.setScalar(1.05);j.children[0].material.uniforms.uColor.value.copy(i?rose:cyan);j.children[1].material.uniforms.uColor.value.copy(i?rose:cyan);});
  const guideGeo=new THREE.BufferGeometry();guideGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(64*3),3));
  const guide=new THREE.Line(guideGeo,new THREE.LineBasicMaterial({color:'#b9edda',transparent:true,opacity:.2,depthWrite:false,blending:THREE.AdditiveBlending}));root.add(guide);guide.visible=false;
  const guideDotsGeo=new THREE.BufferGeometry();guideDotsGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(16*3),3));
  const guideDots=new THREE.Points(guideDotsGeo,new THREE.PointsMaterial({color:'#cbf8dd',size:.06,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending}));root.add(guideDots);guideDots.visible=false;
  let guideCurve=null;
  function rebuildGuide(){
    if(next<0||lastOpened<0){guideCurve=null;return;}
    const from=pearls[lastOpened].position.clone(),to=pearls[next].position.clone();
    const midpoint=from.clone().lerp(to,.5);midpoint.y+=1.8;midpoint.z+=1;
    guideCurve=new THREE.CatmullRomCurve3([from,midpoint,to]);
    const points=guideGeo.attributes.position;
    for(let i=0;i<64;i++){const p=guideCurve.getPoint(i/63);points.setXYZ(i,p.x,p.y,p.z);}points.needsUpdate=true;guideGeo.computeBoundingSphere();
  }
  const strands=12,segments=100,heartPositions=new Float32Array(strands*segments*2*3),heartColors=new Float32Array(heartPositions.length);
  for(let s=0;s<strands;s++)for(let v=0;v<segments*2;v++){const c=s<strands/2?cyan:rose,offset=(s*segments*2+v)*3;heartColors.set([c.r*1.6,c.g*1.6,c.b*1.6],offset);}
  const heartGeo=new THREE.BufferGeometry();heartGeo.setAttribute('position',new THREE.BufferAttribute(heartPositions,3).setUsage(THREE.DynamicDrawUsage));heartGeo.setAttribute('color',new THREE.BufferAttribute(heartColors,3));
  const heartMaterial=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
  const heart=new THREE.LineSegments(heartGeo,heartMaterial);heart.frustumCulled=false;root.add(heart);
  function drawHeart(formation,t){
    const data=heartGeo.attributes.position;
    for(let s=0;s<strands;s++){
      const side=s<strands/2?-1:1,jelly=couple[side<0?0:1],strand=s%(strands/2),offset=(strand-2.5)*.045;
      for(let segment=0;segment<segments;segment++)for(let endpoint=0;endpoint<2;endpoint++){
        const u=(segment+endpoint)/segments;
        const sx=jelly.position.x+offset,sy=jelly.position.y-.08,sz=jelly.position.z;
        const dx=sx+Math.sin(u*8+t*.45+strand)*u*.22,dy=sy-u*5,dz=sz+Math.cos(u*5+strand)*u*.12;
        let tx,ty,tz;
        if(u<.18){const f=ease(u/.18);tx=sx+(offset-sx)*f;ty=sy+(1.95-sy)*f;tz=sz+(.15-sz)*f;}
        else {const a=(u-.18)/.82*Math.PI;tx=side*16*Math.pow(Math.sin(a),3)*.19+offset*Math.sin(a);ty=1+(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))*.19;tz=.15+Math.sin(a*6+strand*.8)*.09;}
        const blend=ease(formation*1.35-u*.35);
        data.setXYZ((s*segments+segment)*2+endpoint,dx+(tx-dx)*blend,dy+(ty-dy)*blend,dz+(tz-dz)*blend);
      }
    }
    data.needsUpdate=true;
  }
  function completeFinale(){celebration.time=11;celebration.formed=1;celebration.active=false;resolveFinale?.();resolveFinale=null;}
  function setProgress(indices,last=-1,immediate=false){
    visited=new Set(indices);lastOpened=last;
    next=-1;for(let step=1;step<=5;step++){const i=(last+step+5)%5;if(!visited.has(i)){next=i;break;}}
    if(immediate){progress=visited.size;awake.value=progress/5;}
    labels.forEach((label,i)=>{label.classList.toggle('is-visited',visited.has(i));label.classList.toggle('is-suggested',i===next);label.setAttribute('aria-label',`${visited.has(i)?'Volver a':'Abrir'} ${options.memories[i].title}${visited.has(i)?', descubierta':''}`);});
    rebuildGuide();
  }
  function update(dt,t,{inMemory=false,paused=false,reduced=false,lightweight=false,finale=false}={}){
    if(dead)return;
    const immediate=paused||reduced;
    progress=immediate?visited.size:THREE.MathUtils.damp(progress,visited.size,1.25,dt);awake.value=progress/5;
    hemisphere.intensity=.6+awake.value;sun.intensity=1.1+awake.value*1.1;
    if(floorMaterial.uniforms.uAwake)floorMaterial.uniforms.uAwake.value=.35+awake.value*.65;
    layers.forEach((g,i)=>{const n=ease(progress-i);g.visible=n>.002;g.scale.setScalar(Math.max(.001,n));});
    halos.forEach((halo,i)=>{const opacity=visited.has(i)?.72:0;halo.material.opacity=immediate?opacity:THREE.MathUtils.damp(halo.material.opacity,opacity,3,dt);halo.rotation.z=t*.05+i;});
    if(celebration.active&&!paused){celebration.time+=dt;if(celebration.time>=11)completeFinale();}
    const meeting=ease(celebration.time/4.4);
    celebration.formed=ease((celebration.time-3.2)/6.4);
    couple.forEach((j,i)=>{
      const side=i?1:-1,spread=9-progress*1.05;
      j.position.set(side*(spread*(1-meeting)+1.8*meeting),4.8+Math.sin(t*.28+i)*.1,-2+2*meeting);
      j.rotation.z=side*(-.08*meeting)+Math.sin(t*.17+i)*.035;
      j.children[1].visible=meeting<.9;
    });
    jellyfish.slice(2).forEach((j,i)=>{j.visible=(!lightweight||i<3)&&i<2+Math.ceil(progress);});
    heartMaterial.opacity=meeting*.7;
    if(meeting>0){drawHeart(celebration.formed,t);heart.visible=true;}else heart.visible=false;
    for(let i=0;i<fishSeeds.length;i++){
      const f=fishSeeds[i],a=t*.16+f.phase;
      dummy.position.set(Math.cos(a)*f.radius,-1+f.height+Math.sin(a*2)*.22,-3+Math.sin(a)*f.radius*.55);dummy.rotation.set(0,-a,Math.cos(a)*.08);dummy.scale.setScalar(.8+i%3*.14);dummy.updateMatrix();fish.setMatrixAt(i,dummy.matrix);
    }
    fish.count=lightweight?20:36;fish.instanceMatrix.needsUpdate=true;pollen.rotation.y=t*.025;
    guide.visible=guideDots.visible=!!guideCurve&&!inMemory&&!finale&&visited.size<5;
    if(guide.visible){for(let i=0;i<16;i++){const p=guideCurve.getPoint((t*.12+i/16)%1);guideDotsGeo.attributes.position.setXYZ(i,p.x,p.y,p.z);}guideDotsGeo.attributes.position.needsUpdate=true;guideDotsGeo.computeBoundingSphere();}
  }
  return {
    setProgress,update,
    startFinale(immediate=false){this.cancelFinale();celebration.time=0;celebration.formed=0;celebration.active=true;if(immediate){completeFinale();return Promise.resolve();}return new Promise(resolve=>{resolveFinale=resolve;});},
    finishFinale:completeFinale,
    cancelFinale(){resolveFinale?.();resolveFinale=null;celebration.time=0;celebration.formed=0;celebration.active=false;},
    get animating(){return celebration.active||Math.abs(progress-visited.size)>.002;},
    dispose(){dead=true;this.cancelFinale();}
  };
}

import * as T from 'three';
import { nebulaColor } from './space-color.ts';

// A broken, three-dimensional stream beside the route, not a solid tube or ring.
export const asteroidStreamPath = new T.CatmullRomCurve3([
  [4,-3,-10],[18,2,-28],[8,-8,-49],[-20,-6,-73],
  [-7,-10,-93],[22,-6,-112],[15,4,-140],[2,12,-164],
].map(p=>new T.Vector3(...p)),false,'centripetal');

export function createAsteroidStream(mobile:boolean) {
  let seed=72319;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const geometry=new T.IcosahedronGeometry(1,1);
  const positions=geometry.getAttribute('position');
  // Coordinate-based distortion preserves shared edges in the faceted geometry.
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
    const r=.85+.17*Math.sin(x*9+y*7-z*5)+.08*Math.cos(y*13+z*9);
    positions.setXYZ(i,x*r,y*r,z*r);
  }
  geometry.computeVertexNormals();
  const material=new T.MeshStandardMaterial({color:'#343640',roughness:.98,metalness:.03,flatShading:true});
  const rocks=new T.InstancedMesh(geometry,material,mobile?300:700);
  const dummy=new T.Object3D(),color=new T.Color();
  for(let i=0;i<rocks.count;i++){
    const t=(i+random()*.8)/rocks.count,p=asteroidStreamPath.getPoint(t);
    const spread=.35+Math.sin(t*Math.PI)**2*1.3;
    dummy.position.copy(p).add(new T.Vector3((random()-.5)*spread*2,(random()-.5)*spread*1.6,(random()-.5)*spread));
    const size=.055+Math.pow(random(),2.7)*.5;
    dummy.scale.set(size*(.6+random()),size*(.6+random()*.8),size*(.65+random()*.7));
    dummy.rotation.set(random()*6.28,random()*6.28,random()*6.28);dummy.updateMatrix();
    rocks.setMatrixAt(i,dummy.matrix);
    color.setScalar(.48+random()*.65);rocks.setColorAt(i,color);
  }
  rocks.computeBoundingSphere();
  rocks.name='dark-asteroid-serpent';
  return rocks;
}

export const STORM_CLUSTERS=[.015,.105,.25,.325,.49,.61,.735,.86,.975] as const;
// Deliberately different silhouettes: long wisps, compact knots and broad pockets.
const MIST_SHAPES=[
  [17,3,.018,.30,.24],[4,6,.008,.40,-.72],[9,3.8,.025,.22,.85],
  [23,4.8,.043,.34,-.35],[5.5,2.5,.011,.26,1.12],[13,8,.032,.38,.52],
  [7,5.5,.016,.24,-1.04],[19,2.4,.038,.29,-.18],[3.8,4.6,.007,.36,.69],
] as const;
const mistVariation=(i:number)=>{const v=Math.sin(i*127.1+93.7)*43758.5453;return v-Math.floor(v);};
// Only these three stretches coil; the rest stays an irregular cloud bank.
export const SERPENT_SPIRALS=[
  {from:.08,to:.25,turns:1.5,radius:2.7},
  {from:.42,to:.61,turns:1.8,radius:3.5},
  {from:.76,to:.94,turns:1.4,radius:2.9},
] as const;
export function serpentSpiralPose(u:number,phase=0){
  const center=asteroidStreamPath.getPointAt(u),section=SERPENT_SPIRALS.find(s=>u>=s.from&&u<=s.to);
  if(!section)return {position:center,weight:0};
  const local=(u-section.from)/(section.to-section.from),weight=Math.sin(Math.PI*local)**2;
  const tangent=asteroidStreamPath.getTangentAt(u);
  const side=new T.Vector3().crossVectors(tangent,new T.Vector3(0,1,0)).normalize();
  const up=new T.Vector3().crossVectors(side,tangent).normalize();
  const angle=local*Math.PI*2*section.turns+phase,radius=section.radius*weight;
  return {position:center.addScaledVector(side,Math.cos(angle)*radius).addScaledVector(up,Math.sin(angle)*radius),weight};
}
export function asteroidMistDensity(t:number){
  let density=.055;
  for(let i=0;i<STORM_CLUSTERS.length;i++){
    const width=MIST_SHAPES[i][2],offset=(t-STORM_CLUSTERS[i])/width;
    density+=Math.exp(-offset*offset)*(.48+(i%4)*.16);
  }
  return Math.min(1,density);
}

export const ASTEROID_FLASH_SECONDS=1;
export function createFlashSchedule(random:()=>number=Math.random,offset=0){
  const gap=()=>2+random()*4;
  let start=gap()+offset,event=0;
  return {sample(time:number){
    while(time>=start+ASTEROID_FLASH_SECONDS){start+=ASTEROID_FLASH_SECONDS+gap();event++;}
    const age=time-start;
    return {event,start,pulse:age>=0&&age<ASTEROID_FLASH_SECONDS?Math.sin(Math.PI*age/ASTEROID_FLASH_SECONDS)**2:0};
  }};
}

export function createAsteroidWeather(mobile:boolean,masks:readonly T.Texture[],random:()=>number=Math.random) {
  if(!masks.length)throw new Error('Asteroid weather requires shared masks');
  const group=new T.Group();group.name='asteroid-storm';
  const mistCount=mobile?36:60;
  // Arc-length spacing and overlapping soft footprints wrap the whole serpent,
  // including the sparse stretches between brighter storm clusters.
  const mistSpacing=asteroidStreamPath.getLength()/(mistCount-1);
  const pinks=['#e75caa','#b53782','#f080bc','#c94b96'] as const;
  const mist=Array.from({length:mistCount},(_,i)=>{
    const u=i/(mistCount-1),t=asteroidStreamPath.getUtoTmapping(u,0),density=asteroidMistDensity(t),rotation=i*2.399;
    const material=new T.SpriteMaterial({map:masks[i%masks.length],color:pinks[i%pinks.length],opacity:.13+density*.24,transparent:true,depthWrite:false,depthTest:true,toneMapped:false});
    const sprite=new T.Sprite(material),base=asteroidStreamPath.getPointAt(u);
    base.add(new T.Vector3(Math.sin(i*2.7)*.65,Math.cos(i*1.9)*.55,Math.sin(i*1.1)*.7));
    sprite.position.copy(base);
    const width=mistSpacing*2.4+mistVariation(i+81)*9+density*5;
    const height=mistSpacing*2.1+mistVariation(i+190)*5;
    sprite.scale.set(width,height,1);sprite.name='pink-serpent-envelope';
    material.rotation=rotation;sprite.userData.density=density;sprite.userData.pathU=u;
    material.color.copy(nebulaColor(pinks[i%pinks.length]));
    group.add(sprite);return {sprite,base,rotation,opacity:material.opacity};
  });
  // Thin overlapping puffs describe actual 3D corkscrews, not flat rings.
  const coils=SERPENT_SPIRALS.flatMap((section,sectionIndex)=>{
    const count=mobile?18:28;
    return Array.from({length:count},(_,i)=>{
      const u=section.from+(section.to-section.from)*i/(count-1),pose=serpentSpiralPose(u);
      const material=new T.SpriteMaterial({map:masks[(i+sectionIndex)%masks.length],color:sectionIndex===1?'#f16bba':'#ff9bcd',opacity:.32*pose.weight,transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false});
      material.color.copy(nebulaColor(sectionIndex===1?'#f16bba':'#ff9bcd'));
      const sprite=new T.Sprite(material),size=2.2+mistVariation(i+sectionIndex*41)*1.8;
      sprite.name='pink-serpent-spiral';sprite.position.copy(pose.position);sprite.scale.set(size*1.3,size,1);material.rotation=i*2.399;
      group.add(sprite);return {sprite,u,sectionIndex};
    });
  });
  // Pink resting knots remain distinct from the stronger red-magenta flashes.
  const flashes=STORM_CLUSTERS.map((t,i)=>{
    const at=asteroidStreamPath.getPoint(t);
    const glow=new T.Sprite(new T.SpriteMaterial({map:masks[i%masks.length],color:i%3===0?'#ff8bc9':'#df53a3',transparent:true,opacity:0,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false}));
    const [length,height,,restOpacity,rotation]=MIST_SHAPES[i];
    glow.position.copy(at);glow.scale.set(length,height,1);glow.material.rotation=rotation;
    glow.name='steady-mist-glow';group.add(glow);
    glow.material.color.copy(nebulaColor(i%3===0?'#ff8bc9':'#df53a3'));
    const flash=new T.Sprite(new T.SpriteMaterial({map:masks[(i+1)%masks.length],color:'#ff125b',transparent:true,opacity:0,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false}));
    flash.position.copy(at);flash.scale.set((10+(i%3)*2)*.95,(6+(i%2)*2)*.95,1);flash.material.rotation=i*1.37;
    flash.name='embedded-mist-flash';flash.visible=false;group.add(flash);
    return {glow,flash,at,restOpacity,schedule:createFlashSchedule(random,i*.37)};
  });
  // One short-range light, no shadow maps or full-screen flashes.
  const light=new T.PointLight('#ff125b',0,8,2);group.add(light);
  return {group,update(time:number,camera:T.Vector3,paused:boolean){
    let pulse=0,selected=0,bestLight=0;
    for(let i=0;i<flashes.length;i++){
      const {glow,flash,at,restOpacity,schedule}=flashes[i];
      const strength=paused?0:schedule.sample(time).pulse;
      const visibility=1-T.MathUtils.smoothstep(camera.distanceTo(at),95,170);
      glow.visible=visibility>.005;glow.material.opacity=visibility*restOpacity;
      glow.position.copy(at).add(new T.Vector3(Math.sin(time*.43+i)*.65,Math.cos(time*.31+i)*.4,0));
      flash.position.copy(glow.position);flash.material.opacity=strength*visibility;
      flash.visible=flash.material.opacity>.005;
      pulse=Math.max(pulse,flash.material.opacity);
      const weight=flash.material.opacity/(1+camera.distanceToSquared(at)*.01);
      if(weight>bestLight){bestLight=weight;selected=i;}
    }
    light.position.copy(flashes[selected].flash.position);light.intensity=flashes[selected].flash.material.opacity*80;
    for(let i=0;i<mist.length;i++){
      const {sprite,base,rotation,opacity}=mist[i];sprite.position.copy(base);sprite.position.y+=Math.sin(time*.14+i)*.32;
      sprite.material.rotation=rotation+Math.sin(time*.07+i)*.10;
      sprite.material.opacity=opacity*(.87+.13*Math.sin(time*.18+i*1.9));
    }
    for(const {sprite,u,sectionIndex} of coils){
      const pose=serpentSpiralPose(u,Math.sin(time*.12+sectionIndex)*.32);
      sprite.position.copy(pose.position);
    }
    return pulse;
  }};
}

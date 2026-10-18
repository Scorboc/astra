import {assetUrl} from '../asset-url.ts';
import {CASTLE_CENTER,castleBearing,framePair,projectedCastle} from './castle-flight-model.ts';

// View-dependent transparent pre-render, projected from a fixed world anchor.
// It never owns input, changes the travel value, or opens an inspection modal.
// The separate 2D compositing pass avoids applying ACES/bloom a second time to
// already tone-mapped Cycles pixels. Planets in front mask the image below.
export function mountCastleFlight(host,camera,worlds,pc){
 const canvas=document.createElement('canvas');canvas.className='castle-flight';
 canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Обсерватория. Пространственный предрендер Blender');
 Object.assign(canvas.style,{position:'absolute',inset:'0',pointerEvents:'none',zIndex:'0'});
 host.append(canvas);
 const context=canvas.getContext('2d'),images=new Map(),pending=new Map(),failed=new Set(),attempts=new Map(),timers=new Set();
 let destroyed=false,wanted=10,expanded=false,width=0,height=0,ratio=1,revision=0,last='',hadPixels=false;
 host.dataset.castleOrbit='continuous';
 const key=i=>assetUrl(`/castle-orbit/transparent/f${String(i).padStart(2,'0')}.webp`);
 function unavailable(i){
  failed.add(i);host.dataset.castleFailed=String(failed.size);
  canvas.setAttribute('aria-label','Изображение обсерватории загружается не полностью. Полёт и вход в зал доступны.');
  if((attempts.get(i)||0)<2){
   const timer=setTimeout(()=>{timers.delete(timer);if(!destroyed){failed.delete(i);pump();}},1500);
   timers.add(timer);
  }
 }
 function pump(){
  if(destroyed)return;
  const candidates=(expanded?Array.from({length:21},(_,i)=>i):[10])
   .filter(i=>!images.has(i)&&!pending.has(i)&&!failed.has(i))
   .sort((a,b)=>Math.abs(a-wanted)-Math.abs(b-wanted));
  while(pending.size<2&&candidates.length){
   const i=candidates.shift(),image=new Image();pending.set(i,image);attempts.set(i,(attempts.get(i)||0)+1);image.decoding='async';
   image.onload=async()=>{
    try{await image.decode();if(!destroyed){images.set(i,image);revision++;}}
    catch{if(!destroyed)unavailable(i);}
    finally{pending.delete(i);image.onload=image.onerror=null;if(!destroyed){host.dataset.castleLoaded=String(images.size);host.dataset.castleFailed=String(failed.size);if(!failed.size)canvas.setAttribute('aria-label','Обсерватория. Пространственный предрендер Blender');pump();}}
   };
   image.onerror=()=>{pending.delete(i);image.onload=image.onerror=null;if(!destroyed){unavailable(i);pump();}};
   image.src=key(i);
  }
 }
 // One central frame after the planet previews, not 21 competing initial requests.
 pump();
 const center=new pc.Vec3(...CASTLE_CENTER),direction=new pc.Vec3();
 function clear(){if(hadPixels){context.clearRect(0,0,width,height);hadPixels=false;}last='';host.dataset.castleVisible='false';}
 function update(visible=true){
  if(destroyed)return;
  const w=host.clientWidth,h=host.clientHeight,dpr=Math.min(devicePixelRatio,1.6);
  if(w!==width||h!==height||dpr!==ratio){width=w;height=h;ratio=dpr;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);context.setTransform(ratio,0,0,ratio,0,0);last='';}
  if(!visible||!width||!height){clear();return;}
  const position=camera.getPosition(),bearing=castleBearing(position);
  wanted=bearing.frame;
  if(!expanded&&bearing.radius<85){expanded=true;pump();}
  const depth=direction.copy(center).sub(position).dot(camera.forward);
  const size=projectedCastle(depth,camera.camera.fov,height);
  const screen=camera.camera.worldToScreen(center);
  host.dataset.castleYaw=bearing.yaw.toFixed(3);host.dataset.castleSupported=String(bearing.supported);
  host.dataset.castleElevation=bearing.elevation.toFixed(3);
  if(!size||screen.x+size.width/2<0||screen.x-size.width/2>width||screen.y+size.height/2<0||screen.y-size.height/2>height){clear();return;}
  const pair=framePair(wanted,new Set(images.keys()));
  if(!pair){clear();return;}
  // A low, continuous cross-dissolve only between adjacent real views. No
  // invented optical-flow details. Add premultiplied contributions so opaque
  // portions never become translucent halfway between two frames.
  const blend=pair.upper-pair.lower===1?pair.mix:0;
  const lower=pair.upper-pair.lower<=1?pair.lower:(pair.mix<.5?pair.lower:pair.upper);
  const x=screen.x-size.width/2,y=screen.y-size.height/2;
  const stamp=[x,y,size.width,size.height,lower,pair.upper,blend,revision,...worlds.flatMap(world=>{
   const s=camera.camera.worldToScreen(world.entity.getPosition());return [s.x,s.y,s.z];
  })].map(n=>Number(n).toFixed(4)).join(':');
  if(last===stamp)return;last=stamp;
  context.clearRect(0,0,width,height);
  context.globalCompositeOperation='lighter';context.globalAlpha=1-blend;
  context.drawImage(images.get(lower),x,y,size.width,size.height);
  if(blend){context.globalAlpha=blend;context.drawImage(images.get(pair.upper),x,y,size.width,size.height);}
  context.globalAlpha=1;
  // The source crop truncates the long beam and bridge. Only soften the outer
  // 2.5% of the image boundary; never blur the castle, glass, or its lettering.
  context.globalCompositeOperation='destination-in';
  for(const horizontal of [true,false]){
   const gradient=horizontal?context.createLinearGradient(x,0,x+size.width,0):context.createLinearGradient(0,y,0,y+size.height);
   gradient.addColorStop(0,'transparent');gradient.addColorStop(.025,'#000');
   gradient.addColorStop(.975,'#000');gradient.addColorStop(1,'transparent');
   context.fillStyle=gradient;context.fillRect(x,y,size.width,size.height);
  }
  // The castle has no per-pixel depth map. Spherical foreground planets mask
  // its plane; this is not mutual per-pixel occlusion for arbitrary geometry.
  context.globalCompositeOperation='destination-out';
  for(const world of worlds){
   if(!world.entity.enabled)continue;
   const at=world.entity.getPosition(),planetDepth=direction.copy(at).sub(position).dot(camera.forward),r=world.spec.radius;
   if(planetDepth<=r||planetDepth+r>=depth)continue;
   const s=camera.camera.worldToScreen(at),pixels=height/(2*Math.tan(camera.camera.fov*Math.PI/360));
   const radius=pixels*r/Math.sqrt(planetDepth*planetDepth-r*r);
   context.fillStyle='#000';context.beginPath();context.arc(s.x,s.y,radius,0,Math.PI*2);context.fill();
  }
  context.globalCompositeOperation='source-over';hadPixels=true;
  host.dataset.castleVisible='true';host.dataset.castleFrame=wanted.toFixed(3);
  host.dataset.castlePair=`${lower},${pair.upper}`;
  host.dataset.castleBounds=[x,y,size.width,size.height].map(n=>n.toFixed(2)).join(',');
 }
 return {update,destroy(){
  destroyed=true;for(const timer of timers)clearTimeout(timer);timers.clear();for(const image of pending.values()){image.onload=image.onerror=null;image.src='';}
  pending.clear();images.clear();canvas.remove();
 }};
}

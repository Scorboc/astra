import {assetUrl} from '../asset-url.ts';
import {CASTLE_CENTER,castleBearing,framePair,castleFrameCorners,castleHomography,transformCastlePoint,CASTLE_SOURCE_WIDTH as SOURCE_W,CASTLE_SOURCE_HEIGHT as SOURCE_H} from './castle-flight-model.ts';

// View-dependent transparent pre-render, projected from a fixed world anchor.
// It never owns input, changes the travel value, or opens an inspection modal.
// The separate 2D compositing pass avoids applying ACES/bloom a second time to
// already tone-mapped Cycles pixels. Planets in front mask the image below.
export function mountCastleFlight(host,camera,worlds,pc){
 const canvas=document.createElement('canvas');canvas.className='castle-flight';
 canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Обсерватория. Пространственный предрендер Blender');
 canvas.width=SOURCE_W;canvas.height=SOURCE_H;
 Object.assign(canvas.style,{position:'absolute',left:'0',top:'0',width:`${SOURCE_W}px`,height:`${SOURCE_H}px`,transformOrigin:'0 0',willChange:'transform',pointerEvents:'none',zIndex:'0'});
 host.append(canvas);
 const context=canvas.getContext('2d'),images=new Map(),pending=new Map(),failed=new Set(),attempts=new Map(),timers=new Set();
 let destroyed=false,wanted=10,expanded=false,revision=0,last='',hadPixels=false;
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
 function clear(){if(hadPixels){context.clearRect(0,0,SOURCE_W,SOURCE_H);hadPixels=false;}canvas.hidden=true;last='';host.dataset.castleVisible='false';}
 function update(visible=true){
  if(destroyed)return;
  const width=host.clientWidth,height=host.clientHeight;
  if(!visible||!width||!height){clear();return;}
  const position=camera.getPosition(),bearing=castleBearing(position);
  wanted=bearing.frame;
  if(!expanded&&bearing.radius<85){expanded=true;pump();}
  const depth=direction.copy(center).sub(position).dot(camera.forward);
  host.dataset.castleYaw=bearing.yaw.toFixed(3);host.dataset.castleSupported=String(bearing.supported);
  host.dataset.castleElevation=bearing.elevation.toFixed(3);
  if(depth<=.5){clear();return;}
  const corners=castleFrameCorners((wanted-10)*4).map(p=>new pc.Vec3(p.x,p.y,p.z));
  if(corners.some(p=>direction.copy(p).sub(position).dot(camera.forward)<=.5)){clear();return;}
  const quad=corners.map(p=>camera.camera.worldToScreen(p));
  const x=Math.min(...quad.map(p=>p.x)),y=Math.min(...quad.map(p=>p.y));
  const boxWidth=Math.max(...quad.map(p=>p.x))-x,boxHeight=Math.max(...quad.map(p=>p.y))-y;
  const projection=castleHomography(quad);
  if(!projection||x+boxWidth<0||x>width||y+boxHeight<0||y>height){clear();return;}
  const pair=framePair(wanted,new Set(images.keys()));
  if(!pair){clear();return;}
  // A low, continuous cross-dissolve only between adjacent real views. No
  // invented optical-flow details. Add premultiplied contributions so opaque
  // portions never become translucent halfway between two frames.
  const blend=pair.upper-pair.lower===1?pair.mix:0;
  const lower=pair.upper-pair.lower<=1?pair.lower:(pair.mix<.5?pair.lower:pair.upper);
  // The browser transforms the capture plane in world perspective. Turning
  // the camera now shears/foreshortens it; it no longer stays screen-parallel.
  canvas.style.transform=projection.css;canvas.hidden=false;
  host.dataset.castleProjection='world-capture-plane';
  host.dataset.castleVisible='true';host.dataset.castleFrame=wanted.toFixed(3);
  host.dataset.castlePair=`${lower},${pair.upper}`;
  host.dataset.castleQuad=quad.flatMap(p=>[p.x,p.y]).map(n=>n.toFixed(2)).join(',');
  host.dataset.castleBounds=[x,y,boxWidth,boxHeight].map(n=>n.toFixed(2)).join(',');
  const masks=[];
  for(const world of worlds){
   if(!world.entity.enabled)continue;
   const at=world.entity.getPosition(),planetDepth=direction.copy(at).sub(position).dot(camera.forward),r=world.spec.radius;
   if(planetDepth<=r||planetDepth+r>=depth)continue;
   const s=camera.camera.worldToScreen(at),pixels=height/(2*Math.tan(camera.camera.fov*Math.PI/360));
   const radius=pixels*r/Math.sqrt(planetDepth*planetDepth-r*r);
   if(s.x+radius<x||s.x-radius>x+boxWidth||s.y+radius<y||s.y-radius>y+boxHeight)continue;
   const polygon=Array.from({length:40},(_,i)=>{
    const angle=i/40*Math.PI*2;
    return transformCastlePoint(projection.inverse,s.x+Math.cos(angle)*radius,s.y+Math.sin(angle)*radius);
   });
   if(polygon.every(p=>p&&Number.isFinite(p.x+p.y)))masks.push(polygon);
  }
  const stamp=[lower,pair.upper,blend,revision,...masks.flatMap(poly=>poly.flatMap(p=>[p.x,p.y]))].map(n=>Number(n).toFixed(4)).join(':');
  if(last===stamp)return;last=stamp;
  context.clearRect(0,0,SOURCE_W,SOURCE_H);
  context.globalCompositeOperation='lighter';context.globalAlpha=1-blend;
  context.drawImage(images.get(lower),0,0,SOURCE_W,SOURCE_H);
  if(blend){context.globalAlpha=blend;context.drawImage(images.get(pair.upper),0,0,SOURCE_W,SOURCE_H);}
  context.globalAlpha=1;
  // The source crop truncates the long beam and bridge. Only soften the outer
  // 2.5% of the image boundary; never blur the castle, glass, or its lettering.
  context.globalCompositeOperation='destination-in';
  for(const horizontal of [true,false]){
   const gradient=horizontal?context.createLinearGradient(0,0,SOURCE_W,0):context.createLinearGradient(0,0,0,SOURCE_H);
   gradient.addColorStop(0,'transparent');gradient.addColorStop(.025,'#000');
   gradient.addColorStop(.975,'#000');gradient.addColorStop(1,'transparent');
   context.fillStyle=gradient;context.fillRect(0,0,SOURCE_W,SOURCE_H);
  }
  // The castle has no per-pixel depth map. Spherical foreground planets mask
  // its plane; this is not mutual per-pixel occlusion for arbitrary geometry.
  context.globalCompositeOperation='destination-out';
  for(const polygon of masks){
   context.fillStyle='#000';context.beginPath();
   polygon.forEach((p,i)=>i?context.lineTo(p.x*SOURCE_W,p.y*SOURCE_H):context.moveTo(p.x*SOURCE_W,p.y*SOURCE_H));
   context.closePath();context.fill();
  }
  context.globalCompositeOperation='source-over';hadPixels=true;
 }
 return {update,destroy(){
  destroyed=true;for(const timer of timers)clearTimeout(timer);timers.clear();for(const image of pending.values()){image.onload=image.onerror=null;image.src='';}
  pending.clear();images.clear();canvas.remove();
 }};
}

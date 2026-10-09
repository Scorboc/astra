import * as pc from 'playcanvas';
import modelUrl from '../observatory-blender/assets/observatory.glb?url';
import architectureUrl from '../observatory-blender/assets/architecture-reference-v2.png?url';
import {addVolumes} from './volumes.js';

// This prototype has no access to ASTRA account state or browser storage.
const $=id=>document.getElementById(id),started=performance.now();
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduced.matches,time=0,travel=0,targetTravel=0,yaw=0,pitch=0,drag=null;
const canvas=$('scene');
try{await start();}catch(error){$('status').textContent='Сцена не запустилась. Подробности ошибки доступны в консоли.';console.error(error);}

async function start(){
 const device=await pc.createGraphicsDevice(canvas,{deviceTypes:[pc.DEVICETYPE_WEBGL2],antialias:true,powerPreference:'default'});
 const options=new pc.AppOptions();options.graphicsDevice=device;options.componentSystems=[pc.RenderComponentSystem,pc.CameraComponentSystem,pc.LightComponentSystem];options.resourceHandlers=[pc.TextureHandler,pc.ContainerHandler];
 const app=new pc.AppBase(canvas);app.init(options);app.setCanvasResolution(pc.RESOLUTION_AUTO);app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
 device.maxPixelRatio=Math.min(devicePixelRatio,innerWidth<700?1.3:1.6);
 app.scene.ambientLight=new pc.Color(.18,.22,.32);app.scene.exposure=1.05;
 const camera=new pc.Entity('camera');camera.addComponent('camera',{fov:48,nearClip:.025,farClip:1800,clearColor:new pc.Color(.008,.016,.045)});app.root.addChild(camera);
 const frame=new pc.CameraFrame(app,camera.camera);frame.rendering.toneMapping=pc.TONEMAP_ACES;frame.bloom.intensity=.34;
 function asset(name,type,url){return new Promise((resolve,reject)=>{const a=new pc.Asset(name,type,{url});app.assets.add(a);a.ready(()=>resolve(a));a.once('error',reject);app.assets.load(a);});}
 function rgb(hex){return new pc.Color(((hex>>16)&255)/255,((hex>>8)&255)/255,(hex&255)/255);}
 function material(color,metal=.2,gloss=.75,emission=0){const m=new pc.StandardMaterial();m.diffuse=rgb(color);m.useMetalness=true;m.metalness=metal;m.gloss=gloss;if(emission){m.emissive=rgb(emission);m.emissiveIntensity=2;}m.update();return m;}
 function mesh(name,geometry,mat,parent=app.root){const e=new pc.Entity(name);e.addComponent('render',{meshInstances:[new pc.MeshInstance(pc.Mesh.fromGeometry(device,geometry),mat)]});parent.addChild(e);return e;}
 function light(name,color,intensity,position,type='directional',parent=app.root){const e=new pc.Entity(name);e.addComponent('light',{type,color:rgb(color),intensity,range:30,castShadows:false});parent.addChild(e);e.setLocalPosition(...position);if(type==='directional')e.lookAt(0,0,-65);return e;}
 light('warm sun',0xfff0d5,2.8,[-25,45,15]);light('blue rim',0x697bff,1.3,[30,10,-150]);

 const moonMaterial=material(0xffffff,.18,.65);
 const moon=mesh('Istok',new pc.SphereGeometry({radius:5.5,latitudeBands:256,longitudeBands:384}),moonMaterial);moon.setPosition(-8,0,0);moon.setEulerAngles(-40,-23,6);
 const preview=await asset('Istok original preview','texture','/universe/origin-moon-v1.webp');
 moonMaterial.diffuseMap=preview.resource;moonMaterial.update();canvas.dataset.origin='preview';
 $('status').textContent='Исток готов. Загружаем исходную обсерваторию…';

 // A single star mesh, deterministic positions, no additional network assets.
 let seed=8714;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const positions=[],uvs=[],indices=[];
 for(let i=0;i<1300;i++){const x=(random()-.5)*400,y=(random()-.5)*230,z=-40-random()*300,s=.035+random()*.09,n=positions.length/3;positions.push(x-s,y-s,z,x+s,y-s,z,x+s,y+s,z,x-s,y+s,z);uvs.push(0,0,1,0,1,1,0,1);indices.push(n,n+1,n+2,n,n+2,n+3);}
 const starsMesh=new pc.Mesh(device);starsMesh.setPositions(positions);starsMesh.setUvs(0,uvs);starsMesh.setIndices(indices);starsMesh.update();
 const starsMaterial=new pc.ShaderMaterial({uniqueName:'astra-stars',attributes:{aPosition:pc.SEMANTIC_POSITION,aUv:pc.SEMANTIC_TEXCOORD0},vertexGLSL:'attribute vec3 aPosition;attribute vec2 aUv;uniform mat4 matrix_model;uniform mat4 matrix_viewProjection;varying vec2 uv;void main(){uv=aUv;gl_Position=matrix_viewProjection*matrix_model*vec4(aPosition,1.);}',fragmentGLSL:'varying vec2 uv;void main(){float a=exp(-dot(uv-.5,uv-.5)*20.);gl_FragColor=vec4(vec3(.65,.85,1.2)*a,a);}'});starsMaterial.blendType=pc.BLEND_ADDITIVE;starsMaterial.depthWrite=false;starsMaterial.cull=pc.CULLFACE_NONE;
 const stars=new pc.Entity('star field');stars.addComponent('render',{meshInstances:[new pc.MeshInstance(starsMesh,starsMaterial)]});app.root.addChild(stars);
 const station=new pc.Entity('original observatory');station.setPosition(-40,-6,-87);station.setLocalScale(.6,.6,.6);station.setEulerAngles(0,90,0);app.root.addChild(station);
 const fog=addVolumes(pc,device,station,camera);
 const red=material(0xff1540,.0,.5,0xff2244),green=material(0x3dffab,0,.5,0x27ff9a);
 for(const radius of [9.30,9.42]){const ring=mesh('energy ring',new pc.TorusGeometry({ringRadius:radius,tubeRadius:.023,segments:192,sides:5}),red,station);ring.setLocalPosition(0,11.5,-5.3);ring.setLocalEulerAngles(90,0,0);}
 const beam=mesh('green beam',new pc.CylinderGeometry({radius:.038,height:38,capSegments:10}),green,station);beam.setLocalPosition(0,23,-.8);
 light('under cloud glow',0xffc77c,3,[0,-1,3],'omni',station);light('emerald fill',0x50ffbd,3,[0,7,-4],'omni',station);
 let firstFrame=null,fpsFrames=0,fpsTime=0,fps=0;const samples=[];
 app.on('update',dt=>{
  if(!paused)time+=Math.min(dt,.05);
  travel+=(targetTravel-travel)*(1-Math.exp(-dt*6));
  const t=Math.max(0,Math.min(1,travel));
  // Smooth tour passes from Istok to the front of the west-facing building.
  const smooth=t*t*(3-2*t);
  const x=-1+smooth*(-16+1),y=5+smooth*(-4.65-5)+Math.sin(Math.PI*t)*9,z=18+smooth*(-87-18);
  const look=new pc.Vec3(-8+smooth*(-40+8),3+smooth*(-.24-3),-2+smooth*(-87+2));
  camera.setPosition(x+Math.sin(yaw)*18,y+pitch*12,z+(Math.cos(yaw)-1)*18);camera.lookAt(look);
  fog.update(time);
  if(firstFrame===null){firstFrame=performance.now()-started;canvas.dataset.firstFrame=firstFrame.toFixed(0);}
  fpsFrames++;fpsTime+=dt;if(fpsTime>=1){fps=fpsFrames/fpsTime;fpsFrames=0;fpsTime=0;}
  samples.push(dt*1000);if(samples.length>300)samples.shift();
  const sorted=[...samples].sort((a,b)=>a-b),p95=sorted[Math.floor(sorted.length*.95)]||0;
  $('stats').textContent=`${fps.toFixed(0)} FPS · p95 кадра ${p95.toFixed(1)} мс · первый кадр ${firstFrame.toFixed(0)} мс · текстура: ${canvas.dataset.origin}`;
 });
 app.start();
 const setView=value=>{yaw=pitch=0;targetTravel=value==='origin'?0:value==='observatory'?1:.55;};
 for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>setView(button.dataset.view));
 canvas.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey)return;e.preventDefault();targetTravel=Math.max(0,Math.min(1,targetTravel+e.deltaY*.0008));yaw+=e.deltaX*.001;},{passive:false});
 canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,type:e.pointerType};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(drag.type==='touch')targetTravel=Math.max(0,Math.min(1,targetTravel-dy*.003));else{yaw+=dx*.003;pitch=Math.max(-1,Math.min(1,pitch+dy*.003));}drag.x=e.clientX;drag.y=e.clientY;});
 canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
 canvas.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();targetTravel=Math.max(0,Math.min(1,targetTravel+(e.key==='ArrowDown'?.06:-.06)));}});
 const syncPause=()=>{$('pause').textContent=paused?'Возобновить движение':'Пауза движения';$('pause').setAttribute('aria-pressed',String(paused));};
 $('pause').addEventListener('click',()=>{paused=!paused;syncPause();});reduced.addEventListener('change',()=>{paused=reduced.matches;syncPause();});syncPause();
 $('full').addEventListener('click',async()=>{const b=$('full');b.disabled=true;try{const width=device.maxTextureSize>=16384?16384:8192;$('status').textContent=`Загружаем исходный атлас ${width}…`;const full=await asset('Istok original full atlas','texture',`/universe/origin-moon-v1-${width}.jpg`);moonMaterial.diffuseMap=full.resource;moonMaterial.update();canvas.dataset.origin=String(width);$('status').textContent='Полный исходный атлас подключён.';}catch(error){b.disabled=false;$('status').textContent='Атлас не загрузился. Сохранено исходное превью.';console.error(error);}});
 addEventListener('resize',()=>{device.maxPixelRatio=Math.min(devicePixelRatio,innerWidth<700?1.3:1.6);app.resizeCanvas();});
 const [model,reference]=await Promise.all([asset('approved observatory','container',modelUrl),asset('architecture reference','texture',architectureUrl)]);
 const building=model.resource.instantiateRenderEntity();station.addChild(building);
 const projectionInverse=new pc.Mat4().copy(station.getWorldTransform()).invert();
 for(const render of building.findComponents('render'))for(const instance of render.meshInstances){
  const name=instance.material.name;
  if(['Ice','IcePale','Glazing'].includes(name))instance.material=projectedMaterial(pc,reference.resource,projectionInverse,name==='Glazing');
  else{const m=instance.material.clone();m.useMetalness=true;m.metalness=['Titanium','Champagne','Silver'].includes(name)?.9:.3;m.gloss=.8;m.update();instance.material=m;}
 }
 canvas.dataset.observatory='ready';$('status').textContent='Исходная обсерватория готова. Прокрути к ней или нажми «Обсерватория».';
 addEventListener('pagehide',()=>{frame.destroy();app.destroy();},{once:true});
}

function projectedMaterial(pc,texture,inverse,glass){
 const m=new pc.ShaderMaterial({uniqueName:`astra-reference-${glass}`,attributes:{aPosition:pc.SEMANTIC_POSITION,aNormal:pc.SEMANTIC_NORMAL},vertexGLSL:`attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 matrix_model;uniform mat4 matrix_viewProjection;uniform mat4 architectureSpace;varying vec3 localPoint,normalWorld;void main(){vec4 w=matrix_model*vec4(aPosition,1.);localPoint=(architectureSpace*w).xyz;normalWorld=normalize(mat3(matrix_model)*aNormal);gl_Position=matrix_viewProjection*w;}`,fragmentGLSL:`uniform sampler2D referenceMap;varying vec3 localPoint,normalWorld;void main(){vec2 uv=abs(localPoint.x)>9.55?vec2((573.-abs(localPoint.x)*26.0465116)/1092.,1.-(575.-(localPoint.y-.25)*26.0465116)/702.):vec2((573.+localPoint.x*26.0465116)/1092.,1.-(575.-(localPoint.y-.25)*35.73)/702.);vec3 color=texture2D(referenceMap,clamp(uv,vec2(.001),vec2(.999))).rgb;float light=.7+.3*abs(normalWorld.y);gl_FragColor=vec4(color*light,${glass?'.65':'1.'});}`});
 m.setParameter('referenceMap',texture);m.setParameter('architectureSpace',inverse.data);m.cull=pc.CULLFACE_NONE;if(glass){m.blendType=pc.BLEND_NORMAL;m.depthWrite=false;}return m;
}

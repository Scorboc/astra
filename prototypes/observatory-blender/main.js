import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {addEnergyVolumes} from './energy-volume.js';
import {EnergyVolumePass} from './volume-pass.js';
import modelUrl from './assets/observatory.glb?url';
import referenceUrl from './assets/scene-reference-v2.png?url';
import skyUrl from './assets/nebula-reference-v2.png?url';
import moonUrl from '../../public/universe/origin-moon-v1.webp?url';
import greenUrl from '../../public/universe/aurora-paradise-v1.webp?url';
import futureUrl from '../../public/universe/velir-future-v1.webp?url';
import cloudUrl from './assets/cloud-bank-v2.png?url';
import architectureReferenceUrl from './assets/architecture-reference-v2.png?url';

// Isolated visual prototype. No account reads, storage writes or external services.
const $=id=>document.getElementById(id), canvas=$('scene');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduced.matches, clean=false, azimuth=0, distance=39, desiredDistance=39, dirty=true;
let near=location.hash==='#approach', elapsed=0, drag=null;
const pointers=new Map(); let touchCenter=null;
let seed=81623;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const mobile=()=>innerWidth<700;
const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile()?1.15:1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;
renderer.outputColorSpace=T.SRGBColorSpace;
renderer.info.autoReset=false;
document.querySelector('a[download]').href=modelUrl;
const scene=new T.Scene();scene.background=new T.Color('#030812');
const camera=new T.PerspectiveCamera(44,innerWidth/innerHeight,.15,220);
const world=new T.Group();scene.add(world);
const effects=new T.Group();scene.add(effects);
const pmrem=new T.PMREMGenerator(renderer), envScene=new RoomEnvironment();
const env=pmrem.fromScene(envScene,.04).texture;scene.environment=env;scene.environmentIntensity=.24;
envScene.dispose();pmrem.dispose();
const hemi=new T.HemisphereLight(0xb6dfff,0x20283c,.40);scene.add(hemi);
function directional(color,intensity,pos){const light=new T.DirectionalLight(color,intensity);light.position.set(...pos);scene.add(light);return light;}
directional(0xf0f8ff,1.8,[-12,22,18]);directional(0x517dff,1.2,[16,14,-12]);
directional(0xff8596,.65,[-9,10,-12]);
const warmLight=new T.PointLight(0xffc77c,95,21,2);warmLight.position.set(0,2,0);scene.add(warmLight);
const beamLight=new T.PointLight(0x50ffbd,100,20,2);beamLight.position.set(0,7,-4);scene.add(beamLight);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
for(const target of [composer.renderTarget1,composer.renderTarget2])target.depthTexture=new T.DepthTexture(target.width,target.height,T.UnsignedIntType);
const bloom=new UnrealBloomPass(new T.Vector2(innerWidth,innerHeight),.24,.38,1.45);composer.addPass(bloom);composer.addPass(new OutputPass());
const loader=new T.TextureLoader();
let loadedPlanets=0;
loader.load(skyUrl,t=>{t.colorSpace=T.SRGBColorSpace;const sky=new T.Mesh(new T.PlaneGeometry(228,128),new T.MeshBasicMaterial({map:t,color:0xb9c4d9,depthWrite:false}));sky.position.set(0,32,-110);effects.add(sky);});
const starGeo=new T.BufferGeometry(), starPoints=[];
for(let i=0;i<1400;i++){const a=random()*Math.PI*2,b=Math.acos(random()*2-1),r=90+random()*40;starPoints.push(Math.cos(a)*Math.sin(b)*r,Math.cos(b)*r,Math.sin(a)*Math.sin(b)*r);}
starGeo.setAttribute('position',new T.Float32BufferAttribute(starPoints,3));effects.add(new T.Points(starGeo,new T.PointsMaterial({size:.075,color:0xd9ebff,transparent:true,opacity:.85,depthWrite:false})));
function planet(url,r,pos){const mat=new T.MeshStandardMaterial({color:0xffffff,roughness:.59,metalness:.05});const p=new T.Mesh(new T.SphereGeometry(r,64,40),mat);p.position.set(...pos);effects.add(p);loader.load(url,t=>{t.colorSpace=T.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();mat.map=t;mat.needsUpdate=true;loadedPlanets++;canvas.dataset.planets=String(loadedPlanets);});return p;}
const moon=planet(moonUrl,8.5,[-32,5.5,-16]);
const green=planet(greenUrl,5.1,[29,23,-25]);
const future=planet(futureUrl,2.3,[26,10.0,-28]);
const orbit=new T.Mesh(new T.RingGeometry(2.75,3.55,96),new T.MeshBasicMaterial({color:0x9babda,side:T.DoubleSide,transparent:true,opacity:.31}));orbit.position.copy(future.position);orbit.rotation.set(1.2,.2,-.2);effects.add(orbit);
const rockGeometry=new T.IcosahedronGeometry(1,0), rocks=new T.InstancedMesh(rockGeometry,new T.MeshStandardMaterial({color:0x292b39,roughness:.88}),90), transform=new T.Object3D();
for(let i=0;i<90;i++){const t=i/89;transform.position.set(-28+t*59,3+Math.sin(t*8)*2+(random()-.5)*3,-24-random()*12);transform.rotation.set(random()*6,random()*6,random()*6);transform.scale.setScalar(.08+random()**3*.53);transform.updateMatrix();rocks.setMatrixAt(i,transform.matrix);}effects.add(rocks);

const noiseGLSL=`
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return noise(p)*.57+noise(p*2.03)*.28+noise(p*4.09)*.15;}`;
const effectVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const energy=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{time:{value:0}},vertexShader:effectVertex,fragmentShader:`varying vec2 vUv;uniform float time;${noiseGLSL}
void main(){vec2 p=(vUv-.5)*2.;float a=atan(p.y,p.x),r=length(p);float turbulence=fbm(vec3(p*26.,time*.22));float d=abs(r-.78);float core=0.;for(int i=0;i<9;i++){float f=float(i);float offset=(f-4.)*.007+.007*sin(a*(5.+f*3.)+f*11.+time*(.15+f*.02))+.004*sin(a*63.+f*4.-time*.5);float filament=exp(-abs(r-.78-offset)*(370.+f*19.));float arc=.35+.65*pow(.5+.5*sin(a*(2.+f)+f*3.+time*.2),2.);core+=filament*arc;}float dust=pow(turbulence,5.)*exp(-d*15.)*2.2;float wisps=exp(-d*33.)*turbulence*.26;float halo=exp(-d*30.)*.08;float alpha=(core*.54+dust+wisps+halo)*(1.-smoothstep(.92,1.,r));vec3 col=mix(vec3(1.,.016,.08),vec3(1.,.57,.29),clamp(core*.55,0.,1.));gl_FragColor=vec4(col*3.7,alpha);}`});
const ring=new T.Mesh(new T.PlaneGeometry(24,24),energy);ring.position.set(0,11.5,-5.3);effects.add(ring);
// Green beam is now only a cylindrical core and a 3D density field.
const volumeScene=new T.Scene();
const energyVolumes=addEnergyVolumes(effects,{mobile:mobile(),volumeParent:volumeScene});
const volumePass=new EnergyVolumePass(volumeScene,camera,energyVolumes.materials,{scale:mobile()?.3:.33});
composer.insertPass(volumePass,1);
canvas.dataset.volumes=String(energyVolumes.count);

// One instanced cloud draw, soft density, no circular pedestal or hard-edged planes.
const cloudBase=new T.PlaneGeometry(1,1), cloudGeometry=new T.InstancedBufferGeometry();cloudGeometry.index=cloudBase.index;cloudGeometry.attributes.position=cloudBase.attributes.position;cloudGeometry.attributes.uv=cloudBase.attributes.uv;
const centers=[],sizes=[],seeds=[];
for(let i=0;i<18;i++){const side=i%2?-1:1;centers.push(side*(5.5+random()*14),-1.15-random()*1.2,-3+random()*17);sizes.push(9+random()*7);seeds.push(random()*20);}
cloudGeometry.setAttribute('center',new T.InstancedBufferAttribute(new Float32Array(centers),3));cloudGeometry.setAttribute('size',new T.InstancedBufferAttribute(new Float32Array(sizes),1));cloudGeometry.setAttribute('seed',new T.InstancedBufferAttribute(new Float32Array(seeds),1));cloudGeometry.instanceCount=sizes.length;
const cloudMap=loader.load(cloudUrl);cloudMap.colorSpace=T.SRGBColorSpace;
const cloudMat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},cloudMap:{value:cloudMap}},vertexShader:`attribute vec3 center;attribute float size;attribute float seed;varying vec2 vUv;varying float vSeed;void main(){vUv=uv;vSeed=seed;vec4 p=modelViewMatrix*vec4(center,1.);p.xy+=position.xy*vec2(size,size*.64);gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec2 vUv;varying float vSeed;uniform sampler2D cloudMap;uniform float time;
void main(){vec2 uv=vUv;if(mod(vSeed,2.)>1.)uv.x=1.-uv.x;vec4 c=texture2D(cloudMap,uv);float edge=smoothstep(0.,.08,vUv.x)*(1.-smoothstep(.92,1.,vUv.x))*smoothstep(0.,.12,vUv.y);gl_FragColor=vec4(c.rgb*.68,c.a*.61*edge);}`});
const clouds=new T.Mesh(cloudGeometry,cloudMat);clouds.frustumCulled=false;clouds.renderOrder=5;effects.add(clouds);

const mirrorGeometry=new T.BufferGeometry();mirrorGeometry.setAttribute('position',new T.Float32BufferAttribute([-2.34,15.48,0,2.34,15.48,0,-4.446,-15.48,0,4.446,-15.48,0],3));mirrorGeometry.setIndex([0,2,1,2,3,1]);mirrorGeometry.computeVertexNormals();
const mirror=new Reflector(mirrorGeometry,{clipBias:.004,textureWidth:mobile()?384:768,textureHeight:mobile()?768:1536,color:0x33404d});mirror.rotation.x=-Math.PI/2;mirror.position.set(0,.232,19.29);scene.add(mirror);
let model;
try{
 const [gltf,referenceMap]=await Promise.all([new GLTFLoader().loadAsync(modelUrl),loader.loadAsync(architectureReferenceUrl)]);model=gltf.scene;referenceMap.colorSpace=T.SRGBColorSpace;referenceMap.anisotropy=renderer.capabilities.getMaxAnisotropy();
 const materials={
  Titanium:new T.MeshStandardMaterial({color:0x171d25,metalness:.88,roughness:.19,envMapIntensity:1.55,side:T.DoubleSide}),
  Champagne:new T.MeshStandardMaterial({color:0xab9879,metalness:.93,roughness:.19,envMapIntensity:1.45}),
  Silver:new T.MeshStandardMaterial({color:0xd0e7f7,metalness:.96,roughness:.15,envMapIntensity:2.2}),
  Ice:new T.MeshPhysicalMaterial({color:0x3576bd,metalness:.30,roughness:.16,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:.75,emissive:0x123259,emissiveIntensity:.25}),
  IcePale:new T.MeshPhysicalMaterial({color:0x86badd,metalness:.35,roughness:.17,clearcoat:1,envMapIntensity:.85}),
  Glazing:new T.MeshPhysicalMaterial({color:0xb7cbd1,metalness:.22,roughness:.13,transparent:true,opacity:.24,depthWrite:false,side:T.DoubleSide,clearcoat:1,envMapIntensity:1.0}),
  Floor:new T.MeshStandardMaterial({color:0x152534,metalness:.95,roughness:.14,envMapIntensity:1.7}),
  WarmLight:new T.MeshStandardMaterial({color:0xffdc9b,emissive:0xffbb62,emissiveIntensity:3.2}),
  IceLight:new T.MeshStandardMaterial({color:0xcdedff,emissive:0x89c9ff,emissiveIntensity:2.4})
 };
 // Analytic fracture detail stays sharp without a giant texture atlas.
 for(const name of ['Ice','IcePale']){
  materials[name].onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCrystal;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvCrystal=(modelMatrix*vec4(transformed,1.0)).xyz;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vCrystal;
vec2 crystalHash(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
vec2 crystalCell(vec2 p){vec2 ip=floor(p),fp=fract(p);float d1=10.,d2=10.;for(int y=-1;y<=1;y++){for(int x=-1;x<=1;x++){vec2 cell=vec2(float(x),float(y));vec2 q=cell+crystalHash(ip+cell)-fp;float d=dot(q,q);if(d<d1){d2=d1;d1=d;}else if(d<d2){d2=d;}}}return vec2(d1,d2-d1);}`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec2 iceUv=vec2(vCrystal.x*4.1+vCrystal.z*1.3+sin(vCrystal.y*1.4)*.37,vCrystal.y*1.58+sin(vCrystal.x*3.)*.26);
vec2 fracture=crystalCell(iceUv);
float vein=1.-smoothstep(.006,.040,fracture.y);
float inclusion=smoothstep(.04,.65,fracture.x);
diffuseColor.rgb*=mix(vec3(.10,.18,.37),vec3(1.6,1.7,1.8),inclusion);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.77,.94,1.),vein*.83);`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.16,.48,.85)*vein*.68;');
  };
 }
 // The actual owner's image supplies the spire surface details. This is a
 // front-projected texture on real geometry, not a flat image replacing the scene.
 // Baked highlights intentionally preserve the approved appearance; they are
 // not a claim of physically correct relighting from arbitrary viewpoints.
 for(const name of ['Ice','IcePale','Titanium']){
  const previousCompile=materials[name].onBeforeCompile;
  materials[name].onBeforeCompile=shader=>{
   if(name!=='Titanium')previousCompile(shader);
   shader.uniforms.architectureRef={value:referenceMap};
   if(name==='Titanium'){
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCrystal;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvCrystal=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vCrystal;');
   }
   shader.fragmentShader='uniform sampler2D architectureRef;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`vec2 sourceUV=vec2((573.-abs(vCrystal.x)*26.0465116)/1092.,1.-(575.-(vCrystal.y-.25)*26.0465116)/702.);
vec3 referenceSurface=texture2D(architectureRef,sourceUV).rgb;
float validSpire=step(9.55,abs(vCrystal.x))*step(.27,vCrystal.y)*step(sourceUV.x,1.)*step(0.,sourceUV.x)*step(0.,sourceUV.y)*step(sourceUV.y,1.);
outgoingLight=mix(outgoingLight,referenceSurface*1.42,validSpire*.79);
#include <opaque_fragment>`);
  };
 }
 // Glazed front retains the reference's fine mullions and baked interior light.
 // Only the forward-facing pavilion uses this treatment; the bridge and rear
 // glass remain transparent PBR. The image is projected onto curved 3D glass.
 materials.Glazing.onBeforeCompile=shader=>{
  shader.uniforms.architectureRef={value:referenceMap};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vPavilion;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvPavilion=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader='uniform sampler2D architectureRef;\nvarying vec3 vPavilion;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`vec2 facadeUV=vec2((573.+vPavilion.x*26.0465116)/1092.,1.-(575.-(vPavilion.y-.25)*35.73)/702.);
float facadeMask=step(.5,vPavilion.z)*(1.-step(4.2,vPavilion.z))*(1.-step(9.05,abs(vPavilion.x)))*step(.5,vPavilion.y);
vec3 facade=texture2D(architectureRef,facadeUV).rgb;
outgoingLight=mix(outgoingLight,facade*1.16,facadeMask*.80);
diffuseColor.a=mix(diffuseColor.a,.80,facadeMask);
#include <opaque_fragment>`);
 };
 model.traverse(o=>{if(o.isMesh){const key=o.material.name;o.material=materials[key]||o.material;if(key==='Glazing')o.renderOrder=2;}});
 world.add(model);canvas.dataset.model='loaded-glb';canvas.dataset.ready='true';$('status').textContent='';
}catch(error){canvas.dataset.ready='error';$('status').textContent='Не удалось загрузить модель. Обнови страницу.';console.error(error);}

function sync(){near=location.hash==='#approach';desiredDistance=near?18:39;document.body.classList.toggle('near',near);$('approach').hidden=near;$('outside').hidden=!near;}
function pause(){ $('pause').textContent=paused?'Включить движение':'Пауза движения';$('pause').setAttribute('aria-pressed',String(paused));canvas.dataset.paused=String(paused);}
$('approach').onclick=()=>{location.hash='approach';};$('outside').onclick=()=>{azimuth=0;location.hash='outside';sync();};
$('angle').onclick=()=>{azimuth=azimuth>.1?-.20:.24;};
$('pause').onclick=()=>{paused=!paused;pause();};reduced.addEventListener('change',()=>{paused=reduced.matches;pause();});
$('studio').onclick=()=>{clean=!clean;effects.visible=!clean;volumePass.enabled=!clean;bloom.strength=clean?0:.24;scene.background.set(clean?'#162132':'#030812');$('studio').setAttribute('aria-pressed',String(clean));$('studio').textContent=clean?'Вернуть космос':'Без эффектов';canvas.dataset.clean=String(clean);};
$('reference').onclick=()=>{$('comparison').querySelector('img').src=referenceUrl;$('comparison').showModal();};$('close-reference').onclick=()=>{$('comparison').close();};
addEventListener('hashchange',sync);sync();pause();
const clamp=T.MathUtils.clamp;
function zoom(d){desiredDistance=clamp(desiredDistance+d,16,55);$('outside').hidden=false;}
canvas.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey)return;e.preventDefault();const scale=e.deltaMode===1?16:e.deltaMode===2?innerHeight:1;if(Math.abs(e.deltaX)>Math.abs(e.deltaY)*1.15)azimuth=clamp(azimuth+e.deltaX*scale*.001,-.6,.6);else zoom(-e.deltaY*scale*.021);},{passive:false});
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={x:e.clientX,a:azimuth};if(pointers.size===2)touchCenter=[...pointers.values()].reduce((s,p)=>s+p.y,0)/2;});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const center=[...pointers.values()].reduce((s,p)=>s+p.y,0)/2;if(touchCenter!==null)zoom((center-touchCenter)*.055);touchCenter=center;}else if(drag)azimuth=clamp(drag.a+(e.clientX-drag.x)*.003,-.6,.6);});
for(const type of ['pointerup','pointercancel'])canvas.addEventListener(type,e=>{pointers.delete(e.pointerId);drag=null;touchCenter=null;});
canvas.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();if(e.key==='ArrowUp')zoom(-2);if(e.key==='ArrowDown')zoom(2);if(e.key==='ArrowLeft')azimuth=clamp(azimuth-.07,-.6,.6);if(e.key==='ArrowRight')azimuth=clamp(azimuth+.07,-.6,.6);});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,mobile()?1.15:1.5));renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);});
for(const type of ['click','keydown','wheel','pointermove','resize','hashchange'])addEventListener(type,()=>{dirty=true;},{passive:true});
T.DefaultLoadingManager.onLoad=()=>{dirty=true;};
let previous=performance.now(),frames=0,metricAt=previous,camAngle=0;
renderer.setAnimationLoop(now=>{
 const dt=Math.min((now-previous)/1000,.05);previous=now;if(document.hidden)return;
 if(paused&&!dirty&&Math.abs(distance-desiredDistance)<.001&&Math.abs(camAngle-azimuth)<.001)return;
 dirty=false;
 if(!paused){elapsed+=dt;moon.rotation.y+=dt*.008;green.rotation.y+=dt*.005;}
 const blend=paused||reduced.matches?1:1-Math.exp(-dt*4);distance=T.MathUtils.lerp(distance,desiredDistance,blend);camAngle=T.MathUtils.lerp(camAngle,azimuth,blend);
 const approach=clamp((39-distance)/21,0,1);camera.fov=mobile()?62:44;camera.updateProjectionMatrix();
 camera.position.set(Math.sin(camAngle)*distance,2.25+approach*.1,Math.cos(camAngle)*distance);camera.lookAt(0,9.60-approach*6.95,0);
 energy.uniforms.time.value=elapsed;cloudMat.uniforms.time.value=elapsed;energyVolumes.setTime(elapsed);
 renderer.info.reset();composer.render();frames++;
 if(now-metricAt>1800){canvas.dataset.fps=(frames*1000/(now-metricAt)).toFixed(1);canvas.dataset.drawCalls=String(renderer.info.render.calls);canvas.dataset.triangles=String(renderer.info.render.triangles);canvas.dataset.cameraDistance=distance.toFixed(2);canvas.dataset.azimuth=camAngle.toFixed(3);canvas.dataset.elapsed=elapsed.toFixed(2);frames=0;metricAt=now;}
});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('status').textContent='3D приостановлено. Обнови страницу для продолжения.';canvas.dataset.ready='context-lost';});

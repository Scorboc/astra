import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {addEnergyVolumes,VOLUME_LAYOUT} from '../../prototypes/observatory-blender/energy-volume.js';
import {EnergyVolumePass} from '../../prototypes/observatory-blender/volume-pass.js';
import modelUrl from '../../prototypes/observatory-blender/assets/observatory.glb?url';
import architectureReferenceUrl from '../../prototypes/observatory-blender/assets/architecture-reference-v2.png?url';

export async function createObservatoryWorld(scene,renderer,composer,camera,{mobile:small,position,rotation,onState,onDirty}){
 const root=new T.Group();root.name='ASTRA Observatory';root.position.copy(position);root.rotation.y=rotation;root.scale.setScalar(.6);scene.add(root);root.updateMatrixWorld(true);
 const referenceInverse=root.matrixWorld.clone().invert();
 const effects=root,world=root,mobile=()=>small,textures=[];
 const loader=new T.TextureLoader();
 const warmLight=new T.PointLight(0xffc77c,95*.36,21*.6,2);warmLight.position.set(0,2,0);root.add(warmLight);
 const beamLight=new T.PointLight(0x50ffbd,100*.36,20*.6,2);beamLight.position.set(0,7,-4);root.add(beamLight);
 let disposed=false;
 function release(group){
  const geometries=new Set(),materials=new Set();
  group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
 }
const noiseGLSL=`
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return noise(p)*.57+noise(p*2.03)*.28+noise(p*4.09)*.15;}`;
const effectVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const energy=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{time:{value:0}},vertexShader:effectVertex,fragmentShader:`varying vec2 vUv;uniform float time;${noiseGLSL}
void main(){vec2 p=(vUv-.5)*2.;float a=atan(p.y,p.x),r=length(p);float turbulence=fbm(vec3(p*26.,time*.22));float d=abs(r-.78);float core=0.;for(int i=0;i<9;i++){float f=float(i);float offset=(f-4.)*.007+.007*sin(a*(5.+f*3.)+f*11.+time*(.15+f*.02))+.004*sin(a*63.+f*4.-time*.5);float filament=exp(-abs(r-.78-offset)*(370.+f*19.));float arc=.35+.65*pow(.5+.5*sin(a*(2.+f)+f*3.+time*.2),2.);core+=filament*arc;}float dust=pow(turbulence,5.)*exp(-d*15.)*2.2;float wisps=exp(-d*33.)*turbulence*.26;float halo=exp(-d*30.)*.08;float alpha=(core*.54+dust+wisps+halo)*(1.-smoothstep(.92,1.,r));vec3 col=mix(vec3(1.,.016,.08),vec3(1.,.57,.29),clamp(core*.55,0.,1.));gl_FragColor=vec4(col*3.7,alpha);}`});
const ring=new T.Mesh(new T.PlaneGeometry(24,24),energy);ring.position.set(0,11.5,-5.3);effects.add(ring);
// Green beam is now only a cylindrical core and a 3D density field.
const volumeScene=new T.Scene(),volumeRoot=new T.Group();volumeRoot.position.copy(root.position);volumeRoot.rotation.copy(root.rotation);volumeRoot.scale.copy(root.scale);volumeScene.add(volumeRoot);
const fogLayout=VOLUME_LAYOUT.map(spec=>spec.kind===3?{...spec,name:'blue-foundation-mist',color:[.08,.32,1.1],gain:.12,scatter:[.08,.24,.85]}:spec);
fogLayout.push({name:'red-foundation-mist',kind:3,center:[-7,-1.3,1],half:[19,4.3,13],color:[1.3,.035,.13],gain:.09,scatter:[.9,.035,.08]});
const energyVolumes=addEnergyVolumes(effects,{mobile:mobile(),volumeParent:volumeRoot,layout:fogLayout});
const volumePass=new EnergyVolumePass(volumeScene,camera,energyVolumes.materials,{scale:mobile()?.3:.33});
composer.insertPass(volumePass,1);
volumePass.enabled=false;

// Foundation uses only continuous 3D fog; no cloud image planes are loaded.

const mirrorGeometry=new T.BufferGeometry();mirrorGeometry.setAttribute('position',new T.Float32BufferAttribute([-2.34,15.48,0,2.34,15.48,0,-4.446,-15.48,0,4.446,-15.48,0],3));mirrorGeometry.setIndex([0,2,1,2,3,1]);mirrorGeometry.computeVertexNormals();
const mirror=new Reflector(mirrorGeometry,{clipBias:.004,textureWidth:mobile()?384:768,textureHeight:mobile()?768:1536,color:0x33404d});mirror.rotation.x=-Math.PI/2;mirror.position.set(0,.232,19.29);root.add(mirror);
let model;
try{
 mirror.visible=false;
 const [modelResult,referenceResult]=await Promise.allSettled([new GLTFLoader().loadAsync(modelUrl),loader.loadAsync(architectureReferenceUrl)]);
 if(modelResult.status==='fulfilled'){model=modelResult.value.scene;world.add(model);}
 if(referenceResult.status==='fulfilled')textures.push(referenceResult.value);
 if(modelResult.status==='rejected')throw modelResult.reason;
 if(referenceResult.status==='rejected')throw referenceResult.reason;
 const referenceMap=referenceResult.value;referenceMap.colorSpace=T.SRGBColorSpace;referenceMap.anisotropy=renderer.capabilities.getMaxAnisotropy();
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
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCrystal;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvCrystal=(architectureSpace*modelMatrix*vec4(transformed,1.0)).xyz;');
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
   shader.uniforms.architectureRef={value:referenceMap};shader.uniforms.architectureSpace={value:referenceInverse};shader.vertexShader="uniform mat4 architectureSpace;\n"+shader.vertexShader;
   if(name==='Titanium'){
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCrystal;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvCrystal=(architectureSpace*modelMatrix*vec4(transformed,1.)).xyz;');
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
  shader.uniforms.architectureRef={value:referenceMap};shader.uniforms.architectureSpace={value:referenceInverse};shader.vertexShader="uniform mat4 architectureSpace;\n"+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vPavilion;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvPavilion=(architectureSpace*modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader='uniform sampler2D architectureRef;\nvarying vec3 vPavilion;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`vec2 facadeUV=vec2((573.+vPavilion.x*26.0465116)/1092.,1.-(575.-(vPavilion.y-.25)*35.73)/702.);
float facadeMask=step(.5,vPavilion.z)*(1.-step(4.2,vPavilion.z))*(1.-step(9.05,abs(vPavilion.x)))*step(.5,vPavilion.y);
vec3 facade=texture2D(architectureRef,facadeUV).rgb;
outgoingLight=mix(outgoingLight,facade*1.16,facadeMask*.80);
diffuseColor.a=mix(diffuseColor.a,.80,facadeMask);
#include <opaque_fragment>`);
 };
 model.traverse(o=>{if(o.isMesh){const key=o.material.name;o.material=materials[key]||o.material;if(key==='Glazing')o.renderOrder=2;}});
 root.userData.ready=true;onState('ready');
}catch(error){composer.removePass(volumePass);volumePass.dispose();mirror.dispose();release(root);release(volumeRoot);textures.forEach(t=>t.dispose());root.removeFromParent();onState('failed');throw error;}

 const lowerLight=root.getObjectByName('under-observatory-light');if(lowerLight){lowerLight.intensity*=.36;lowerLight.distance*=.6;}
 const stationPosition=root.position.clone();
 return {
  root,pickRoot:model,
  update(time,cameraPosition,mode){
   const distance=cameraPosition.distanceTo(stationPosition);
   root.visible=mode!=='surface';
   mirror.visible=root.visible&&mode==='observatory';
   volumePass.enabled=root.visible&&(mode==='observatory'||distance<20);
   energy.uniforms.time.value=time;energyVolumes.setTime(time);
  },
  dispose(){disposed=true;composer.removePass(volumePass);volumePass.dispose();mirror.dispose();release(root);release(volumeRoot);textures.forEach(t=>t.dispose());root.removeFromParent();}
 };
}


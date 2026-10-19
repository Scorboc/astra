import {dracoInitialize, EnvLighting, TEXTUREPROJECTION_EQUIRECT, PIXELFORMAT_RGBA16F, FILTER_LINEAR, BLEND_NONE} from 'playcanvas';
import {pc} from './playcanvas-runtime.js';
import {assetUrl} from '../asset-url.ts';
import {applyCastleSurfaces} from './castle-live-surfaces.js';
import {createCastleVolumes, createCastleGlows} from './castle-live-effects.js';
import {createCastleWindowLight} from './castle-window-light.js';
import {createCastleLayers,createCastleDepthOccluders} from './castle-layers.js';
import {LIVE_CASTLE_POSITION,LIVE_CASTLE_SCALE,LIVE_CASTLE_ROTATION,LIVE_CASTLE_FLOOR,LIVE_CASTLE_ASSET_ROOT} from './castle-live-model.ts';

// Live V8 architecture/effects from PR #10, mounted in the ONE galaxy AppBase.
// No standalone engine, context planets, background, canvas or input handlers.
export async function mountLiveCastle({app,device,camera,host,compact,signal}) {
  const url = path => assetUrl(LIVE_CASTLE_ASSET_ROOT + path);
  const base='observatory-gothic/control-v8/';
  dracoInitialize({jsUrl:url(base+'decoder/draco_decoder.js'),wasmUrl:url(base+'decoder/draco_decoder.wasm'),numWorkers:2,lazyInit:true});
  const assets=[],layers=[],ownedMaterials=new Set(),ownedMeshes=new Set();
  let atlas,root,reflection,reflectionTarget,reflectionTexture,mirrorMaterial,volume,depthOccluders,disposed=false;
  const dead=()=>disposed||signal.aborted;
  function releaseAsset(a){a.unload();app.assets.remove(a);}
  async function load(name,type,path){
    if(dead())throw new Error('Castle load cancelled');
    for(let attempt=0;attempt<2;attempt++){
      let a;
      try {
        // The engine handlers have their own retries. Fetch source bytes here
        // so castle resources have ONE bounded retry and can be aborted, without
        // changing shared handler policy for any other site asset.
        const file={url:url(path)};
        const response=await fetch(file.url,{signal});if(!response.ok)throw new Error(`Castle resource HTTP ${response.status}`);
        if(type==='json')return await response.json();file.contents=await response.arrayBuffer();
        if(dead())throw new Error('Castle load cancelled');
        a=new pc.Asset('Castle V8 '+name,type,file);assets.push(a);app.assets.add(a);
        await new Promise((resolve,reject)=>{a.once('load',resolve);a.once('error',reject);app.assets.load(a);});
        if(dead()){releaseAsset(a);throw new Error('Castle load cancelled');}
        a.file.contents=null;return a.resource;
      }catch(error){if(a&&app.assets.get(a.id))releaseAsset(a);if(dead()||attempt===1)throw error;await new Promise(resolve=>setTimeout(resolve,600));}
    }
  }
  function ownMaterial(material){ownedMaterials.add(material);return material;}
  function cleanup(){
    if(disposed)return;disposed=true;signal.removeEventListener('abort',cleanup);
    camera.camera.layers=camera.camera.layers.filter(id=>!layers.some(l=>l.id===id));
    depthOccluders?.destroy();root?.destroy();reflection?.destroy();
    for(const l of layers)app.scene.layers.remove(l);
    for(const m of ownedMaterials)m.destroy();for(const m of ownedMeshes)m.destroy();
    reflectionTarget?.destroy();reflectionTexture?.destroy();atlas?.destroy();
    for(const a of assets)if(app.assets.get(a.id))releaseAsset(a);
  }
  signal.addEventListener('abort',cleanup,{once:true});
  try {
    // Independent resources load together; none of these gates the galaxy start.
    const [architecture,plasma,plasmaMap,grain,stoneAlbedo,stoneNormal,studio,baked] = await Promise.all([
      load('architecture','container',base+'castle-baked-draco.glb'),
      load('plasma geometry','container',base+'plasma-surfaces-draco.glb'),
      load('plasma texture','texture',base+'plasma.webp'),
      load('density','texture','visual-materials/fog-noise.png'),
      load('stone albedo','texture','universe/stone-violet-albedo.webp'),
      load('stone normal','texture','universe/stone-violet-normal.webp'),
      load('studio radiance','texture','visual-materials/reflection-studio.png'),
      load('baked illumination','json',base+'baked-light.json'),
    ]);
    if(dead())throw new Error('Castle load cancelled');
    root=new pc.Entity('ASTRA live observatory V8');root.enabled=false;
    root.setPosition(...LIVE_CASTLE_POSITION);root.setLocalScale(LIVE_CASTLE_SCALE,LIVE_CASTLE_SCALE,LIVE_CASTLE_SCALE);root.setEulerAngles(0,LIVE_CASTLE_ROTATION,0);app.root.addChild(root);
    const [depthLayer,modelLayer,plasmaLayer,floorLayer]=createCastleLayers(app.scene.layers);layers.push(depthLayer,modelLayer,plasmaLayer,floorLayer);
    camera.camera.layers=[...camera.camera.layers,depthLayer.id,modelLayer.id,plasmaLayer.id,floorLayer.id];
    depthOccluders=createCastleDepthOccluders(pc,app.defaultLayerWorld,depthLayer);
    const model=architecture.instantiateRenderEntity();root.addChild(model);
    let floor;
    for(const r of model.findComponents('render')){
      r.layers=[modelLayer.id];
      for(const instance of r.meshInstances){
        const m=instance.material;instance.castShadow=!m.name.includes('glazing');instance.receiveShadow=true;m.specularAntialias=true;
        if(m.name==='Control mirror floor'){floor=r;r.layers=[floorLayer.id];}
        if(m.name==='Control pearl stone'){m.emissiveVertexColor=true;m.emissive.set(1,1,1);}
        if(m.name.includes('glazing')){m.depthWrite=false;m.cull=pc.CULLFACE_NONE;}
        if(m.name==='Control celestial apse'){m.clearCoat=.18;m.metalness=.12;}
        if(m.name==='Control mineral crystal'){m.gloss=m.glossMap?1:.12;m.metalness=m.metalnessMap?1:.27;}
        m.update();
      }
    }
    if(!floor)throw new Error('Castle V8 reflective floor missing');
    function light(name,at,look,color,intensity,type='directional',range=10,shadows=false){
      const e=new pc.Entity(name);e.addComponent('light',{type,color:new pc.Color(...color),intensity,range:range*LIVE_CASTLE_SCALE,castShadows:shadows,shadowResolution:2048,shadowBias:.08,normalOffsetBias:.03,layers:[modelLayer.id]});root.addChild(e);e.setLocalPosition(...at);
      if(look){const target=root.getWorldTransform().transformPoint(new pc.Vec3(...look));e.lookAt(target);e.rotateLocal(90,0,0);}return e;
    }
    const key=light('Warm key',[-17,25,27],[0,8,0],[1,.87,.66],.85,'directional',10,true);
    light('Cool fill',[25,18,13],[0,9,0],[.66,.72,1],.42);
    light('Rear rim',[-10,17,-15],[0,10,0],[1,.22,.35],1.1);
    light('Upper warm',[0,32,-1],[0,10,0],[1,.8,.53],.5);
    for(const x of [-8.1,8.1,-13.8,13.8])light('Local crystal',[x,1.5,1.7],null,[.62,.58,1],1.2,'omni',7);
    for(const x of [-2.2,2.2,-11,13.1])light('Local gold',[x,3,2.6],null,[1,.62,.24],3.4,'omni',9);
    // Reflection/ambient atlas is assigned ONLY to castle materials, not scene.
    studio.projection=TEXTUREPROJECTION_EQUIRECT;
    const lighting=EnvLighting.generateLightingSource(studio,{size:compact?32:64});
    atlas=EnvLighting.generateAtlas(lighting,{size:compact?128:256,numReflectionSamples:32,numAmbientSamples:32});lighting.destroy();
    const finish=applyCastleSurfaces(pc,{root},model,grain,baked,{albedo:stoneAlbedo,normal:stoneNormal});
    const worldToLocal=new pc.Mat4().copy(root.getWorldTransform()).invert(),localToWorld=root.getWorldTransform().clone();
    const coordinates=`\n#ifndef ASTRA_CASTLE_SPACE\n#define ASTRA_CASTLE_SPACE\nuniform mat4 castleWorldToLocal;uniform mat4 castleLocalToWorld;\nvec3 castlePoint(vec3 p){return (castleWorldToLocal*vec4(p,1.)).xyz;}\nvec3 castleNormal(vec3 n){return normalize(mat3(castleWorldToLocal)*n);}\n#endif\n`;
    for(const r of model.findComponents('render'))for(const instance of r.meshInstances){
      const m=instance.material;if(m.name==='Control mirror floor')continue;m.envAtlas=atlas;
      for(const chunk of ['normalMapPS','glossPS','diffusePS','emissivePS']){
        let text=m.shaderChunks.glsl.get(chunk);if(!text?.includes('vPositionW'))continue;
        text=text.replaceAll('vPositionW','castlePoint(vPositionW)').replaceAll('dVertexNormalW','castleNormal(dVertexNormalW)');
        if(chunk==='normalMapPS')text=text.replace('void getNormal()','void getCastleNormal()')+'\nvoid getNormal(){getCastleNormal();dNormalW=normalize(mat3(castleLocalToWorld)*dNormalW);}';
        m.shaderChunks.glsl.set(chunk,coordinates+text);
      }
      m.setParameter('castleWorldToLocal',worldToLocal.data);m.setParameter('castleLocalToWorld',localToWorld.data);m.update();
    }
    const fx=plasma.instantiateRenderEntity(),animated=[];root.addChild(fx);
    for(const r of fx.findComponents('render')){r.layers=[plasmaLayer.id];for(const instance of r.meshInstances){
      const mint=r.entity.name.startsWith('Mint central beam'),coral=r.entity.name.startsWith('Coral spatial strands');
      let m;if(mint||coral){m=new pc.StandardMaterial();m.useLighting=false;m.diffuse.set(0,0,0);m.emissive.set(...(mint?[.17,1,.57]:[1,.045,.065]));m.emissiveIntensity=mint?8:4;m.update();}
      else {const green=r.entity.name.startsWith('Green');m=new pc.ShaderMaterial({uniqueName:'castle-v8-plasma-'+green,attributes:{aPosition:pc.SEMANTIC_POSITION,aUv:pc.SEMANTIC_TEXCOORD0},vertexGLSL:'attribute vec3 aPosition;attribute vec2 aUv;uniform mat4 matrix_model;uniform mat4 matrix_viewProjection;varying vec2 uv;void main(){uv=aUv;gl_Position=matrix_viewProjection*matrix_model*vec4(aPosition,1.);}',fragmentGLSL:`varying vec2 uv;uniform sampler2D tex;uniform float time;void main(){vec3 c=texture2D(tex,vec2(fract(uv.x+time*${green?'.016':'.003'}),uv.y)).rgb;float a=pow(dot(c,vec3(.2126,.7152,.0722)),.48);${green?'c=c.brg;':''}gl_FragColor=vec4(pow(c,vec3(${green?'2.2':'1.8'}))*${green?'4.0':'7.0'},a*.78);}`});m.blendType=pc.BLEND_ADDITIVEALPHA;m.depthWrite=false;m.cull=pc.CULLFACE_NONE;m.setParameter('tex',plasmaMap);m.setParameter('time',0);animated.push(m);}
      instance.material=ownMaterial(m);instance.castShadow=false;
    }}
    const volumes=new pc.Entity('Castle V8 volumes and glow');root.addChild(volumes);
    volume=createCastleVolumes(pc,device,volumes,camera,plasmaLayer.id,grain,compact);createCastleGlows(pc,device,volumes,plasmaLayer.id);
    const windowLight=createCastleWindowLight(pc,device,volumes,plasmaLayer.id,grain,compact);
    host.dataset.castleWindowLights=String(windowLight.count);
    // Billboard halo size is world-space; the parent above is identity-scaled.
    for(const r of volumes.findComponents('render'))for(const i of r.meshInstances){ownedMaterials.add(i.material);ownedMeshes.add(i.mesh);const size=i.material.getParameter('glowSize')?.data;if(size)i.material.setParameter('glowSize',size.map(n=>n*LIVE_CASTLE_SCALE));}
    const mirrorSize=compact?768:1536;
    reflectionTexture=new pc.Texture(device,{name:'Castle V8 HDR mirror',width:mirrorSize,height:mirrorSize,format:PIXELFORMAT_RGBA16F,mipmaps:false,minFilter:FILTER_LINEAR,magFilter:FILTER_LINEAR,addressU:pc.ADDRESS_CLAMP_TO_EDGE,addressV:pc.ADDRESS_CLAMP_TO_EDGE});
    reflectionTarget=new pc.RenderTarget({colorBuffer:reflectionTexture,depth:true,samples:Math.min(compact?2:4,device.maxSamples)});
    reflection=new pc.Entity('Castle V8 reflection camera');reflection.enabled=false;
    reflection.addComponent('camera',{priority:-1,renderTarget:reflectionTarget,nearClip:.1,farClip:1800,clearColor:new pc.Color(.003,.002,.009),layers:camera.camera.layers.filter(id=>id!==floorLayer.id&&id!==depthLayer.id)});
    reflection.camera.gammaCorrection=pc.GAMMA_NONE;reflection.camera.toneMapping=pc.TONEMAP_NONE;app.root.addChild(reflection);
    mirrorMaterial=ownMaterial(new pc.ShaderMaterial({uniqueName:'castle-v8-physical-mirror',attributes:{aPosition:pc.SEMANTIC_POSITION},vertexGLSL:'attribute vec3 aPosition;uniform mat4 matrix_model;uniform mat4 matrix_viewProjection;uniform mat4 reflectedVP;varying vec4 projected;varying vec3 surfaceWorld;void main(){vec4 w=matrix_model*vec4(aPosition,1.);surfaceWorld=w.xyz;projected=reflectedVP*w;gl_Position=matrix_viewProjection*w;}',fragmentGLSL:`varying vec4 projected;varying vec3 surfaceWorld;uniform sampler2D reflection;uniform sampler2D studioRadiance;uniform vec3 view_position;uniform mat4 castleWorldToLocal;
void main(){vec2 uv=projected.xy/max(projected.w,.0001)*.5+.5;float valid=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
vec3 reflected=texture2D(reflection,clamp(uv,.001,.999)).rgb;vec3 v=normalize(view_position-surfaceWorld),r=reflect(-v,vec3(0.,1.,0.));
vec2 envUV=vec2(atan(r.x,-r.z)/6.2831853+.5,asin(clamp(r.y,-1.,1.))/3.1415926+.5);vec3 soft=pow(texture2D(studioRadiance,envUV).rgb,vec3(2.2))*1.4;
float fresnel=.50+.50*pow(1.-abs(v.y),5.);vec3 undercoat=mix(vec3(.075,.085,.12),soft*vec3(.86,.90,1.06),.7);vec3 p=(castleWorldToLocal*vec4(surfaceWorld,1.)).xyz;
float streak=exp(-pow(p.x/2.6,2.))*smoothstep(-26.,6.,p.z);vec3 c=reflected*(.86+.18*fresnel)*valid+undercoat*(.46-.16*fresnel)+vec3(.96,.90,.80)*streak*.10;
float lc=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(lc)*vec3(1.01,.99,1.04),c,.56);
vec2 iq=p.xz-vec2(0.,-1.);float ir=length(iq),ia=atan(iq.y,iq.x),rings=0.;for(int i=1;i<=6;i++){float R=float(i)*3.0;rings+=exp(-pow((ir-R)/.11,2.));}
float spokes=exp(-pow(sin(ia*6.)*ir/.13,2.))*step(ir,15.)*step(1.5,ir);float rose=exp(-pow((ir-1.2)/.18,2.));float fade=(1.-smoothstep(4.,30.,ir))*(.60+.40*fresnel);
c+=vec3(1.,.76,.38)*(rings*.85+spokes*.45+rose*1.1)*fade*1.3;gl_FragColor=vec4(c,1.);}`}));
    mirrorMaterial.blendType=BLEND_NONE;mirrorMaterial.cull=pc.CULLFACE_NONE;mirrorMaterial.setParameter('reflection',reflectionTexture);mirrorMaterial.setParameter('studioRadiance',studio);mirrorMaterial.setParameter('castleWorldToLocal',worldToLocal.data);
    for(const instance of floor.meshInstances){instance.material=mirrorMaterial;instance.castShadow=false;}
    const projection=new pc.Mat4(),view=new pc.Mat4(),vp=new pc.Mat4();reflection.camera.calculateProjection=out=>out.copy(projection);
    function reflect(){
      const at=camera.getPosition().clone(),look=at.clone().add(camera.forward),up=camera.up.clone();at.y=2*LIVE_CASTLE_FLOOR-at.y;look.y=2*LIVE_CASTLE_FLOOR-look.y;up.y=-up.y;
      reflection.setPosition(at);reflection.lookAt(look,up);reflection.camera.fov=camera.camera.fov;reflection.camera.horizontalFov=camera.camera.horizontalFov;reflection.camera.aspectRatio=camera.camera.aspectRatio;reflection.camera.aspectRatioMode=pc.ASPECT_MANUAL;
      view.copy(reflection.getWorldTransform()).invert();projection.setPerspective(camera.camera.fov,camera.camera.aspectRatio,.1,1800,camera.camera.horizontalFov);
      const w=reflection.getWorldTransform().data,a=projection.data,plane=[w[1],w[5],w[9],at.y-LIVE_CASTLE_FLOOR],q=[(Math.sign(plane[0])+a[8])/a[0],(Math.sign(plane[1])+a[9])/a[5],-1,(1+a[10])/a[14]],scale=2/plane.reduce((sum,x,i)=>sum+x*q[i],0);
      a[2]=plane[0]*scale;a[6]=plane[1]*scale;a[10]=plane[2]*scale+1-.004;a[14]=plane[3]*scale;vp.mul2(projection,view);mirrorMaterial.setParameter('reflectedVP',vp.data);
    }
    host.dataset.castleRender='live-3d-v8';host.dataset.castleMeshes=String(model.findComponents('render').reduce((s,r)=>s+r.meshInstances.length,0));host.dataset.castleSource='castle-live-v8';
    host.dataset.castleSurfaceProfile=finish.profile;host.dataset.castleBakedEncoding=baked.encoding;host.dataset.castleWorldMatrix=[...root.getWorldTransform().data].join(',');
    host.dataset.castleTriangles=String(model.findComponents('render').flatMap(r=>r.meshInstances).reduce((s,m)=>s+m.mesh.primitive.reduce((n,p)=>n+(p.type===4?p.count/3:0),0),0));
    return {root,update(time,visible=true){
      if(dead())return;root.enabled=visible;depthOccluders.update(visible);host.dataset.castleDepthMode='world-depth-only';host.dataset.castleDepthInstances=String(depthOccluders.count);
      const center=root.getPosition().clone().add(new pc.Vec3(0,8*LIVE_CASTLE_SCALE,0)),delta=center.clone().sub(camera.getPosition()),distance=delta.length(),depth=delta.dot(camera.forward),screen=camera.camera.worldToScreen(center),extent=depth>0?20*host.clientHeight/(2*Math.tan(camera.camera.fov*Math.PI/360)*depth):0;
      const inView=depth>0&&screen.x+extent>0&&screen.x-extent<host.clientWidth&&screen.y+extent>0&&screen.y-extent<host.clientHeight;
      const near=visible&&inView&&distance<(compact?110:65)&&camera.getPosition().y>LIVE_CASTLE_FLOOR+.05;
      reflection.enabled=near;key.light.castShadows=near;for(const m of animated)m.setParameter('time',time);volume.update(time);if(near)reflect();
      const windowVisible=visible&&inView&&distance<(compact?110:90);
      windowLight.update(time,windowVisible);host.dataset.castleWindowMist=String(windowVisible);host.dataset.castleWindowTime=time.toFixed(3);
      host.dataset.castleReflection=String(near);host.dataset.castleAnimationTime=time.toFixed(3);
    },destroy:cleanup};
  }catch(error){cleanup();throw error;}
}

import * as pc from 'playcanvas';
import telescopeUrl from '../observatory/telescope-optimized.glb?url';

// Deliberately isolated. The comparison scene never opens the ASTRA account or storage.
const $=id=>document.getElementById(id);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let inside=location.hash==='#inside',paused=reduced.matches,angle=.31,drag=null;
const examples={
  observations:{title:'Атлас наблюдений',body:'Здесь могли бы находиться собственные записи человека и основания осторожных промежуточных выводов. В этом прототипе записи не загружаются.'},
  practice:{title:'Пробы и навыки',body:'Небольшая проба помогает проверить интерес в реальной жизни. Она не доказывает способность и не становится обязательным заданием. Эта витрина пока демонстрационная.'},
  discoveries:{title:'Открытия',body:'Сюда можно было бы вернуться к вопросам и замеченным изменениям. Сейчас здесь только пример расположения пространства, без личных результатов.'}
};
let dialogOpener=null;
for(const button of document.querySelectorAll('[data-room]'))button.addEventListener('click',()=>{
  const item=examples[button.dataset.room];if(!item)return;
  dialogOpener=document.activeElement;$('detail-title').textContent=item.title;
  $('detail-body').replaceChildren(Object.assign(document.createElement('p'),{textContent:item.body}));
  $('detail').showModal();
});
$('close').addEventListener('click',()=>$('detail').close());
$('detail').addEventListener('close',()=>dialogOpener?.focus());
function setView(){inside=location.hash==='#inside';document.body.classList.toggle('inside',inside);$('enter').hidden=inside;$('outside').hidden=!inside;$('rooms').hidden=!inside;$('title').innerHTML=inside?'Внутри<br>обсерватории':'Обсерватория<br>на облаке';}
addEventListener('hashchange',setView);setView();
$('enter').addEventListener('click',()=>location.hash='inside');
$('outside').addEventListener('click',()=>location.hash='outside');
$('rotate').addEventListener('click',()=>angle+=Math.PI/4);
function syncPause(){$('pause').textContent=paused?'Включить движение':'Пауза движения';$('pause').setAttribute('aria-pressed',String(paused));}
$('pause').addEventListener('click',()=>{paused=!paused;syncPause();});
reduced.addEventListener('change',()=>{paused=reduced.matches;syncPause();});syncPause();

try{await buildScene();}catch(error){$('status').textContent='PlayCanvas не запустился в этом браузере. Витрины можно открыть кнопками.';$('rooms').hidden=false;console.error(error);}

async function buildScene(){
  const canvas=$('application');
  const device=await pc.createGraphicsDevice(canvas,{deviceTypes:[pc.DEVICETYPE_WEBGL2],alpha:true,antialias:true,powerPreference:'high-performance'});
  const options=new pc.AppOptions();options.graphicsDevice=device;
  options.componentSystems=[pc.RenderComponentSystem,pc.CameraComponentSystem,pc.LightComponentSystem];
  options.resourceHandlers=[pc.TextureHandler,pc.ContainerHandler];
  const app=new pc.AppBase(canvas);app.init(options);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  device.maxPixelRatio=Math.min(devicePixelRatio,innerWidth<700?1.3:1.6);
  app.scene.toneMapping=pc.TONEMAP_ACES;app.scene.gammaCorrection=pc.GAMMA_SRGB;
  const camera=new pc.Entity('camera');camera.addComponent('camera',{clearColor:new pc.Color(0,0,0,0),fov:42,nearClip:.1,farClip:160});app.root.addChild(camera);
  function rgb(hex){return new pc.Color(((hex>>16)&255)/255,((hex>>8)&255)/255,(hex&255)/255);}
  function material(hex,{metal=.25,gloss=.55,emissive=0,opacity=1,map=null,unlit=false}={}){
    const m=new pc.StandardMaterial();m.diffuse=rgb(hex);m.useMetalness=true;m.metalness=metal;m.gloss=gloss;
    if(emissive){m.emissive=rgb(emissive);m.emissiveIntensity=1.4;}
    if(map){m.diffuseMap=map;m.opacityMap=map;m.opacityMapChannel='a';}
    if(opacity<1||map){m.blendType=pc.BLEND_NORMAL;m.opacity=opacity;m.depthWrite=false;m.cull=pc.CULLFACE_NONE;}
    if(unlit)m.useLighting=false;
    m.update();return m;
  }
  const dark=material(0x101622,{metal:.72,gloss:.74});
  const floor=material(0x222632,{metal:.53,gloss:.63});
  const ivory=material(0xe2dfdf,{metal:.12,gloss:.42});
  const gold=material(0xd1a966,{metal:1,gloss:.79});
  const lightGold=material(0xffe0a7,{metal:.48,gloss:.78,emissive:0xffbb66});
  function entity(name,geometry,mat,parent=app.root){const e=new pc.Entity(name);e.addComponent('render',{meshInstances:[new pc.MeshInstance(pc.Mesh.fromGeometry(device,geometry),mat)]});parent.addChild(e);return e;}
  function custom(name,positions,uvs,indices,mat,parent=app.root){const mesh=new pc.Mesh(device);mesh.setPositions(positions);mesh.setNormals(pc.calculateNormals(positions,indices));if(uvs)mesh.setUvs(0,uvs);mesh.setIndices(indices);mesh.update();const e=new pc.Entity(name);e.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,mat)]});parent.addChild(e);return e;}
  function disc(radius,height,y,mat){const e=entity('platform layer',new pc.CylinderGeometry({radius,height,heightSegments:1,capSegments:96}),mat);e.setLocalPosition(0,y,0);return e;}
  function ring(radius,y,mat,tube=.025){const e=entity('gold ring',new pc.TorusGeometry({ringRadius:radius,tubeRadius:tube,segments:128,sides:8}),mat);e.setLocalPosition(0,y,0);return e;}
  function light(type,color,intensity,x,y,z,castShadows=false){const e=new pc.Entity('light');e.addComponent('light',{type,color:rgb(color),intensity,castShadows,shadowResolution:1024,shadowDistance:30});e.setPosition(x,y,z);if(type==='directional')e.lookAt(0,0,0);app.root.addChild(e);return e;}
  light('directional',0xffe6bd,2.8,-6,12,8,true);light('directional',0x4cb8ff,2.1,7,6,-7);light('omni',0xc644ff,1.7,-3,3,-2);light('omni',0xffbd74,2.2,0,2,1);
  app.scene.ambientLight=rgb(0x536484);
  disc(5.28,.32,-.38,ivory);disc(5.36,.18,-.14,ivory);disc(5.12,.18,.04,ivory);
  disc(4.48,.42,.29,dark);disc(4.29,.045,.51,floor);
  ring(5.16,.14,gold,.025);ring(4.49,.52,lightGold,.045);
  for(const r of [1.03,2.43,3.71])ring(r,.543,gold,.013);
  for(let i=0;i<3;i++){const stair=entity('entrance stair',new pc.BoxGeometry({halfExtents:new pc.Vec3(.86,.06,(.95-i*.12)/2)}),i===1?gold:ivory);stair.setPosition(0,-.32+i*.13,5.45-i*.34);}
  for(let i=0;i<8;i++){const a=(i+.5)/8*Math.PI*2,x=Math.sin(a)*4.16,z=Math.cos(a)*4.16;
    const post=entity('rail post',new pc.CylinderGeometry({radius:.115,height:.95,capSegments:12}),dark);post.setPosition(x,1.02,z);
    const cap=entity('post cap',new pc.CylinderGeometry({radius:.14,height:.1,capSegments:16}),gold);cap.setPosition(x,1.53,z);
  }
  ring(4.2,1.6,gold,.036);

  const sailTexture=textureFromCanvas(device,makeNebulaCanvas());
  const sailMaterial=material(0xd8eeff,{metal:.08,gloss:.77,emissive:0x281846,opacity:.77,map:sailTexture});
  const sails=new pc.Entity('nebula membranes');app.root.addChild(sails);
  const configs=[{angle:-.91,height:5.4,width:1.47,sweep:.22},{angle:-2.35,height:6.55,width:1.36,sweep:-.34},{angle:2.28,height:7.05,width:1.33,sweep:.34},{angle:.92,height:4.45,width:1.62,sweep:-.22}];
  for(const conf of configs){const rows=30,cols=12,positions=[],uvs=[],indices=[];
    function point(t,s){const width=(Math.pow(Math.sin(Math.PI*t),.72)*conf.width+.1*(1-t))*s;
      const a=conf.angle+conf.sweep*t*t+width/4.3,r=4.18-.52*t+.24*Math.sin(Math.PI*t)+.08*(1-s*s);
      return [Math.sin(a)*r,.72+conf.height*t,Math.cos(a)*r];
    }
    for(let j=0;j<=rows;j++){const t=j/rows;for(let k=0;k<=cols;k++){positions.push(...point(t,k/cols*2-1));uvs.push(k/cols,t);}}
    for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const n=j*(cols+1)+k;indices.push(n,n+1,n+cols+1,n+1,n+cols+2,n+cols+1);}
    custom('nebula sail',positions,uvs,indices,sailMaterial,sails);
    for(const side of [-1,1]){const edgePositions=[],edgeIndices=[];const radius=.028;
      for(let j=0;j<=50;j++){const [x,y,z]=point(j/50,side);for(let k=0;k<6;k++){const a=k/6*Math.PI*2;edgePositions.push(x+Math.cos(a)*radius,y+Math.sin(a)*radius,z);}}
      for(let j=0;j<50;j++)for(let k=0;k<6;k++){const a=j*6+k,b=j*6+(k+1)%6,c=(j+1)*6+k,d=(j+1)*6+(k+1)%6;edgeIndices.push(a,b,c,b,d,c);}
      custom('gold membrane edge',edgePositions,null,edgeIndices,lightGold,sails);
    }
    const p=point(0,0),base=entity('sail mount',new pc.CylinderGeometry({radius:.2,height:.56,capSegments:16}),gold,sails);base.setLocalPosition(p[0],.77,p[2]);
  }

  const cloudTexture=textureFromCanvas(device,makeCloudCanvas());
  const cloudMaterial=material(0xf3f0f5,{metal:0,gloss:0,opacity:.46,map:cloudTexture,unlit:true});
  cloudMaterial.blendType=pc.BLEND_ADDITIVEALPHA;cloudMaterial.update();
  let seed=58219;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const cloudCount=innerWidth<700?70:112,cloudPositions=[],cloudUvs=[],cloudIndices=[];
  for(let i=0;i<cloudCount;i++){const a=random()*Math.PI*2,r=2.6+random()*5.8,size=3.2+random()*3.5,x=Math.sin(a)*r,z=Math.cos(a)*r,y=-.72-random()*1.28;const v=i*4,s=size/2;
    cloudPositions.push(x-s,y,z-s,x+s,y,z-s,x-s,y,z+s,x+s,y,z+s);cloudUvs.push(0,0,1,0,0,1,1,1);cloudIndices.push(v,v+2,v+1,v+1,v+2,v+3);
  }
  const cloud=custom('cloud field',cloudPositions,cloudUvs,cloudIndices,cloudMaterial);

  const model=new pc.Asset('telescope','container',{url:telescopeUrl});app.assets.add(model);
  $('scene').dataset.telescope='loading';
  model.ready(asset=>{const telescope=asset.resource.instantiateRenderEntity();telescope.setLocalScale(1.23,1.23,1.23);telescope.setEulerAngles(0,60,0);app.root.addChild(telescope);$('scene').dataset.telescope='loaded-glb';});
  model.on('error',()=>{const fallback=entity('telescope fallback',new pc.CylinderGeometry({radius:.33,height:2,capSegments:18}),gold);fallback.setPosition(0,1.7,0);$('scene').dataset.telescope='fallback';});
  app.assets.load(model);

  function resize(){device.maxPixelRatio=Math.min(devicePixelRatio,innerWidth<700?1.3:1.6);app.resizeCanvas();$('scene').dataset.viewport=`${innerWidth}x${innerHeight}`;}
  addEventListener('resize',resize);resize();
  canvas.addEventListener('pointerdown',event=>{drag={x:event.clientX,y:event.clientY,angle};canvas.setPointerCapture(event.pointerId);});
  canvas.addEventListener('pointermove',event=>{if(drag)angle=drag.angle+(event.clientX-drag.x)*.006;});
  canvas.addEventListener('pointerup',event=>{if(drag&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<8&&!inside)location.hash='inside';drag=null;});
  canvas.addEventListener('pointercancel',()=>drag=null);
  addEventListener('pointermove',event=>{if(reduced.matches)return;document.documentElement.style.setProperty('--bg-x',`${(event.clientX/innerWidth-.5)*-7}px`);document.documentElement.style.setProperty('--bg-y',`${(event.clientY/innerHeight-.5)*-5}px`);},{passive:true});
  const destination=new pc.Vec3(),target=new pc.Vec3(),look=new pc.Vec3(-2.9,2.15,0);
  camera.setPosition(Math.sin(angle)*20,8.8,Math.cos(angle)*20);camera.lookAt(look);
  let elapsed=0,metricAt=performance.now(),frames=0;
  app.on('update',dt=>{if(document.hidden)return;if(!paused)elapsed+=dt;
    camera.camera.fov=inside?66:42;
    if(inside){destination.set(Math.sin(angle)*3.1,2.15,Math.cos(angle)*3.1);target.set(0,2.15,0);}else{const radius=innerWidth<700?24:20;destination.set(Math.sin(angle)*radius,8.8,Math.cos(angle)*radius);target.set(innerWidth<700?-1.3:-2.9,2.15,0);}
    const f=paused||reduced.matches?1:1-Math.exp(-Math.min(dt,.05)*3.5);
    const current=camera.getPosition();current.lerp(current,destination,f);camera.setPosition(current);
    look.lerp(look,target,f);camera.lookAt(look);
    if(!paused){sails.setEulerAngles(0,Math.sin(elapsed*.14)*1.55,0);cloud.setLocalPosition(0,Math.sin(elapsed*.29)*.055,0);}
    cloud.enabled=!inside;
    frames++;const now=performance.now();if(now-metricAt>=2000){const node=$('scene');node.dataset.fps=(frames*1000/(now-metricAt)).toFixed(1);node.dataset.calls=String(app.stats.drawCalls.total);node.dataset.mode=inside?'inside':'outside';metricAt=now;frames=0;}
  });
  device.on('devicelost',()=>{$('status').textContent='3D приостановлено. Обнови страницу; витрины доступны кнопками.';$('rooms').hidden=false;});
  app.start();$('scene').dataset.engine='playcanvas';$('scene').dataset.ready='true';
}

function textureFromCanvas(device,canvas){const texture=new pc.Texture(device,{width:canvas.width,height:canvas.height,format:pc.PIXELFORMAT_SRGBA,mipmaps:true});texture.setSource(canvas);texture.minFilter=pc.FILTER_LINEAR_MIPMAP_LINEAR;texture.magFilter=pc.FILTER_LINEAR;return texture;}
function makeNebulaCanvas(){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=1024;const c=canvas.getContext('2d');
  const base=c.createLinearGradient(0,0,512,1024);base.addColorStop(0,'rgba(12,29,79,.45)');base.addColorStop(.33,'rgba(32,78,181,.56)');base.addColorStop(.64,'rgba(98,26,164,.67)');base.addColorStop(1,'rgba(10,28,83,.38)');c.fillStyle=base;c.fillRect(0,0,512,1024);
  let seed=6924;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  for(let i=0;i<90;i++){const x=random()*512,y=random()*1024,r=25+random()*150,hue=i%3===0?'199,239,255':i%3===1?'232,99,255':'79,174,255';const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${hue},${.14+random()*.25})`);g.addColorStop(.35,`rgba(${hue},.08)`);g.addColorStop(1,`rgba(${hue},0)`);c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
  for(let i=0;i<260;i++){const x=random()*512,y=random()*1024,r=random()*1.6+.3;c.fillStyle=`rgba(231,243,255,${.28+random()*.64})`;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
  return canvas;
}
function makeCloudCanvas(){const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');let seed=91;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  for(let i=0;i<54;i++){const a=random()*6.28,r=random()*54,x=128+Math.cos(a)*r,y=128+Math.sin(a)*r,s=28+random()*50,g=c.createRadialGradient(x,y,0,x,y,s);g.addColorStop(0,'rgba(255,255,255,.2)');g.addColorStop(.5,'rgba(247,247,255,.075)');g.addColorStop(1,'rgba(230,235,255,0)');c.fillStyle=g;c.fillRect(0,0,256,256);}
  return canvas;
}

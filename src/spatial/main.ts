import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildWorld } from './worlds';
import type { World } from './worlds';
import { parseLocation, locationHash, sections, sectionIds, isTap, smoothStep } from './navigation';
import type { SectionId, WorldId, SpatialLocation } from './navigation';
import './styles.css';

function el<E extends HTMLElement = HTMLElement>(id:string):E {
  const node=document.getElementById(id);
  if(!node) throw new Error('Missing interface element: '+id);
  return node as E;
}
function start() {
  const stage=el('stage'), labelLayer=el('labels');
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'default'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<600?1.25:1.75));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.15;
  const canvas=renderer.domElement; canvas.tabIndex=0;
  canvas.setAttribute('aria-label','3D-мир. Тяните для поворота, колесо для масштаба. Стрелки вращают камеру, плюс и минус меняют масштаб. Нажмите на объект или используйте кнопки разделов.');
  stage.append(canvas);
  const scene=new T.Scene();
  const camera=new T.PerspectiveCamera(38,1,.1,180);
  const controls=new OrbitControls(camera,canvas);
  controls.enableDamping=true; controls.dampingFactor=.085; controls.enablePan=false;
  controls.minDistance=5.5; controls.maxDistance=65; controls.minPolarAngle=.25; controls.maxPolarAngle=1.37;
  controls.rotateSpeed=.65; controls.zoomSpeed=.75;
  const pmrem=new T.PMREMGenerator(renderer), roomEnvironment=new RoomEnvironment();
  const environment=pmrem.fromScene(roomEnvironment,.06); scene.environment=environment.texture;
  roomEnvironment.dispose(); pmrem.dispose();
  scene.environmentIntensity=.45;
  const sky=new T.HemisphereLight('#ffffff','#a09b87',2.25); scene.add(sky);
  const sun=new T.DirectionalLight('#fff1d8',3.2); sun.position.set(-7,15,9); sun.castShadow=true;
  sun.shadow.mapSize.set(innerWidth<600?512:1024,innerWidth<600?512:1024);
  Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:1,far:45});
  sun.shadow.bias=-.0004; sun.shadow.normalBias=.03; scene.add(sun);
  let world:World;
  let location:SpatialLocation=parseLocation(window.location.hash);
  let currentWorld:WorldId|null=null;
  let tween:{from:T.Vector3;to:T.Vector3;targetFrom:T.Vector3;targetTo:T.Vector3;start:number}|null=null;
  let dirty=true, paused=matchMedia('(prefers-reduced-motion: reduce)').matches, lastTime=0, worldTime=0;
  let hunting=false, collected=false, toastTimer:ReturnType<typeof setTimeout>;
  let avatarTarget:T.Vector3|null=null;
  let hovered:T.Group|null=null;
  const labels=new Map<SectionId,HTMLButtonElement>();
  let previousFocus:HTMLElement|null=null;
  const raycaster=new T.Raycaster(), pointer=new T.Vector2();
  let pointerDown:{x:number;y:number}|null=null, dragged=false, multiTouch=false;
  const pointerIds=new Set<number>();
  let disposed=false;

  function toast(message:string) {
    el('toast').textContent=message; el('toast').classList.add('show');
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>el('toast').classList.remove('show'),5200);
  }
  function cameraTo(position:T.Vector3,target:T.Vector3,instant=false) {
    controls.enabled=true;
    if(instant||paused){tween=null;camera.position.copy(position);controls.target.copy(target);controls.update();}
    else tween={from:camera.position.clone(),to:position.clone(),targetFrom:controls.target.clone(),targetTo:target.clone(),start:performance.now()};
    dirty=true;
  }
  function overview(instant=false) {
    const scale=innerWidth<600?1.65:innerWidth<960?1.16:1;
    const position=world.target.clone().add(world.home.clone().sub(world.target).multiplyScalar(scale));
    cameraTo(position,world.target,instant);
  }
  function navigate(section:SectionId|null,worldId=location.world) {
    const next={world:worldId,section};
    const hash=locationHash(next);
    if(window.location.hash===hash){applyLocation();return;}
    window.location.hash=hash;
  }
  function setWorld(id:WorldId) {
    if(world){scene.remove(world.root);world.dispose();}
    labelLayer.replaceChildren(); labels.clear(); hovered=null; avatarTarget=null;
    world=buildWorld(id); currentWorld=id; scene.add(world.root);
    world.spark.visible=hunting&&!collected;
    scene.background=new T.Color(world.background);
    scene.fog=new T.Fog(world.background,65,125);
    sky.intensity=id==='orbit'?1.5:2.25; sun.intensity=id==='orbit'?2.5:3.2;
    document.body.dataset.world=id;
    el('world-title').innerHTML=world.title;
    el('world-description').innerHTML=world.description;
    el('world-kicker').textContent=world.kicker;
    document.querySelectorAll<HTMLButtonElement>('[data-world]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.world===id)));
    for(const [i,place] of world.places.entries()){
      const label=document.createElement('button'); label.className='object-label';
      label.innerHTML='<i>'+String(i+1).padStart(2,'0')+'</i><span>'+sections[place.id].title+'</span>';
      label.setAttribute('aria-label','Войти: '+sections[place.id].title);
      label.addEventListener('click',()=>navigate(place.id));
      labelLayer.append(label);labels.set(place.id,label);
    }
    overview(true);
  }
  function applyLocation() {
    location=parseLocation(window.location.hash);
    if(currentWorld!==location.world)setWorld(location.world);
    const section=location.section, detail=el('detail');
    document.body.classList.toggle('detail-open',!!section);
    document.querySelectorAll<HTMLButtonElement>('[data-section]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.section===section)));
    labels.forEach((button,id)=>button.classList.toggle('active',id===section));
    if(section){
      if(detail.hidden)previousFocus=document.activeElement as HTMLElement;
      const content=sections[section], place=world.places.find(p=>p.id===section)!;
      el('detail-title').textContent=content.title;
      el('detail-subtitle').textContent=content.subtitle;
      el('detail-description').textContent=content.description;
      el('detail-number').textContent=String(sectionIds.indexOf(section)+1).padStart(2,'0');
      const link=el<HTMLAnchorElement>('detail-link');link.href=content.href;link.textContent=content.action+' ↗';
      detail.hidden=false;
      // The scene remains operable; this is a non-modal companion panel.
      el('detail-title').focus({preventScroll:true});
      const target=place.focus.clone();
      const offset=new T.Vector3(6.7,5.8,8.9);
      if(innerWidth<600){target.y-=2.8;offset.multiplyScalar(1.45);}
      else target.add(new T.Vector3(1.9,0,-1.3));
      cameraTo(target.clone().add(offset),target);
      avatarTarget=place.object.position.clone().add(new T.Vector3(0,0,1.8));
    }else{
      const wasOpen=!detail.hidden;
      detail.hidden=true;overview();
      if(wasOpen&&previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
    }
    dirty=true;
  }
  function resize(){
    const rect=stage.getBoundingClientRect();
    camera.aspect=rect.width/rect.height; camera.updateProjectionMatrix();
    renderer.setSize(rect.width,rect.height,false);dirty=true;
  }
  function setPointer(event:PointerEvent){
    const rect=canvas.getBoundingClientRect();
    pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(pointer,camera);
  }
  function visible(object:T.Object3D):boolean{
    let item:T.Object3D|null=object;
    while(item){if(!item.visible)return false;item=item.parent;}return true;
  }
  function sectionFor(object:T.Object3D):SectionId|null{
    let item:T.Object3D|null=object;
    while(item){if(item.userData.section)return item.userData.section as SectionId;item=item.parent;}return null;
  }
  function hit(event:PointerEvent){setPointer(event);return raycaster.intersectObject(world.root,true).find(h=>visible(h.object));}
  function collect(){
    if(!hunting||collected)return;
    collected=true;world.spark.visible=false;
    const button=el<HTMLButtonElement>('spark');button.innerHTML='✧ Искра найдена <span>1 / 1</span>';button.disabled=true;button.classList.remove('searching');
    toast('Искра найдена! Это демонстрация игровой реакции, не запись достижения.');dirty=true;
  }
  function pointerUp(event:PointerEvent) {
    const start=pointerDown; pointerIds.delete(event.pointerId);
    if(!start||dragged||multiTouch||!isTap(start,{x:event.clientX,y:event.clientY})){if(pointerIds.size===0){pointerDown=null;multiTouch=false;}return;}
    pointerDown=null;
    const picked=hit(event);
    if(!picked)return;
    if(picked.object.userData.spark){collect();return;}
    const section=sectionFor(picked.object);
    if(section){navigate(section);return;}
    // Only exposed ground is walkable; decoration cannot be clicked through.
    if(picked.object===world.walkSurface){
      if(location.section)navigate(null);
      const point=picked.point.clone();point.y=0;
      const length=Math.hypot(point.x,point.z);if(length>world.radius){point.x*=world.radius/length;point.z*=world.radius/length;}
      avatarTarget=point;dirty=true;
    }
  }
  const onPointerDown=(event:PointerEvent)=>{
    if(event.button!==0)return;
    pointerIds.add(event.pointerId);if(pointerIds.size>1)multiTouch=true;
    pointerDown={x:event.clientX,y:event.clientY};dragged=false;tween=null;
    canvas.focus({preventScroll:true});
  };
  const onPointerMove=(event:PointerEvent)=>{
    if(pointerDown){if(!isTap(pointerDown,{x:event.clientX,y:event.clientY}))dragged=true;return;}
    const picked=hit(event), section=picked?sectionFor(picked.object):null;
    const next=section?world.places.find(p=>p.id===section)!.object:null;
    if(next!==hovered){if(hovered)hovered.scale.setScalar(1);hovered=next;if(hovered)hovered.scale.setScalar(1.025);dirty=true;}
    canvas.style.cursor=section||picked?.object.userData.spark?'pointer':'grab';
  };
  const onPointerCancel=()=>{pointerIds.clear();pointerDown=null;multiTouch=false;dragged=false;};
  canvas.addEventListener('pointerdown',onPointerDown);canvas.addEventListener('pointermove',onPointerMove);
  canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',onPointerCancel);
  canvas.addEventListener('pointerleave',()=>{if(hovered)hovered.scale.setScalar(1);hovered=null;dirty=true;});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.setAnimationLoop(null);el('fallback').hidden=false;el('loading').hidden=true;});
  const onKey=(event:KeyboardEvent)=>{
    if(event.key==='Escape'&&location.section){navigate(null);return;}
    if(event.target!==canvas)return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(event.key)){
      event.preventDefault();tween=null;
      if(event.key==='ArrowLeft')controls.rotateLeft(.15);
      if(event.key==='ArrowRight')controls.rotateLeft(-.15);
      if(event.key==='ArrowUp')controls.rotateUp(.12);
      if(event.key==='ArrowDown')controls.rotateUp(-.12);
      if(event.key==='+'||event.key==='=')controls.dollyIn(1.13);
      if(event.key==='-')controls.dollyOut(1.13);
      if(event.key==='Home')overview();
      controls.update();dirty=true;
    }
  };
  document.addEventListener('keydown',onKey);
  document.querySelectorAll<HTMLButtonElement>('[data-world]').forEach(b=>b.addEventListener('click',()=>navigate(null,b.dataset.world as WorldId)));
  document.querySelectorAll<HTMLButtonElement>('[data-section]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.section as SectionId)));
  el('close-detail').addEventListener('click',()=>navigate(null));
  el('reset-camera').addEventListener('click',()=>{if(location.section)navigate(null);else overview();});
  el('zoom-in').addEventListener('click',()=>{tween=null;controls.dollyIn(1.22);controls.update();dirty=true;});
  el('zoom-out').addEventListener('click',()=>{tween=null;controls.dollyOut(1.22);controls.update();dirty=true;});
  function pauseUI(){
    const button=el('motion-toggle');button.setAttribute('aria-pressed',String(paused));
    button.setAttribute('aria-label',paused?'Возобновить анимацию':'Пауза анимации');
    button.title=paused?'Возобновить анимацию':'Пауза анимации';button.textContent=paused?'▷':'Ⅱ';
    controls.enableDamping=!paused;dirty=true;
  }
  el('motion-toggle').addEventListener('click',()=>{paused=!paused;pauseUI();});
  el('spark').addEventListener('click',()=>{
    hunting=true;world.spark.visible=true;dirty=true;
    el('spark').innerHTML='✧ Найдите золотую искру <span>0 / 1</span>';el('spark').classList.add('searching');
    if(location.section)navigate(null);else overview();
    toast('Найдите маленький золотой кристалл в мире и нажмите на него. Можно приближать камеру.');
  });
  const onHash=()=>applyLocation();window.addEventListener('hashchange',onHash);
  const observer=new ResizeObserver(()=>{resize();});observer.observe(stage);
  const onVisibility=()=>{lastTime=0;dirty=true;};document.addEventListener('visibilitychange',onVisibility);
  const projected=new T.Vector3();
  function updateLabels(){
    const rect=stage.getBoundingClientRect();
    for(const place of world.places){
      const label=labels.get(place.id)!;
      projected.copy(place.anchor).project(camera);
      const x=(projected.x*.5+.5)*rect.width,y=(-projected.y*.5+.5)*rect.height;
      const hidden=!!location.section||projected.z>1||projected.z< -1||x<40||x>rect.width-40||y<90||y>rect.height-110;
      label.hidden=hidden;
      if(!hidden)label.style.transform='translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px) translate(-50%,-50%)';
    }
  }
  applyLocation();resize();pauseUI();
  renderer.setAnimationLoop((time:number)=>{
    if(disposed||document.hidden)return;
    const dt=lastTime?Math.min((time-lastTime)/1000,.05):0;lastTime=time;
    if(!paused){worldTime+=dt;world.update(worldTime);dirty=true;}
    if(tween){
      const progress=(time-tween.start)/1050,t=smoothStep(progress);
      camera.position.lerpVectors(tween.from,tween.to,t);controls.target.lerpVectors(tween.targetFrom,tween.targetTo,t);
      if(progress>=1)tween=null;dirty=true;
    }
    if(avatarTarget){
      const direction=avatarTarget.clone().sub(world.avatar.position);direction.y=0;
      const distance=direction.length();
      if(distance<.07){world.avatar.position.copy(avatarTarget);avatarTarget=null;}
      else{world.avatar.rotation.y=Math.atan2(direction.x,direction.z);world.avatar.position.addScaledVector(direction.normalize(),Math.min(distance,dt*3));}
      dirty=true;
    }
    if(controls.update())dirty=true;
    if(dirty){scene.updateMatrixWorld();camera.updateMatrixWorld();updateLabels();renderer.render(scene,camera);dirty=false;el('loading').hidden=true;}
  });
  const cleanup=()=>{
    disposed=true;renderer.setAnimationLoop(null);observer.disconnect();controls.dispose();
    window.removeEventListener('hashchange',onHash);document.removeEventListener('keydown',onKey);
    document.removeEventListener('visibilitychange',onVisibility);clearTimeout(toastTimer);
    world.dispose();environment.dispose();renderer.dispose();
  };
  if(import.meta.hot)import.meta.hot.dispose(cleanup);
}
try {start();} catch(error) {
  console.error('Spatial scene failed to initialize',error);
  el('fallback').hidden=false;el('loading').hidden=true;
}


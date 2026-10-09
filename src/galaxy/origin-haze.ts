import * as T from 'three';
import type { PlanetId } from './journey';
import { nebulaColor, contrastMist } from './space-color.ts';

export const HAZE_PALETTES:Record<PlanetId,readonly [string,...string[]]>={
  origin:['#8293aa','#bcc2c4','#df8051','#687a97','#a19b95'],
  aurora:['#71e69d','#2fcbb6','#b8df7c','#4aa7bd','#6bcb88'],
  velir:['#488de7','#36cbd8','#9b83df','#4582bf','#78d9df'],
  nereya:['#d49d54','#b67434','#89b9a7','#ba8649','#e4c58d'],
  solis:['#e653bf','#763bb7','#38c8e2','#a963df','#dc54d5'],
  about:['#d7b66e','#5abbbc','#b390cb','#ac824d','#73a9b8'],
};
export const HAZE_FORMS:Record<PlanetId,{name:string;width:number;height:number;tilt:number;speed:number;density:number}>={
  origin:{name:'lunar-dust-embers',width:1,height:1,tilt:0,speed:.6,density:.32},
  aurora:{name:'jade-polar-curtains',width:.55,height:1.8,tilt:.35,speed:.65,density:.55},
  velir:{name:'inclined-ice-ribbons',width:1.6,height:.46,tilt:-.65,speed:.8,density:.8},
  nereya:{name:'emerald-spiral-eddies',width:.9,height:1.1,tilt:.15,speed:1.35,density:1.05},
  solis:{name:'inclined-nebula-ring',width:1,height:1,tilt:1.25,speed:.5,density:1.25},
  about:{name:'quiet-twin-lobes',width:.7,height:1.3,tilt:-.25,speed:.4,density:.65},
};

// Generated once, not evaluated per fragment: wisps without a downloaded image.
export function hazeDensity(u:number,v:number,seed:number) {
  const smooth=(a:number,b:number,x:number)=>T.MathUtils.smoothstep(x,a,b);
  const hash=(x:number,y:number)=>{const n=Math.sin(x*127.1+y*311.7+seed*74.7)*43758.5453;return n-Math.floor(n);};
  const noise=(x:number,y:number)=>{
    const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(0,1,x-ix),fy=smooth(0,1,y-iy);
    return T.MathUtils.lerp(T.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),fx),T.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),fx),fy);
  };
  const x=(u-.5)*2,y=(v-.5)*2;
  const warp=noise(x*2+8,y*2+3);
  const n=noise(x*3+warp*2,y*3+seed)*.56+noise(x*7+warp,y*7)*.29+noise(x*16,y*16)*.15;
  const envelope=1-smooth(.18,.94,Math.hypot(x,y));
  const filament=.3+.7*Math.pow(1-Math.abs(2*n-1),3);
  return contrastMist(envelope*envelope*smooth(.25,.72,n)*filament);
}

// One set per scene: six planets share these masks and the scene owns disposal.
export function createHazeTextures(soft=false) {
  return [3,11,27].map(seed=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d')!,pixels=ctx.createImageData(256,256);
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){
      const i=(y*256+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;
      pixels.data[i+3]=Math.round(255*hazeDensity(x/255,y/255,seed));
    }
    ctx.putImageData(pixels,0,0);
    if(!soft)return new T.CanvasTexture(canvas);
    // Planet fog has no filament outlines; keep storm masks independently crisp.
    const fog=document.createElement('canvas');fog.width=fog.height=256;
    const blur=fog.getContext('2d')!;blur.filter='blur(9px)';blur.drawImage(canvas,0,0);blur.filter='none';
    const edge=blur.createRadialGradient(128,128,55,128,128,126);
    edge.addColorStop(0,'#fff');edge.addColorStop(1,'#fff0');
    blur.globalCompositeOperation='destination-in';blur.fillStyle=edge;blur.fillRect(0,0,256,256);
    return new T.CanvasTexture(fog);
  });
}

export function createPlanetHaze(center:T.Vector3,radius:number,mobile:boolean,textures:readonly T.Texture[],palette:readonly [string,...string[]],phase=0,id:PlanetId='origin') {
  if(textures.length===0)throw new Error('Haze requires shared masks');
  const group=new T.Group();group.position.copy(center);
  const scale=radius/5.5;
  const form=HAZE_FORMS[id];group.userData.hazeForm=form.name;
  const count=mobile?18:26;
  const particles=Array.from({length:count},(_,i)=>{
    const angle=i*2.399963+phase,vertical=1-2*(i+.5)/count;
    const radial=Math.sqrt(1-vertical*vertical),distance=radius+(1.0+(i%4)*.48)*scale;
    const material=new T.SpriteMaterial({map:textures[i%textures.length],color:nebulaColor(palette[i%palette.length]),transparent:true,opacity:.46,depthWrite:false,depthTest:true,blending:T.AdditiveBlending});
    // Fade at the solid surface and near the camera, preventing hard card intersections.
    material.onBeforeCompile=shader=>{
      shader.uniforms.uHazeCenter={value:center};shader.uniforms.uHazeRadius={value:radius};shader.uniforms.uHazeScale={value:scale};
      shader.vertexShader='uniform vec3 uHazeCenter;varying vec3 vHazePosition,vHazeCenter;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('gl_Position = projectionMatrix * mvPosition;','vHazePosition=mvPosition.xyz;vHazeCenter=(viewMatrix*vec4(uHazeCenter,1.)).xyz;gl_Position = projectionMatrix * mvPosition;');
      shader.fragmentShader='uniform float uHazeRadius,uHazeScale;varying vec3 vHazePosition,vHazeCenter;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        diffuseColor.a*=smoothstep(.05,1.25,(length(vHazePosition-vHazeCenter)-uHazeRadius)/uHazeScale);
        diffuseColor.a*=smoothstep(.4,2.8,-vHazePosition.z/uHazeScale);`);
    };
    const sprite=new T.Sprite(material);
    sprite.position.set(Math.cos(angle)*radial*distance,vertical*distance,Math.sin(angle)*radial*distance);
    if(id==='aurora')sprite.position.set(Math.cos(angle)*.55,vertical*1.45,Math.sin(angle)*.55).normalize().multiplyScalar(distance);
    if(id==='velir')sprite.position.set(Math.cos(angle),Math.sin(angle*.4)*.17,Math.sin(angle)).normalize().multiplyScalar(distance*1.12);
    if(id==='nereya')sprite.position.set(Math.cos(angle+vertical*3)*radial,vertical,Math.sin(angle+vertical*3)*radial).multiplyScalar(distance);
    if(id==='solis'){
      const ringAngle=i/count*Math.PI*2,ringRadius=radius*(1.70+.10*Math.sin(i*2.3));
      sprite.position.set(Math.cos(ringAngle)*ringRadius,Math.sin(ringAngle)*ringRadius,Math.sin(i*1.8)*radius*.035);
    }
    if(id==='about')sprite.position.set(Math.cos(angle)*.6,vertical<0?-1:1,Math.sin(angle)*.6).normalize().multiplyScalar(distance);
    const base=sprite.position.clone(),rotation=angle;
    sprite.scale.set((7.5+(i%3)*1.4)*scale*form.width,(4.8+(i%4)*.6)*scale*form.height,1);material.rotation=rotation;
    if(id==='solis')sprite.scale.set(radius*(.72+(i%3)*.10),radius*(.27+(i%4)*.035),1);
    const hue=material.color.getHSL({h:0,s:0,l:0}).h;
    if(hue>=.46&&hue<=.69){sprite.scale.x*=.7;sprite.scale.y*=.7;}
    group.add(sprite);
    return {sprite,base,rotation,opacity:.20+(i%4)*.04};
  });
  return {group,update(time:number,surface:boolean,cameraPosition:T.Vector3){
    time*=form.speed;
    const distance=cameraPosition.distanceTo(center)/radius;
    const visibility=1-T.MathUtils.smoothstep(distance,30,44);
    group.visible=visibility>0;
    if(!group.visible)return;
    const detail=1-T.MathUtils.smoothstep(distance,5,11);
    group.rotation.x=form.tilt;group.rotation.y=Math.sin(time*.018+phase)*.10;group.rotation.z=Math.sin(time*.014+phase)*.065;
    if(id==='solis'){group.rotation.y+=.55;group.rotation.z+=.22;}
    for(let i=0;i<particles.length;i++){
      const {sprite,base,rotation,opacity}=particles[i];
      // Keep evenly distributed wisps at distance, fade the rest without popping.
      const lod=i%3===0?1:detail;sprite.visible=lod>0;
      sprite.position.copy(base).multiplyScalar(1+Math.sin(time*.09+i*1.7+phase)*.035);
      sprite.material.rotation=rotation+Math.sin(time*.04+i+phase)*.12;
      sprite.material.opacity=opacity*(.88+.12*Math.sin(time*.12+i+phase))*(surface?.22:1)*visibility*lod*form.density;
    }
  }};
}

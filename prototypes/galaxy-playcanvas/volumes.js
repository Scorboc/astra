import {VOLUME_LAYOUT} from './volume-layout.js';
export function addVolumes(pc,device,parent,camera,{layer,omitFoundation=false,beamBase}={}){
 const entries=[];
 for(const sourceSpec of VOLUME_LAYOUT){
  const spec=sourceSpec.kind===1&&beamBase!==undefined?{...sourceSpec,center:[0,(40+beamBase)/2,0],half:[sourceSpec.half[0],(40-beamBase)/2,sourceSpec.half[2]]}:sourceSpec;
  if(omitFoundation&&spec.kind===3)continue;
  const material=new pc.ShaderMaterial({uniqueName:'astra-volume-'+spec.kind+'-'+spec.name,attributes:{aPosition:pc.SEMANTIC_POSITION},
   vertexGLSL:'attribute vec3 aPosition;uniform mat4 matrix_model;uniform mat4 matrix_viewProjection;varying vec3 exitPoint;void main(){exitPoint=aPosition*2.;gl_Position=matrix_viewProjection*matrix_model*vec4(aPosition,1.);}',
   fragmentGLSL:`#define FIELD_KIND ${spec.kind}
#define STEPS ${innerWidth<700?32:48}
varying vec3 exitPoint;uniform vec3 eye;uniform vec3 halfSize;uniform vec3 tint;uniform float time;uniform float gain;uniform float spireSide;

float hash3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float cloud(vec3 p){return noise3(p)*.64+noise3(p*2.07+5.4)*.25+noise3(p*4.13)*.11;}

float field(vec3 p){
 #if FIELD_KIND == 0
  float radial=length(p.xy)-9.36;
  float distanceToRing=length(vec2(radial,p.z*.86));
  if(distanceToRing>3.0)return 0.;
  float angle=atan(p.y,p.x);
  vec3 drift=vec3(p.xy*.88,p.z*.95)+vec3(sin(angle*3.+time*.13)*.5,-time*.19,time*.10);
  float n=cloud(drift);
  float width=.62+.55*(.5+.5*sin(angle*5.+time*.12));
  return exp(-distanceToRing*distanceToRing/(width*width))*smoothstep(.18,.76,n)*1.5;
 #elif FIELD_KIND == 1
  float y=p.y+halfSize.y;
  vec2 offset=vec2(sin(y*.47+time*.26),cos(y*.31-time*.19))*.48*smoothstep(0.,6.,y);
  float r=length(p.xz-offset);
  if(r>2.8)return 0.;
  float n=cloud(vec3(p.x*2.2,y*1.05-time*.44,p.z*2.2));
  float w=1.0+.38*sin(y*.62+time*.18);
  float filament=exp(-pow((r-.85-.35*sin(y*.8-time*.22))/.48,2.));
  return (exp(-r*r/(w*w))*.72+filament*.35)*smoothstep(.25,.72,n)*smoothstep(0.,2.,y)*(1.-smoothstep(34.,38.,y))*1.65;
 #elif FIELD_KIND == 2
  float y=p.y+13.2;
  float axis=spireSide*(1.8-y*.165);
  float sway=sin(y*.90-time*.48+spireSide)*.35+sin(y*1.73-time*.32)*.16;
  float w=.40+y*.021;
  float a=exp(-pow((p.x-axis-sway)/w,2.)-pow((p.z-.05)/1.12,2.));
  float b=exp(-pow((p.x-axis+spireSide*.85+sway*.6)/(w*.65),2.)-pow((p.z+.65)/.8,2.));
  float n=cloud(vec3(p.x*2.1,y*1.22-time*.62,p.z*1.6));
  return (a+b*.55)*smoothstep(.24,.73,n)*smoothstep(0.,2.,y)*(1.-smoothstep(22.8,26.4,y));
 #else
  float edge=1.-smoothstep(.55,1.,length(p.xz/vec2(25.,16.)));
  float n=cloud(vec3(p.x*.24-time*.07,p.y*.65,p.z*.24+time*.055));
  float height=p.y+.25+sin(p.x*.24+time*.12)*.45;
  return edge*exp(-height*height/3.4)*smoothstep(.23,.7,n)*1.4;
 #endif
}
void main(){
 vec3 direction=normalize(exitPoint-eye),safeDirection=sign(direction+vec3(1e-7))*max(abs(direction),vec3(1e-5));
 vec3 a=(-vec3(1.)-eye)/safeDirection,b=(vec3(1.)-eye)/safeDirection;
 vec3 lo=min(a,b),hi=max(a,b);
 float start=max(0.,max(lo.x,max(lo.y,lo.z))),end=min(hi.x,min(hi.y,hi.z));
 if(end<=start)discard;
 float dt=(end-start)/float(STEPS),worldStep=length(direction*halfSize)*dt,transmission=1.;
 vec3 accumulated=vec3(0.);
 for(int i=0;i<STEPS;i++){
  vec3 q=eye+direction*(start+(float(i)+.5)*dt);
  vec3 boundary=vec3(1.)-smoothstep(vec3(.62),vec3(1.),abs(q));
  float edge=boundary.x*boundary.y*boundary.z;
  float density=field(q*halfSize)*edge;
  float alpha=1.-exp(-density*gain*worldStep);
  accumulated+=transmission*alpha*tint;transmission*=1.-alpha;
  if(transmission<.035)break;
 }
 float opacity=1.-transmission;if(opacity<.002)discard;
 gl_FragColor=vec4(accumulated/max(opacity,.001),opacity);
}`});
  material.blendType=pc.BLEND_NORMAL;material.depthWrite=false;material.depthTest=spec.kind!==1;material.cull=pc.CULLFACE_FRONT;
  material.setParameter('halfSize',spec.half);material.setParameter('tint',spec.color);material.setParameter('gain',spec.gain);material.setParameter('spireSide',spec.side||0);
  const entity=new pc.Entity(spec.name);entity.addComponent('render',{meshInstances:[new pc.MeshInstance(pc.Mesh.fromGeometry(device,new pc.BoxGeometry()),material)],...(layer===undefined?{}:{layers:[layer]})});parent.addChild(entity);entity.setLocalPosition(...spec.center);entity.setLocalScale(...spec.half.map(v=>v*2));
  entries.push({entity,material,inverse:new pc.Mat4(),eye:new pc.Vec3()});
 }
 return {update(time){for(const e of entries){e.inverse.copy(e.entity.getWorldTransform()).invert();e.inverse.transformPoint(camera.getPosition(),e.eye);e.material.setParameter('eye',[e.eye.x*2,e.eye.y*2,e.eye.z*2]);e.material.setParameter('time',time);}}};
}


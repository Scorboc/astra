import * as T from 'three';

// Bounded 3D density, integrated along the camera ray. No image planes or
// full-screen smoke overlay: the field has a real position and depth.
export const VOLUME_LAYOUT=Object.freeze([
 {name:'coral-ring-fog',kind:0,center:[0,11.5,-5.3],half:[12.7,12.7,3.0],color:[2.3,.035,.13],gain:.28},
 {name:'emerald-beam-fog',kind:1,center:[0,21,-.8],half:[3.2,19,3.2],color:[.025,1.9,.60],gain:.24},
 {name:'left-spire-steam',kind:2,center:[-12.7,12.2,1.5],half:[4.2,13.2,2.8],color:[.60,.78,.95],gain:.09,side:-1},
 {name:'right-spire-steam',kind:2,center:[12.7,12.2,1.5],half:[4.2,13.2,2.8],color:[.60,.78,.95],gain:.09,side:1},
 {name:'illuminated-foundation-mist',kind:3,center:[0,-1.9,4],half:[25,3.8,16],color:[.62,.80,1.02],gain:.17},
]);

const noise=`
float hash3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float cloud(vec3 p){return noise3(p)*.64+noise3(p*2.07+5.4)*.25+noise3(p*4.13)*.11;}
`;

export function addEnergyVolumes(parent,{mobile=false,volumeParent=parent,layout=VOLUME_LAYOUT}={}){
 const materials=[],cores=[];
 const sharedTime={value:0};
 const geometry=new T.BoxGeometry(2,2,2);
 for(const spec of layout){
  const mat=new T.ShaderMaterial({
   transparent:true,depthWrite:false,depthTest:false,side:T.BackSide,
   uniforms:{time:sharedTime,eye:{value:new T.Vector3()},halfSize:{value:new T.Vector3(...spec.half)},tint:{value:new T.Color(...spec.color)},scatterTint:{value:new T.Vector3(...(spec.scatter||[1,.8,.52]))},gain:{value:spec.gain},spireSide:{value:spec.side||0},sceneDepth:{value:null},fogResolution:{value:new T.Vector2(1,1)},nearFar:{value:new T.Vector2(.15,220)}},
   defines:{FIELD_KIND:spec.kind,STEPS:mobile?16:24},
   vertexShader:`varying vec3 exitPoint;void main(){exitPoint=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
   fragmentShader:`varying vec3 exitPoint;uniform mat4 modelViewMatrix;uniform sampler2D sceneDepth;uniform vec2 fogResolution,nearFar;uniform vec3 eye,halfSize,tint,scatterTint;uniform float time,gain,spireSide;${noise}
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
  float y=p.y+19.;
  vec2 offset=vec2(sin(y*.47+time*.26),cos(y*.31-time*.19))*.48;
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
 vec3 direction=normalize(exitPoint-eye);
 vec3 safeDirection=sign(direction+vec3(1e-7))*max(abs(direction),vec3(1e-5));
 vec3 a=(-vec3(1.)-eye)/safeDirection,b=(vec3(1.)-eye)/safeDirection;
 vec3 nearBound=min(a,b),farBound=max(a,b);
 float start=max(0.,max(nearBound.x,max(nearBound.y,nearBound.z)));
 float end=min(farBound.x,min(farBound.y,farBound.z));
 float depth=texture2D(sceneDepth,gl_FragCoord.xy/fogResolution).x;
 float surfaceDistance=nearFar.x*nearFar.y/(nearFar.y-depth*(nearFar.y-nearFar.x));
 vec3 viewDirection=(modelViewMatrix*vec4(direction,0.)).xyz;
 end=min(end,surfaceDistance/max(-viewDirection.z,.0001));
 if(end<=start)discard;
 float dt=(end-start)/float(STEPS),worldStep=length(direction*halfSize)*dt;
 float jitter=hash3(vec3(floor(gl_FragCoord.xy),2.73));
 float transmission=1.;vec3 accumulated=vec3(0.);
 for(int i=0;i<STEPS;i++){
  vec3 q=eye+direction*(start+(float(i)+.25+.5*jitter)*dt);
  float boundary=1.-smoothstep(.85,1.,max(abs(q.x),max(abs(q.y),abs(q.z))));
  float density=field(q*halfSize)*boundary;
  float alpha=1.-exp(-density*gain*worldStep);
  vec3 light=tint;
  #if FIELD_KIND == 1
   light*=.48+.75*exp(-length((q*halfSize).xz)*.65);
  #elif FIELD_KIND == 3
   vec3 toSource=q*halfSize-vec3(0.,.9,-1.);
   float illumination=2.0/(1.+dot(toSource,toSource)*.035);
   light=tint*.42+scatterTint*illumination;
  #endif
  accumulated+=transmission*alpha*light;
  transmission*=1.-alpha;
  if(transmission<.035)break;
 }
 float opacity=1.-transmission;if(opacity<.002)discard;
 gl_FragColor=vec4(accumulated/max(opacity,.001),opacity);
}`,
  });
  const mesh=new T.Mesh(geometry,mat);mesh.name=spec.name;
  mesh.position.set(...spec.center);mesh.scale.set(...spec.half);mesh.renderOrder=3;
  // The reflected camera must get its own origin too, not the main camera's.
  mesh.onBeforeRender=(_renderer,_scene,camera)=>{
   camera.getWorldPosition(mat.uniforms.eye.value);mesh.worldToLocal(mat.uniforms.eye.value);
  };
  volumeParent.add(mesh);materials.push(mat);
 }
 // Solid luminous cores retain depth when viewed from the side.
 for(const r of [9.30,9.42]){
  const core=new T.Mesh(new T.TorusGeometry(r,.023,5,192),new T.MeshBasicMaterial({color:new T.Color(3.5,.22,.26)}));
  core.position.set(0,11.5,-5.3);parent.add(core);cores.push(core);
 }
 const beamCore=new T.Mesh(new T.CylinderGeometry(.028,.048,38,10),new T.MeshBasicMaterial({color:new T.Color(.55,3.5,1.6)}));
 beamCore.position.set(0,23,-.8);parent.add(beamCore);cores.push(beamCore);
 const filaments=[];
 for(let strand=0;strand<3;strand++){
  const points=[];
  for(let i=0;i<=160;i++){
   const y=4+i/160*38,angle=y*.84+strand*2.094;
   const radius=.12+.14*(.5+.5*Math.sin(y*.51+strand));
   points.push(new T.Vector3(Math.cos(angle)*radius,y,-.8+Math.sin(angle)*radius));
  }
  const thread=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),160,.012,3,false),new T.MeshBasicMaterial({color:new T.Color(.15,2.9,.95)}));
  parent.add(thread);filaments.push(thread);
 }
 const foundationLight=new T.PointLight(0xffd6a0,85,22,2);
 foundationLight.name='under-observatory-light';foundationLight.position.set(0,-1,3);parent.add(foundationLight);
 return {setTime(value){sharedTime.value=value;for(let i=0;i<filaments.length;i++)filaments[i].rotation.y=Math.sin(value*.16+i)*.10;},materials,cores,count:VOLUME_LAYOUT.length};
}

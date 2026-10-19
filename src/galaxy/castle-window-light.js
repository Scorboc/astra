import {CULLFACE_BACK} from 'playcanvas';

// Local facade apertures, all ABOVE the existing mirror. No cloud under the castle.
export const WINDOW_LIGHT_SOURCES=Object.freeze([
  {name:'Nave',position:[0,8.5,8.2],size:[18,16,14],strength:1.6},
  {name:'Left dome',position:[-9.5,4.8,6.8],size:[12.8,9,12],strength:1.05},
  {name:'Right dome',position:[9.5,4.8,6.8],size:[12.8,9,12],strength:1.05},
  {name:'Left outer',position:[-16.5,3.8,5.4],size:[8.8,6.8,9.6],strength:.8},
  {name:'Right outer',position:[16.5,3.8,5.4],size:[8.8,6.8,9.6],strength:.8},
].map(s=>Object.freeze({...s,position:Object.freeze(s.position),size:Object.freeze(s.size)})));
export const WINDOW_LIGHT_FIELD=Object.freeze([.28,.14,.40]);
export const WINDOW_LIGHT_COLOR=Object.freeze([1,.92,.76]);
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// Noise-free envelope, shared with tests of the soft bounds and forward falloff.
export function windowLightField(x,y,z){
  if(![x,y,z].every(Number.isFinite)||Math.max(Math.abs(x),Math.abs(y),Math.abs(z))>=.5)return 0;
  const depth=z+.5,spread=WINDOW_LIGHT_FIELD[0]+WINDOW_LIGHT_FIELD[1]*depth;
  const rx=x/spread,ry=y/WINDOW_LIGHT_FIELD[2];
  const veil=Math.exp(-1.8*rx**2-1.4*ry**2)*(1-smooth(.14,1,depth));
  const core=Math.exp(-9*rx**2-7*ry**2-32*(depth-.30)**2);
  return (.72*veil+.28*core)*(1-smooth(.32,.5,Math.abs(x)))*(1-smooth(.32,.5,Math.abs(y)))*
    smooth(0,.08,depth)*(1-smooth(.76,1,depth));
}

export function windowLightShader(compact){
  const steps=compact?8:12;
  return `varying vec3 world;uniform mat4 inverseModel;uniform vec3 view_position;
uniform sampler2D densityMap;uniform float time;uniform float strength;uniform vec3 tint;uniform vec3 fieldShape;
void main(){
 vec3 ro=(inverseModel*vec4(view_position,1.)).xyz,hit=(inverseModel*vec4(world,1.)).xyz;
 vec3 rd=normalize(hit-ro),safe=mix(vec3(-1.),vec3(1.),step(vec3(0.),rd))*max(abs(rd),vec3(.00001));
 vec3 a=(-.5-ro)/safe,b=(.5-ro)/safe,lo=min(a,b),hi=max(a,b);
 float start=max(max(lo.x,lo.y),max(lo.z,0.)),stop=min(min(hi.x,hi.y),hi.z);if(stop<=start)discard;
 float stepSize=(stop-start)/${steps}.0,sum=0.,coreSum=0.;
 for(int i=0;i<${steps};i++){
  vec3 p=ro+rd*(start+(float(i)+.5)*stepSize);float depth=p.z+.5,spread=fieldShape.x+fieldShape.y*depth;
  vec2 radial=vec2(p.x/spread,p.y/fieldShape.z);
  float veil=exp(-1.8*radial.x*radial.x-1.4*radial.y*radial.y)*(1.-smoothstep(.14,1.,depth));
  float sourceDepth=depth-.30;float core=exp(-9.*radial.x*radial.x-7.*radial.y*radial.y-32.*sourceDepth*sourceDepth);
  float edge=(1.-smoothstep(.32,.5,abs(p.x)))*(1.-smoothstep(.32,.5,abs(p.y)));
  float fade=smoothstep(0.,.08,depth)*(1.-smoothstep(.76,1.,depth));
  float grain=texture2D(densityMap,p.xy*2.1+vec2(p.z*.6+time*.012,-time*.008)).g;
  float weight=edge*fade*(.55+.45*grain)*stepSize;
  sum+=(.72*veil+.28*core)*weight;coreSum+=core*weight;
 }
 float alpha=1.-exp(-sum*strength),coreShare=clamp(coreSum/max(sum,.0001),0.,1.);
 vec3 light=mix(tint,vec3(1.,.99,.95),coreShare)*(1.6+2.4*coreShare);
 gl_FragColor=vec4(light,alpha);
}`;
}

export function createCastleWindowLight(pc,device,parent,layer,grain,compact){
  const geometry=pc.Mesh.fromGeometry(device,new pc.BoxGeometry()),items=[],inverse=new pc.Mat4();
  for(const source of WINDOW_LIGHT_SOURCES){
    const material=new pc.ShaderMaterial({uniqueName:'astra-window-scatter-'+(compact?'8':'12'),attributes:{aPosition:pc.SEMANTIC_POSITION},
      vertexGLSL:'attribute vec3 aPosition;uniform mat4 matrix_model;uniform mat4 matrix_viewProjection;varying vec3 world;void main(){vec4 p=matrix_model*vec4(aPosition,1.);world=p.xyz;gl_Position=matrix_viewProjection*p;}',
      fragmentGLSL:windowLightShader(compact)});
    material.blendType=pc.BLEND_ADDITIVEALPHA;material.depthWrite=false;material.depthTest=true;material.cull=CULLFACE_BACK;
    material.setParameter('densityMap',grain);material.setParameter('fieldShape',[...WINDOW_LIGHT_FIELD]);material.setParameter('tint',[...WINDOW_LIGHT_COLOR]);material.setParameter('strength',source.strength);material.setParameter('time',0);
    const entity=new pc.Entity('Window light '+source.name);entity.addComponent('render',{meshInstances:[new pc.MeshInstance(geometry,material)],layers:[layer]});parent.addChild(entity);
    entity.setLocalPosition(...source.position);entity.setLocalScale(...source.size);items.push({entity,material});
  }
  return {count:items.length,update(time,visible){for(const {entity,material} of items){entity.enabled=visible;if(!visible)continue;
    inverse.copy(entity.getWorldTransform()).invert();material.setParameter('inverseModel',inverse.data.slice());material.setParameter('time',time);
  }}};
}

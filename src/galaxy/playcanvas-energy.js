// The same nine turbulent filaments as the approved Three.js prototype.
export function addEnergyRing(pc,device,parent,layer){
 const material=new pc.ShaderMaterial({uniqueName:'astra-energy-filaments',attributes:{aPosition:pc.SEMANTIC_POSITION,aUv:pc.SEMANTIC_TEXCOORD0},vertexGLSL:'attribute vec3 aPosition;attribute vec2 aUv;uniform mat4 matrix_model;uniform mat4 matrix_viewProjection;varying vec2 vUv;void main(){vUv=aUv;gl_Position=matrix_viewProjection*matrix_model*vec4(aPosition,1.);}',fragmentGLSL:`varying vec2 vUv;uniform float time;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return noise(p)*.57+noise(p*2.03)*.28+noise(p*4.09)*.15;}
void main(){vec2 p=(vUv-.5)*2.;float a=atan(p.y,p.x),r=length(p);float turbulence=fbm(vec3(p*26.,time*.22));float d=abs(r-.78);float core=0.;for(int i=0;i<9;i++){float f=float(i);float offset=(f-4.)*.007+.007*sin(a*(5.+f*3.)+f*11.+time*(.15+f*.02))+.004*sin(a*63.+f*4.-time*.5);float filament=exp(-abs(r-.78-offset)*(370.+f*19.));float arc=.35+.65*pow(.5+.5*sin(a*(2.+f)+f*3.+time*.2),2.);core+=filament*arc;}float dust=pow(turbulence,5.)*exp(-d*15.)*2.2;float wisps=exp(-d*33.)*turbulence*.26;float halo=exp(-d*30.)*.08;float alpha=(core*.54+dust+wisps+halo)*(1.-smoothstep(.92,1.,r));vec3 col=mix(vec3(1.,.016,.08),vec3(1.,.57,.29),clamp(core*.55,0.,1.));gl_FragColor=vec4(col*3.7,alpha);}`});
 material.blendType=pc.BLEND_ADDITIVEALPHA;material.depthWrite=false;material.cull=pc.CULLFACE_NONE;material.setParameter('time',0);
 const geometry=new pc.Mesh(device);geometry.setPositions([-12,-12,0,12,-12,0,12,12,0,-12,12,0]);geometry.setUvs(0,[0,0,1,0,1,1,0,1]);geometry.setIndices([0,1,2,0,2,3]);geometry.update();
 const entity=new pc.Entity('Coral energy filaments');entity.addComponent('render',{meshInstances:[new pc.MeshInstance(geometry,material)],layers:[layer]});parent.addChild(entity);entity.setLocalPosition(0,11.5,-5.3);
 return {update(time){material.setParameter('time',time);}};
}

import * as T from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

/** Spherical volume raymarch; technique reference: three.js webgl_volume_cloud.
 * Density is a 3D field, with Beer-Lambert extinction and short sun marches.
 * No flat cloud billboard and no baked light in the surface atlas.
 */
export function originAtmosphere(radius:number,mobile:boolean){
  const size=64,data=new Uint8Array(size**3),noise=new ImprovedNoise();
  let i=0;
  for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    let n=0;
    for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++){
      const weight=(a?x/size:1-x/size)*(b?y/size:1-y/size)*(c?z/size:1-z/size);
      n+=noise.noise((x-a*size)/9,(y-b*size)/9,(z-c*size)/9)*weight;
    }
    data[i++]=Math.round(T.MathUtils.clamp(.5+n*.7,0,1)*255);
  }
  const volume=new T.Data3DTexture(data,size,size,size);
  volume.format=T.RedFormat;volume.minFilter=volume.magFilter=T.LinearFilter;
  volume.wrapS=volume.wrapT=volume.wrapR=T.RepeatWrapping;volume.unpackAlignment=1;volume.needsUpdate=true;
  const uniforms={uVolume:{value:volume},uEye:{value:new T.Vector3()},uTime:{value:0},uRadius:{value:radius},uSteps:{value:mobile?20:28},uDepth:{value:null as T.Texture|null},uResolution:{value:new T.Vector2(1,1)},uNear:{value:.025},uFar:{value:1800}};
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.FrontSide,uniforms,
    vertexShader:`varying vec3 vPoint;void main(){vPoint=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`precision highp sampler3D;
    uniform sampler3D uVolume;uniform vec3 uEye;uniform float uTime,uRadius,uSteps,uNear,uFar;
    uniform sampler2D uDepth;uniform vec2 uResolution;
    varying vec3 vPoint;
    vec2 sphere(vec3 o,vec3 d,float r){float b=dot(o,d),h=b*b-dot(o,o)+r*r;if(h<0.)return vec2(-1.);h=sqrt(h);return vec2(-b-h,-b+h);}
    float density(vec3 p){
      float h=length(p)-uRadius;
      float layer=smoothstep(.055,.105,h)*(1.-smoothstep(.19,.28,h));
      vec3 q=p*.31+vec3(uTime*.0015,0.,uTime*.0007);
      float n=texture(uVolume,q).r*.76+texture(uVolume,q*3.07+vec3(.21)).r*.24;
      n-=max(0.,texture(uVolume,q*11.13).r-.46)*.16;
      return smoothstep(.53,.66,n)*layer*4.2;
    }
    void main(){
      vec3 ray=normalize(vPoint-uEye);vec2 outer=sphere(uEye,ray,uRadius+.29);
      float start=max(0.,outer.x),end=outer.y;
      float depth=texture2D(uDepth,gl_FragCoord.xy/uResolution).r;
      float viewDepth=2.*uNear*uFar/(uFar+uNear-(depth*2.-1.)*(uFar-uNear));
      end=min(end,viewDepth/max(.001,-(viewMatrix*vec4(ray,0.)).z));
      vec2 solid=sphere(uEye,ray,uRadius+.008);if(solid.x>0.)end=min(end,solid.x);
      if(end<=start)discard;
      float stepSize=(end-start)/uSteps;
      float jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
      vec3 sun=normalize(vec3(-.5,.85,.35)),sum=vec3(0.);float trans=1.;
      for(int i=0;i<28;i++){
        if(float(i)>=uSteps||trans<.025)break;
        vec3 p=uEye+ray*(start+(float(i)+jitter)*stepSize);
        float d=density(p);if(d<.015)continue;
        float shadow=density(p+sun*.16)*.3+density(p+sun*.43)*.4;
        float daylight=smoothstep(-.18,.38,dot(normalize(p),sun));
        float light=exp(-shadow*2.2)*daylight;
        float hue=smoothstep(.38,.62,texture(uVolume,p*.12+vec3(.53,.15,.71)).r);
        vec3 shade=mix(vec3(.045,.19,.26),vec3(.19,.10,.29),smoothstep(.42,.68,hue));
        vec3 lit=mix(vec3(.95,.57,.32),vec3(.29,.77,.86),smoothstep(.32,.72,hue));
        float silver=pow(max(0.,dot(ray,sun)),8.)*.22;
        vec3 radiance=shade*.65+lit*(light*.82+silver*daylight);
        float alpha=1.-exp(-d*stepSize*3.);
        sum+=trans*alpha*radiance;trans*=1.-alpha;
      }
      float a=1.-trans;if(a<.003)discard;gl_FragColor=vec4(sum/max(a,.001),a);
    }`});
  const mesh=new T.Mesh(new T.SphereGeometry(radius+.29,96,64),material);
  mesh.renderOrder=3;
  const local=new T.Vector3();
  return {mesh,volume,uniforms,update(camera:T.Camera,time:number){
    mesh.updateWorldMatrix(true,false);camera.getWorldPosition(local);mesh.worldToLocal(local);
    uniforms.uEye.value.copy(local);uniforms.uTime.value=time;
    const side=local.length()<radius+.29?T.BackSide:T.FrontSide;
    if(material.side!==side){material.side=side;material.needsUpdate=true;}
  }};
}

/** Half-resolution volume, full-resolution opaque world, depth-aware occlusion. */
export class OriginCloudPass extends Pass {
  private target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});
  private scene=new T.Scene();
  private proxy:T.Mesh;
  private composite=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{base:{value:null},clouds:{value:this.target.texture}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:'uniform sampler2D base,clouds;varying vec2 vUv;void main(){vec4 b=texture2D(base,vUv),c=texture2D(clouds,vUv);gl_FragColor=vec4(c.rgb+b.rgb*(1.-c.a),b.a);}'});
  private quad=new FullScreenQuad(this.composite);
  constructor(private clouds:ReturnType<typeof originAtmosphere>,private camera:T.PerspectiveCamera){
    super();this.proxy=new T.Mesh(clouds.mesh.geometry,clouds.mesh.material);this.proxy.matrixAutoUpdate=false;this.proxy.frustumCulled=false;this.scene.add(this.proxy);clouds.mesh.visible=false;
  }
  setSize(w:number,h:number){this.target.setSize(Math.max(1,Math.round(w*.5)),Math.max(1,Math.round(h*.5)));this.clouds.uniforms.uResolution.value.set(this.target.width,this.target.height);}
  render(renderer:T.WebGLRenderer,write:T.WebGLRenderTarget,read:T.WebGLRenderTarget){
    this.proxy.matrix.copy(this.clouds.mesh.matrixWorld);this.clouds.uniforms.uDepth.value=read.depthTexture;
    this.clouds.uniforms.uNear.value=this.camera.near;this.clouds.uniforms.uFar.value=this.camera.far;
    const alpha=renderer.getClearAlpha(),color=renderer.getClearColor(new T.Color());
    renderer.setClearColor(0,0);renderer.setRenderTarget(this.target);renderer.clear();renderer.render(this.scene,this.camera);renderer.setClearColor(color,alpha);
    this.composite.uniforms.base.value=read.texture;renderer.setRenderTarget(this.renderToScreen?null:write);this.quad.render(renderer);
  }
  dispose(){this.target.dispose();this.composite.dispose();this.quad.dispose();}
}

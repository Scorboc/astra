import * as T from 'three';
import {Pass,FullScreenQuad} from 'three/addons/postprocessing/Pass.js';

// Soft fog needs fewer pixels than architecture. Reuse opaque scene depth to
// stop the integration at surfaces, then composite BEFORE bloom/tone mapping.
export class EnergyVolumePass extends Pass{
 constructor(scene,camera,materials,{scale=.5}={}){
  super();this.volumeScene=scene;this.camera=camera;this.materials=materials;this.scale=scale;
  this.target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false,stencilBuffer:false});
  this.clearColor=new T.Color();
  this.material=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{base:{value:null},fog:{value:this.target.texture}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'varying vec2 vUv;uniform sampler2D base,fog;void main(){vec4 b=texture2D(base,vUv),f=texture2D(fog,vUv);gl_FragColor=vec4(b.rgb*(1.-f.a)+f.rgb,b.a);}'});
  this.quad=new FullScreenQuad(this.material);
 }
 setSize(width,height){
  const w=Math.max(1,Math.round(width*this.scale)),h=Math.max(1,Math.round(height*this.scale));
  this.target.setSize(w,h);for(const mat of this.materials)mat.uniforms.fogResolution.value.set(w,h);
 }
 render(renderer,writeBuffer,readBuffer){
  for(const mat of this.materials){mat.uniforms.sceneDepth.value=readBuffer.depthTexture;mat.uniforms.nearFar.value.set(this.camera.near,this.camera.far);}
  renderer.getClearColor(this.clearColor);const alpha=renderer.getClearAlpha(),autoClear=renderer.autoClear;
  renderer.autoClear=false;renderer.setRenderTarget(this.target);renderer.setClearColor(0x000000,0);renderer.clear();
  renderer.render(this.volumeScene,this.camera);
  renderer.setClearColor(this.clearColor,alpha);renderer.autoClear=autoClear;
  this.material.uniforms.base.value=readBuffer.texture;
  renderer.setRenderTarget(this.renderToScreen?null:writeBuffer);this.quad.render(renderer);
 }
 dispose(){this.target.dispose();this.material.dispose();this.quad.dispose();}
}

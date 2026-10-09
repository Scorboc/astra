// Preserve the original shared stone image and triplanar mapping (no UV seams).
export function applyCoastMaterials(pc,coast,stone){
 const inverse=new pc.Mat4().copy(coast.getWorldTransform()).invert();
 for(const render of coast.findComponents('render'))for(const instance of render.meshInstances){
  if(!instance.material.name.startsWith('Limestone'))continue;
  const material=instance.material.clone();material.diffuse=new pc.Color(.479,.546,.503);material.metalness=.05;material.gloss=.05;
  material.shaderChunks.glsl.set('diffusePS',`uniform vec3 material_diffuse;uniform sampler2D astraStone;uniform mat4 astraStoneSpace;
void getAlbedo(){vec3 p=(astraStoneSpace*vec4(vPositionW,1.)).xyz;vec3 normal=normalize(cross(dFdx(p),dFdy(p)));vec3 blend=pow(abs(normal),vec3(4.));blend/=max(.001,blend.x+blend.y+blend.z);vec3 rock=pow(texture2D(astraStone,p.yz*.42).rgb,vec3(2.2))*blend.x+pow(texture2D(astraStone,p.xz*.42).rgb,vec3(2.2))*blend.y+pow(texture2D(astraStone,p.xy*.42).rgb,vec3(2.2))*blend.z;dAlbedo=material_diffuse*rock*1.5;}`);
  material.setParameter('astraStone',stone);material.setParameter('astraStoneSpace',inverse.data);material.update();instance.material=material;
 }
}

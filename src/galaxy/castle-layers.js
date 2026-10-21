import {Layer,LAYERID_WORLD,LAYERID_UI,BLEND_NONE} from 'playcanvas';

export function createCastleLayers(composition){
  const world=composition.getLayerById(LAYERID_WORLD),ui=composition.getLayerById(LAYERID_UI);
  if(!world||!ui||composition.getTransparentIndex(world)<0||composition.getTransparentIndex(ui)<0)throw new Error('Castle needs world depth and the presentation-pass boundary');
  const depth=new Layer({name:'ASTRA castle world depth',clearColorBuffer:false,clearDepthBuffer:true,clearStencilBuffer:false});
  composition.pushOpaque(depth);
  const layers=['architecture','plasma','mirror'].map(name=>new Layer({name:'ASTRA castle '+name,clearColorBuffer:false,clearDepthBuffer:false,clearStencilBuffer:false}));
  // Keep the approved castle presentation outside the galaxy bloom. CameraFrame
  // does not carry HDR depth to this target, so replay ONLY opaque world depth
  // here, with every color channel disabled, before the unchanged castle draws.
  for(const layer of layers)composition.push(layer);
  return [depth,...layers];
}

export function createCastleDepthOccluders(pc,world,depthLayer){
  const material=new pc.StandardMaterial();material.name='ASTRA world depth only';material.useLighting=false;
  material.redWrite=false;material.greenWrite=false;material.blueWrite=false;material.alphaWrite=false;
  material.depthTest=true;material.depthWrite=true;material.blendType=BLEND_NONE;material.update();
  const copies=new Map();
  function remove(source,copy){depthLayer.removeMeshInstances([copy],true);copy.destroy();copies.delete(source);}
  return {get count(){return copies.size;},update(visible){
    depthLayer.enabled=visible;if(!visible)return;
    const active=new Set();
    for(const source of world.meshInstances){
      // All five planets and the instanced asteroid stream are rigid opaque
      // StandardMaterials. Exclude fog, and position-only shader stars.
      if(!(source.material instanceof pc.StandardMaterial)||!source.material.depthWrite||source.material.blendType!==BLEND_NONE||source.skinInstance||source.morphInstance||source.material.alphaTest>0)continue;
      active.add(source);let copy=copies.get(source);
      if(!copy){copy=new pc.MeshInstance(source.mesh,material,source.node);copy.castShadow=false;copy.receiveShadow=false;copies.set(source,copy);depthLayer.addMeshInstances([copy],true);}
      const buffer=source.instancingData?.vertexBuffer;
      if(buffer!==copy.instancingData?.vertexBuffer)copy.setInstancing(buffer??null,source.cull);
      if(buffer)copy.instancingCount=source.instancingCount;
      copy.visible=source.visible;copy.cull=source.cull;
    }
    for(const [source,copy] of copies)if(!active.has(source))remove(source,copy);
  },destroy(){for(const [source,copy] of copies)remove(source,copy);material.destroy();}};
}

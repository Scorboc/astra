// Translate the approved shared material parameters; do not invent new colours.
export function applyPlanetFinish(material,theme){
 material.useMetalness=true;
 material.metalness=theme.metalness;
 material.gloss=1-theme.roughness;
 material.clearCoat=theme.clearcoat;
 material.clearCoatGloss=1-theme.clearcoatRoughness;
 material.update();
 return material;
}

// Reuse the surface map as a lightweight material mask: blue water/ice reflects,
// while red-rich bronze/ceramic structures retain their metallic response.
export function applyDetailedPlanetFinish(material,id,texture){
 material.clearCoatMap=texture;
 material.clearCoatMapChannel='b';
 if(id!=='aurora'){
  material.metalnessMap=texture;
  material.metalnessMapChannel='r';
 }
 if(id==='solis'){
  material.emissiveMap=texture;
  material.emissive.set(1,1,1);
  material.emissiveIntensity=.28;
 }
 material.update();
 return material;
}

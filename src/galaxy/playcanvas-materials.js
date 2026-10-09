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

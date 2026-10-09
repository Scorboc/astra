// Start every preview now, not when its world approaches the camera.
// Keep failures explicit; the caller can show a non-white fallback and retry.
export async function preloadPlanetPreviews(worlds, loadPlanet) {
 return Promise.all(worlds.map(async world => {
  try { await loadPlanet(world); return {id:world.id,ok:true}; }
  catch(error) { return {id:world.id,ok:false,error}; }
 }));
}

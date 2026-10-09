import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {writeFile} from 'node:fs/promises';

// Local, synthetic asset. No project imagery or personal data is uploaded.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend?.();});}
};

const dark=new T.MeshStandardMaterial({color:0x101b2c,metalness:.8,roughness:.27});
const gold=new T.MeshStandardMaterial({color:0xb89a62,metalness:.8,roughness:.25});
const lens=new T.MeshStandardMaterial({color:0x72c1e0,metalness:.85,roughness:.08,emissive:0x143a63,emissiveIntensity:.6});
const telescope=new T.Group();telescope.name='ASTRA telescope / local optimized prototype';
function part(geometry,material,parent=telescope,x=0,y=0,z=0){const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
part(new T.CylinderGeometry(.8,.8,.14,24),dark,telescope,0,.39);
part(new T.CylinderGeometry(.16,.28,1.65,16),gold,telescope,0,1.23);
const tube=new T.Group();tube.position.set(0,2.2,0);tube.rotation.x=-.85;telescope.add(tube);
part(new T.CylinderGeometry(.35,.45,2.7,24),dark,tube,0,.6);
for(const y of [-.68,.2,1.8])part(new T.CylinderGeometry(.47,.47,.12,24),gold,tube,0,y);
part(new T.CircleGeometry(.33,24),lens,tube,0,1.965).rotation.x=-Math.PI/2;
const bytes=await new GLTFExporter().parseAsync(telescope,{binary:true,onlyVisible:true});
const path=new URL('./telescope-optimized.glb',import.meta.url);
await writeFile(path,Buffer.from(bytes));
console.log(`Wrote ${path.pathname}: ${bytes.byteLength} bytes`);

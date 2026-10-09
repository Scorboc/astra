import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('origin benchmark: portable geometry asset, shared rubble, bounded download',()=>{
  const bytes=readFileSync(new URL('../public/benchmark-origin/coast.glb',import.meta.url));
  assert.equal(bytes.readUInt32LE(0),0x46546c67);
  assert.equal(bytes.readUInt32LE(4),2);
  assert.equal(bytes.readUInt32LE(8),bytes.length);
  assert.ok(bytes.length<2_000_000,'Landing asset must remain under 2 MB');
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  assert.ok(gltf.meshes.length>10);
  assert.ok(gltf.nodes.some((n:{name?:string})=>n.name?.includes('Description cliff')));
  assert.ok(gltf.nodes.some((n:{name?:string})=>n.name?.includes('Turquoise tide pool')));
  const instances=new Map<number,number>();
  for(const node of gltf.nodes)if(node.mesh!==undefined)instances.set(node.mesh,(instances.get(node.mesh)??0)+1);
  assert.ok([...instances.values()].some(n=>n>=80),'Shore rubble must share geometry');
  assert.ok(gltf.materials.every((m:{pbrMetallicRoughness?:unknown})=>m.pbrMetallicRoughness));
  assert.ok(!(gltf.images?.length),'No remote texture dependencies');
});

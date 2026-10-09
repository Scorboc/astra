import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore renderer helper is a plain JavaScript module.
import {preloadPlanetPreviews} from '../src/galaxy/planet-preload.js';
test('all planet previews begin before any download completes, including the last world',async()=>{
 const worlds=['origin','aurora','velir','nereya','solis'].map(id=>({id}));
 const started:string[]=[];const finish:Array<()=>void>=[];
 const pending=preloadPlanetPreviews(worlds,(w:{id:string})=>{started.push(w.id);return new Promise<void>(resolve=>finish.push(resolve));});
 assert.deepEqual(started,worlds.map(w=>w.id));
 finish.forEach(resolve=>resolve());
 assert.deepEqual(await pending,worlds.map(w=>({id:w.id,ok:true})));
});
test('a failed texture does not cancel other previews or silently count as ready',async()=>{
 const failure=new Error('texture unavailable');
 const result=await preloadPlanetPreviews([{id:'origin'},{id:'solis'}],async(w:{id:string})=>{if(w.id==='solis')throw failure;});
 assert.deepEqual(result,[{id:'origin',ok:true},{id:'solis',ok:false,error:failure}]);
});

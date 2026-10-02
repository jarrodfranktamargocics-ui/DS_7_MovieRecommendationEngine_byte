import fs from 'node:fs';
import assert from 'node:assert/strict';
import {rank,foldIn} from './web/engine.js';
const model=JSON.parse(fs.readFileSync(new URL('./web/model.json',import.meta.url),'utf8'));
for(const user of model.users){
 const rows=rank(model,user,new Set(user.seen));assert.equal(rows.length,5);
 assert.equal(new Set(rows.map(x=>x.id)).size,5);
 rows.forEach((r,i)=>{assert.equal(r.id,user.recommendations[i].movieId);assert.ok(Math.abs(r.score-user.recommendations[i].score)<1e-5);assert.ok(!user.seen.includes(r.index));});
}
const fixture=JSON.parse(fs.readFileSync(new URL('./outputs/onboarding_fixture.json',import.meta.url),'utf8'));
const ratings=new Map(fixture.ratings),profile=foldIn(model,ratings);
assert.ok(Math.abs(profile.bias-fixture.bias)<1e-7);
profile.factors.forEach((v,i)=>assert.ok(Math.abs(v-fixture.factors[i])<1e-7));
const result=rank(model,profile,new Set(ratings.keys()));assert.equal(result.length,5);result.forEach(r=>assert.ok(!ratings.has(r.index)));
assert.throws(()=>foldIn(model,new Map()),/three/);
console.log('Passed: three user top-five rankings match Python, onboarding matches NumPy ridge solution, and rated films are excluded.');

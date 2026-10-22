import fs from 'node:fs';
import assert from 'node:assert/strict';
import {foldIn,rank} from './web/engine.js';
const model=JSON.parse(fs.readFileSync('web/model.json','utf8'));
model.neighbors=JSON.parse(fs.readFileSync('web/neighbors.json','utf8')).neighbors;
const byId=new Map(model.catalog.map((m,i)=>[m.id,i]));
function recommend(ids,values){const ratings=new Map(ids.map((id,k)=>[byId.get(id),values[k]]));const results=rank(model,foldIn(model,ratings),new Set(ratings.keys()));assert.equal(results.length,5);assert.equal(new Set(results.map(x=>x.id)).size,5);results.forEach(r=>{assert.ok(!ids.includes(r.id));assert.ok(Number.isFinite(r.rankingScore));});return results;}
const action=recommend([2571,589,1200],[5,5,5]);
const family=recommend([1,6377,4886],[5,5,5]);
const dislike=recommend([2571,589,1200],[1,1,1]);
assert.notDeepEqual(action.map(m=>m.id),family.map(m=>m.id),'Different seed tastes must change the shortlist');
assert.notDeepEqual(action.map(m=>m.id),dislike.map(m=>m.id),'Changing likes to dislikes must change the shortlist');
assert.ok(action.filter(m=>family.some(n=>n.id===m.id)).length<=2,'Contrasting tastes should not return nearly identical lists');
for(const [name,rows] of Object.entries({action,family,dislike}))console.log(name,rows.map(m=>({title:m.title,audience:m.mean,reason:m.reason})));
console.log('Passed contrasting tastes, rating inversion, seen exclusions, unique finite recommendations. These are functional checks, not quality metrics.');
const seeds=new Map([1,6377,4886].map(id=>[byId.get(id),5])),profile=foldIn(model,seeds),seen=new Set(seeds.keys());
const filtered=rank(model,profile,seen,{animation:'only',yearFrom:2000,yearTo:2010,excludeGenre:'Horror'});
assert.ok(filtered.length>0);
for(const movie of filtered){assert.ok(movie.genres.split('|').includes('Animation'));assert.ok(!movie.genres.split('|').includes('Horror'));const year=Number(movie.title.match(/\((\d{4})\)\s*$/)[1]);assert.ok(year>=2000&&year<=2010);}
assert.equal(rank(model,profile,seen,{genre:'Animation',animation:'exclude'}).length,0);
assert.throws(()=>rank(model,profile,seen,{yearFrom:2020,yearTo:1990}),/start year/);
const plain=rank(model,profile,seen,{mode:'collaborative'}),genre=rank(model,profile,seen,{mode:'genre'});
assert.ok(plain.every(m=>!m.reason.includes('Shares ')));
assert.ok(genre.some(m=>m.reason.includes('Shares ')));
assert.notEqual(plain[0].rankingScore,genre.find(m=>m.id===plain[0].id)?.rankingScore);
console.log('Passed animation, exclusion, year bounds, conflicting filters, invalid year range, and genre contribution checks.');

export function rank(model,profile,seen,options={}){
 if(options.yearFrom&&options.yearTo&&Number(options.yearFrom)>Number(options.yearTo))throw Error('The start year must be before the end year.');
 const genres=m=>m.genres.split('|').filter(g=>g!=='(no genres listed)');
 const results=model.catalog.map((movie,index)=>{
  const raw=model.mean+profile.bias+movie.bias+movie.factors.reduce((s,x,k)=>s+x*profile.factors[k],0);
  const score=Math.max(.5,Math.min(5,raw));
  const rankingScore=model.ranking?raw+model.ranking.support_weight*Math.log1p(movie.count):score;
  return {index,...movie,score,rankingScore};
 }).filter(m=>m.eligible&&!seen.has(m.index));
 if(profile.ratings&&model.neighbors){
  // Cold start: direct collaborative neighbours preserve the visitor's stated taste.
  // Do not use the known-user popularity bonus in this sparse-profile mode.
  const affinities=new Map(),reasons=new Map();let evidence=0,likes=0;
  for(const [seed,rating] of profile.ratings){
   const preference=rating-3;evidence+=Math.abs(preference);if(preference>0)likes++;
   for(const [index,similarity] of model.neighbors[String(seed)]||[]){
    const contribution=preference*similarity;
    affinities.set(index,(affinities.get(index)||0)+contribution);
    if(contribution>0&&(!reasons.has(index)||contribution>reasons.get(index).strength))reasons.set(index,{strength:contribution,seed});
   }
  }
  if(likes>0){
   for(const movie of results){
    const personal=movie.factors.reduce((sum,x,k)=>sum+x*profile.factors[k],0);
    movie.affinity=(affinities.get(movie.index)||0)/evidence;
    movie.personal=personal;
   }
   // Similarity is the main cold-start signal; MF supplies a smaller personal component.
   const scale=Math.max(1e-8,Math.sqrt(results.reduce((s,m)=>s+m.personal*m.personal,0)/results.length));
   for(const movie of results){movie.rankingScore=movie.affinity+.02*movie.personal/scale;const reason=reasons.get(movie.index);movie.reason=reason?'Related rating patterns to '+model.catalog[reason.seed].title:'Based on your learned taste profile';}
  }else{
   for(const movie of results){movie.rankingScore=(movie.count*movie.mean+25*model.mean)/(movie.count+25)+.1*Math.log1p(movie.count)+(affinities.get(movie.index)||0)/Math.max(evidence,1);movie.reason='Exploratory pick: rate a film you like to guide your taste profile';}
  }
 }
 if(profile.ratings){
  const weight=options.mode==='collaborative'?0:options.mode==='genre'?.2:.08;
  const evidence=profile.ratings.reduce((s,[,rating])=>s+Math.abs(rating-3),0)||1;
  for(const movie of results){
   const target=genres(movie);let affinity=0,best=0,explanation='';
   for(const [seed,rating] of profile.ratings){
    const source=genres(model.catalog[seed]),shared=target.filter(g=>source.includes(g));
    const similarity=shared.length/(new Set([...target,...source]).size||1),contribution=(rating-3)*similarity;
    affinity+=contribution;
    if(contribution>best){best=contribution;explanation='Shares '+shared.join(' / ')+' with '+model.catalog[seed].title;}
   }
   movie.rankingScore+=weight*affinity/evidence;
   if(weight&&affinity>0&&explanation)movie.reason=(movie.reason?movie.reason+'. ':'')+explanation;
  }
 }
 return results.filter(movie=>{
  const tags=genres(movie),year=Number(movie.title.match(/\((\d{4})\)\s*$/)?.[1])||null;
  return (!options.genre||tags.includes(options.genre))&&(!options.excludeGenre||!tags.includes(options.excludeGenre))&&
   (options.animation!=='only'||tags.includes('Animation'))&&(options.animation!=='exclude'||!tags.includes('Animation'))&&
   (!options.yearFrom||(year!==null&&year>=Number(options.yearFrom)))&&(!options.yearTo||(year!==null&&year<=Number(options.yearTo)));
 }).sort((a,b)=>b.rankingScore-a.rankingScore||a.index-b.index).slice(0,5);
}
// Ridge least-squares fold-in: fit only the visitor bias/vector, holding movie factors fixed.
export function foldIn(model,ratings){
 if(ratings.size<3)throw Error('Rate at least three movies first.');
 const size=model.catalog[0].factors.length+1;
 const a=Array.from({length:size},(_,i)=>Array.from({length:size},(_,j)=>i===j?1:0)), b=Array(size).fill(0);
 for(const [index,value] of ratings){
  if(!Number.isInteger(index)||!model.catalog[index]||!Number.isFinite(value)||value<.5||value>5)throw Error('Invalid movie rating');
  const m=model.catalog[index],x=[1,...m.factors],y=value-model.mean-m.bias;
  for(let i=0;i<size;i++){b[i]+=x[i]*y;for(let j=0;j<size;j++)a[i][j]+=x[i]*x[j];}
 }
 for(let k=0;k<size;k++){
  let pivot=k;for(let j=k+1;j<size;j++)if(Math.abs(a[j][k])>Math.abs(a[pivot][k]))pivot=j;
  [a[k],a[pivot]]=[a[pivot],a[k]];[b[k],b[pivot]]=[b[pivot],b[k]];
  const scale=a[k][k];for(let j=k;j<size;j++)a[k][j]/=scale;b[k]/=scale;
  for(let i=0;i<size;i++)if(i!==k){const factor=a[i][k];for(let j=k;j<size;j++)a[i][j]-=factor*a[k][j];b[i]-=factor*b[k];}
 }
 return {bias:b[0],factors:b.slice(1),ratings:[...ratings]};
}

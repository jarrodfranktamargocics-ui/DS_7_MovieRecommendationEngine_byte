export function rank(model,profile,seen){
 return model.catalog.map((movie,index)=>({index,...movie,score:Math.max(.5,Math.min(5,model.mean+profile.bias+movie.bias+movie.factors.reduce((s,x,k)=>s+x*profile.factors[k],0)))})).filter(m=>m.eligible&&!seen.has(m.index)).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,5);
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
 return {bias:b[0],factors:b.slice(1)};
}

import {rank,foldIn} from './engine.js';
const $=id=>document.getElementById(id),ratings=new Map();
try{
 const response=await fetch('model.json');if(!response.ok)throw Error('Model unavailable');const model=await response.json();
 let mode='visitor';
 function recommendations(profile,seen,label){
  $('recommendations').replaceChildren();
  rank(model,profile,seen).forEach((m,index)=>{
   const card=document.createElement('article');card.className='film';
   const art=document.createElement('div');art.className='film-art';const genre=document.createElement('span');genre.textContent=m.genres.split('|').slice(0,2).join(' / ');const number=document.createElement('b');number.textContent=String(index+1).padStart(2,'0');art.append(genre,number);
   const info=document.createElement('div');info.className='film-info';const title=document.createElement('h3');title.textContent=m.title;const score=document.createElement('div');score.className='score';score.textContent=`${m.score.toFixed(2)} / 5`;const small=document.createElement('small');small.textContent=`Estimated rating · ${m.count.toLocaleString()} training ratings`;info.append(title,score,small);card.append(art,info);$('recommendations').append(card);
  });$('result-mode').textContent=label;$('results').hidden=false;
 }
 function rated(){
  $('rated-count').textContent=`Your ratings · ${ratings.size}`;$('rated-list').replaceChildren();
  for(const [index,value] of ratings){const row=document.createElement('div');row.className='rating-chip';const name=document.createElement('span');name.textContent=`${model.catalog[index].title} · ${value}/5`;const remove=document.createElement('button');remove.textContent='Remove';remove.setAttribute('aria-label',`Remove rating for ${model.catalog[index].title}`);remove.onclick=()=>{ratings.delete(index);rated();search();};row.append(name,remove);$('rated-list').append(row);}
  $('results').hidden=true;$('profile-status').textContent=ratings.size<3?`Rate ${3-ratings.size} more ${ratings.size===2?'movie':'movies'} to get started.`:'Ready to find recommendations. Rate more films to give the model more evidence.';
 }
 function search(){
  const query=$('search').value.toLowerCase().trim();$('movie-search').replaceChildren();
  const matches=model.catalog.map((m,index)=>({...m,index})).filter(m=>m.eligible&&m.title.toLowerCase().includes(query)).sort((a,b)=>b.count-a.count).slice(0,12);
  if(!matches.length){$('movie-search').textContent='No matching supported movie. This historical catalogue excludes newer releases and sparsely rated films.';return;}
  for(const m of matches){const card=document.createElement('div');card.className='movie-option';const name=document.createElement('strong');name.textContent=m.title;const genre=document.createElement('small');genre.textContent=m.genres.replaceAll('|',' · ');const select=document.createElement('select');select.setAttribute('aria-label',`Your rating for ${m.title}`);select.add(new Option('Haven’t rated this',''));for(let n=.5;n<=5;n+=.5)select.add(new Option(`${n} / 5`,String(n)));select.value=ratings.has(m.index)?String(ratings.get(m.index)):'';select.onchange=()=>{if(select.value)ratings.set(m.index,Number(select.value));else ratings.delete(m.index);rated();};card.append(name,genre,select);$('movie-search').append(card);}
 }
 function example(){
  const user=model.users[Number($('user').value)];$('history').replaceChildren();
  for(const m of user.history){const tag=document.createElement('span');tag.textContent=`${m.title} · ${m.rating}/5`;$('history').append(tag);}
  recommendations(user,new Set(user.seen),`Dataset user ${user.id}`);
 }
 function setMode(next){mode=next;$('visitor').hidden=mode!=='visitor';$('examples').hidden=mode!=='example';$('visitor-tab').setAttribute('aria-pressed',String(mode==='visitor'));$('example-tab').setAttribute('aria-pressed',String(mode==='example'));if(mode==='example')example();else rated();}
 $('visitor-tab').onclick=()=>setMode('visitor');$('example-tab').onclick=()=>setMode('example');
 model.users.forEach((u,index)=>$('user').add(new Option(`User ${u.id}`,String(index))));$('user').onchange=example;
 $('search').oninput=search;$('recommend').onclick=()=>{try{const profile=foldIn(model,ratings);recommendations(profile,new Set(ratings.keys()),`Based on your ${ratings.size} ratings`);$('profile-status').textContent='Your recommendations are ready below.';$('results').scrollIntoView({block:'nearest'});}catch(e){$('profile-status').textContent=e.message;}};
 const m=model.metrics;
 for(const [label,value] of [['Baseline RMSE',m.baseline.rmse],['Model RMSE',m.factor_model.rmse],['Baseline MAE',m.baseline.mae],['Model MAE',m.factor_model.mae]]){const card=document.createElement('div');card.className='metric';const name=document.createElement('span');name.textContent=label;const number=document.createElement('strong');number.textContent=value.toFixed(3);card.append(name,number);$('metrics').append(card);}
 $('dataset-summary').textContent=`${m.users.toLocaleString()} sampled users · ${m.train_ratings.toLocaleString()} training ratings · ${m.test_ratings.toLocaleString()} test ratings · ${m.selection.factors} latent factors. ${m.test_unseen_movie_ratings.toLocaleString()} test ratings concern movies absent from training and use a user-bias fallback. Ratings data ends October 12, 2023.`;
 search();rated();$('loading').hidden=true;$('app').hidden=false;
}catch(e){$('loading').textContent='The model could not load. Train and export the model, then serve this folder over HTTP.';console.error(e);}

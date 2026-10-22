// Poster requests are lazy and use MovieLens's own IMDb ID mapping, not title guesses.
export function poster(m,{className='',eager=false}={}){
 const wrap=document.createElement('div');wrap.className='poster-frame '+className;
 const fallback=document.createElement('div');fallback.className='poster-fallback';
 const overline=document.createElement('span');overline.textContent='NEXT FRAME / FILM ARCHIVE';
 const title=document.createElement('strong');title.textContent=m.title.replace(/\s*\(\d{4}\)\s*$/,'');
 const year=document.createElement('small');year.textContent=(m.year||'')+' · '+(m.genreList?.[0]||'Cinema');fallback.append(overline,title,year);wrap.append(fallback);
 if(m.imdb&&/^tt\d+$/.test(m.imdb)){const img=document.createElement('img');img.src=`https://images.metahub.space/poster/medium/${m.imdb}/img`;img.alt='Poster for '+m.title;img.loading=eager?'eager':'lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.onload=()=>{wrap.classList.add('poster-loaded');fallback.hidden=true;};img.onerror=()=>{img.remove();wrap.classList.add('poster-unavailable');year.textContent='Poster unavailable · '+(m.year||'year unknown');};wrap.append(img);}
 return wrap;
}
export function decoratePosters(target,items){target.querySelectorAll('.card-art').forEach((art,i)=>{const badge=art.querySelector('.source-tag');art.replaceChildren(poster(items[i]));if(badge)art.append(badge);});}
export function cinema({catalog,page}){
 const $=id=>document.getElementById(id),top=[...catalog].sort((a,b)=>b.count-a.count),byId=new Map(catalog.map(m=>[m.id,m]));
 const picks=[2571,4993,296,318,356,2959].map(id=>byId.get(id)).filter(Boolean);
 const hero=document.querySelector('.hero');
 if(hero){const art=hero.querySelector('.hero-art');art.className='poster-wall';art.replaceChildren(...picks.map(m=>poster(m,{eager:true})));const mark=document.createElement('div');mark.className='marquee';mark.textContent='YOUR TASTE. YOUR NEXT FRAME.';hero.after(mark);}
 const heading=document.querySelector('.page-heading');
 if(heading){heading.classList.add('cinema-heading');const strip=document.createElement('div');strip.className='heading-posters';strip.setAttribute('aria-hidden','true');for(const m of picks.slice(0,4)){const p=poster(m,{eager:true});p.querySelectorAll('img').forEach(i=>i.alt='');strip.append(p);}heading.append(strip);}
 if(page==='index'){
  const shelf=document.createElement('section');shelf.className='editorial-strip';shelf.innerHTML='<div><span class="eyebrow">A FILM FOR EVERY MOOD</span><h2>Where will tonight take you?</h2></div><div class="mood-links"><a href="discover.html?genre=Sci-Fi">Other worlds <small>SCI-FI</small></a><a href="discover.html?genre=Thriller">One more twist <small>THRILLER</small></a><a href="discover.html?genre=Comedy">Something lighter <small>COMEDY</small></a></div>';$('stats').after(shelf);
 }
 if(page==='discover'){
  const section=document.createElement('div');section.className='genre-chips';section.setAttribute('aria-label','Browse a genre');
  for(const [label,genre] of [['All films','All genres'],['Other worlds','Sci-Fi'],['Edge of your seat','Thriller'],['A little laughter','Comedy'],['Human stories','Drama'],['Into the unknown','Adventure'],['After dark','Horror']]){const b=document.createElement('button');b.textContent=label;b.dataset.genre=genre;b.onclick=()=>{$('genre').value=genre;$('genre').dispatchEvent(new Event('change'));update();};section.append(b);}
  document.querySelector('.filters').before(section);function update(){section.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.genre===$('genre').value)));}update();$('genre').addEventListener('change',update);$('reset').addEventListener('click',update);
  const genre=new URLSearchParams(location.search).get('genre');if(genre&&[...$('genre').options].some(o=>o.value===genre)){$('genre').value=genre;$('genre').dispatchEvent(new Event('change'));update();}
  const line=document.createElement('p');line.className='collection-label';line.textContent='THE COLLECTION / BROWSE BY YOUR TASTE';document.querySelector('.filters').before(line);
 }
 if(page==='recommendations'){
  const panel=$('rec-search').closest('.panel');panel.classList.add('onboarding-panel');
  const steps=document.createElement('div');steps.className='onboarding-steps';steps.innerHTML='<span><b>01</b> Find films you know</span><span><b>02</b> Give them a rating</span><span><b>03</b> Discover your next five</span>';panel.prepend(steps);
  const progress=document.createElement('div');progress.className='taste-progress';progress.innerHTML='<div><span class="eyebrow">BUILD YOUR TASTE PROFILE</span><strong id="taste-count">0 / 3 films</strong></div><div class="progress-track"><span id="taste-fill"></span></div><p>Three films unlock your shortlist. Add more to give the model more evidence.</p>';$('rec-search').parentElement.before(progress);
  const quick=document.createElement('button');quick.className='primary quick-recommend';quick.textContent='Reveal my five films';quick.onclick=()=>$('recommend').click();progress.append(quick);
  $('recommend').addEventListener('click',()=>{if(!$('recommendation-section').hidden)$('recommendation-section').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
  function update(){const count=$('my-ratings').children.length;$('taste-count').textContent=count+' / 3 films';$('taste-fill').style.width=Math.min(100,count/3*100)+'%';quick.disabled=count<3;}
  new MutationObserver(update).observe($('my-ratings'),{childList:true});update();
  const controls=document.createElement('div');controls.className='profile-actions';$('recommend').parentElement.before(controls);controls.append($('my-ratings'),$('recommend').parentElement,$('rec-status'));
 }
 if(page==='movie'){
  const m=byId.get(Number(new URLSearchParams(location.search).get('id'))),art=$('movie-detail')?.querySelector('.generated-art');if(m&&art)art.replaceWith(poster(m,{className:'detail-poster',eager:true}));
 }
 const footer=document.querySelector('footer');const credit=document.createElement('p');credit.className='poster-credit';credit.innerHTML='Artwork: <a href="https://stremio.github.io/stremio-addon-guide/step4" target="_blank" rel="noopener noreferrer">Cinemeta / MetaHub</a>, matched by MovieLens IMDb IDs. Availability varies; artwork belongs to its respective owners.';footer.append(credit);
}
export function decorateRating(box,m,select){
 box.prepend(poster(m));const starbar=document.createElement('div');starbar.className='star-rating';starbar.setAttribute('role','group');starbar.setAttribute('aria-label','Rate '+m.title);
 for(let n=1;n<=5;n++){const b=document.createElement('button');b.type='button';b.textContent='★';b.setAttribute('aria-label',n+' stars for '+m.title);b.onclick=()=>{select.value=String(n);select.dispatchEvent(new Event('change'));sync();};starbar.append(b);}
 function sync(){starbar.querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('filled',i<Number(select.value));b.setAttribute('aria-pressed',String(Number(select.value)===i+1));});}select.addEventListener('change',sync);sync();box.insertBefore(starbar,select);const label=document.createElement('label');label.className='precise-rating';label.textContent='Your rating (half-stars available)';select.before(label);label.append(select);
}

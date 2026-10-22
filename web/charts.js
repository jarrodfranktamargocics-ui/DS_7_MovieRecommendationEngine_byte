export const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors=['#367465','#dc754b','#557fab','#a391b0'];
const num=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:3});
function svg(title,body,h=270){return `<svg viewBox="0 0 640 ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${body}</svg>`;}
export function panel(el,title,subtitle,graphic,headers,rows){
 el.innerHTML=`<div class="chart-title"><div><h2>${esc(title)}</h2><p class="chart-caption">${esc(subtitle)}</p></div><button class="download" type="button">Download CSV</button></div><div class="chart-wrap">${graphic}</div><details><summary>View the underlying data</summary><div class="data-table"><table><thead><tr>${headers.map(x=>`<th scope="col">${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${esc(typeof x==='number'?num(x):x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
 el.querySelector('button').onclick=()=>{const csv=[headers,...rows].map(row=>row.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=title.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
}
export function bars(title,rows,{percent=false,max:given}={}){
 const max=given||Math.max(...rows.map(r=>r[1]),.001)*1.15,h=Math.max(200,rows.length*35+45);let s='';
 for(let n=0;n<=4;n++){const x=185+n*100;s+=`<line x1="${x}" y1="8" x2="${x}" y2="${h-30}" stroke="#e4eae3"/><text x="${x}" y="${h-10}" font-size="10" fill="#63756d" text-anchor="middle">${percent?(max*n/4*100).toFixed(1)+'%':num(max*n/4)}</text>`;}
 rows.forEach(([label,value],i)=>{const y=i*35+12;s+=`<text x="173" y="${y+16}" text-anchor="end" font-size="11" fill="#3c5550">${esc(label.length>24?label.slice(0,23)+'…':label)}</text><rect x="185" y="${y}" width="${400*value/max}" height="23" rx="3" fill="${colors[i%colors.length]}"><title>${esc(label)}: ${percent?(value*100).toFixed(2)+'%':num(value)}</title></rect><text x="${190+400*value/max}" y="${y+16}" font-size="10" fill="#3c5550">${percent?(value*100).toFixed(2)+'%':num(value)}</text>`;});return svg(title,s,h);
}
export function lines(title,series,{zero=true}={}){
 const vals=series.flatMap(s=>s.points.map(p=>p[1])),min=zero?0:Math.min(...vals)*.98,max=Math.max(...vals)*1.03||1;const labels=[...new Set(series.flatMap(s=>s.points.map(p=>String(p[0]))))].sort((a,b)=>isNaN(Number(a))?a.localeCompare(b):Number(a)-Number(b));
 const x=k=>60+550*labels.indexOf(String(k))/Math.max(1,labels.length-1),y=v=>225-190*(v-min)/(max-min);let s='';
 for(let i=0;i<=4;i++){const v=min+(max-min)*i/4;s+=`<line x1="60" x2="610" y1="${y(v)}" y2="${y(v)}" stroke="#e4eae3"/><text x="51" y="${y(v)+3}" text-anchor="end" font-size="10" fill="#63756d">${num(v)}</text>`;}
 const indices=[0,Math.floor((labels.length-1)/3),Math.floor(2*(labels.length-1)/3),labels.length-1];[...new Set(indices)].forEach(i=>s+=`<text x="${x(labels[i])}" y="247" text-anchor="middle" font-size="10" fill="#63756d">${esc(labels[i])}</text>`);
 series.forEach((g,i)=>{s+=`<polyline fill="none" stroke="${colors[i%4]}" stroke-width="2.4" points="${g.points.map(p=>`${x(p[0])},${y(p[1])}`).join(' ')}"/>`;g.points.forEach(p=>s+=`<circle cx="${x(p[0])}" cy="${y(p[1])}" r="2.5" fill="${colors[i%4]}"><title>${esc(g.name)} · ${esc(p[0])}: ${num(p[1])}</title></circle>`);});return svg(title,s)+`<div class="legend">${series.map((s,i)=>`<span><i style="background:${colors[i%4]}"></i>${esc(s.name)}</span>`).join('')}</div>`;
}
export function heatmap(rows){
 const genres=[...new Set(rows.map(r=>r.genre))],decades=[...new Set(rows.map(r=>r.decade))],max=Math.max(...rows.map(r=>r.count),1),cell=440/decades.length;let s='';
 genres.forEach((g,i)=>s+=`<text x="158" y="${58+i*34}" text-anchor="end" font-size="11" fill="#3c5550">${esc(g)}</text>`);
 decades.forEach((d,i)=>s+=`<text x="${180+(i+.5)*cell}" y="23" text-anchor="middle" font-size="8" fill="#3c5550">${esc(d==='Before 1950'?'Pre-1950':d)}</text>`);
 rows.forEach(r=>{const x=180+cell*decades.indexOf(r.decade),y=36+34*genres.indexOf(r.genre),alpha=.12+.88*r.count/max;s+=`<rect x="${x}" y="${y}" width="${cell-3}" height="29" rx="3" fill="#367465" opacity="${alpha}"><title>${esc(r.genre)} · ${esc(r.decade)}: ${r.count} films</title></rect><text x="${x+(cell-3)/2}" y="${y+19}" text-anchor="middle" font-size="9" fill="${alpha>.55?'white':'#183e32'}">${r.count}</text>`;});
 return svg('Movie genres by release decade; cells count trained films',s,genres.length*34+58);
}
export function scatter(rows){
 const max=Math.max(...rows.map(x=>x.count),21),min=20,x=n=>65+540*(Math.log10(n)-Math.log10(min))/(Math.log10(max)-Math.log10(min)),y=v=>225-185*(v-.5)/4.5;let s='';
 for(const v of [.5,1,2,3,4,5])s+=`<line x1="65" x2="605" y1="${y(v)}" y2="${y(v)}" stroke="#e4eae3"/><text x="53" y="${y(v)+3}" text-anchor="end" font-size="10" fill="#63756d">${v}</text>`;
 for(const n of [20,50,100,500,1000,2000])if(n<=max)s+=`<text x="${x(n)}" y="247" text-anchor="middle" font-size="10" fill="#63756d">${n.toLocaleString()}</text>`;
 rows.forEach(r=>s+=`<circle cx="${x(r.count)}" cy="${y(r.mean)}" r="2.5" fill="#367465" opacity=".32"><title>${esc(r.title)}: ${r.count} training ratings, ${r.mean.toFixed(2)} mean stars</title></circle>`);
 s+='<text x="330" y="268" text-anchor="middle" font-size="10" fill="#63756d">Training ratings per film · logarithmic scale</text><text x="65" y="17" font-size="10" fill="#63756d">Mean training stars (0.5–5)</text>';
 return svg('Movie training rating count versus mean stars',s,285);
}

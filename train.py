"""Train a baseline and factor models, select with validation, then evaluate once."""
from pathlib import Path
import os,json
ROOT=Path(__file__).resolve().parent
os.environ.setdefault('MPLCONFIGDIR',str(ROOT/'.runtime/matplotlib'))
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from model import epoch,predict,metrics,top_five

def train():
    data=ROOT/'data';out=ROOT/'outputs';web=ROOT/'web';out.mkdir(exist_ok=True);web.mkdir(exist_ok=True)
    if not (data/'ratings_sample.csv').exists():
        from prepare import prepare
        prepare()
    df=pd.read_csv(data/'ratings_sample.csv');movies=pd.read_csv(data/'movies.csv').set_index('movieId')
    tr=df[df.split=='train'];va=df[df.split=='validation'];te=df[df.split=='test']
    users=np.sort(tr.userId.unique());items=np.sort(tr.movieId.unique());um={int(x):i for i,x in enumerate(users)};im={int(x):i for i,x in enumerate(items)}
    def arrays(frame):return frame.userId.map(um).to_numpy(dtype=np.int64),frame.movieId.map(im).fillna(-1).to_numpy(dtype=np.int64),frame.rating.to_numpy(dtype=np.float64)
    u,i,r=arrays(tr);vu,vi,vr=arrays(va);tu,ti,truth=arrays(te)
    mu=float(r.mean());bu=np.zeros(len(users));bi=np.zeros(len(items));counts=np.bincount(i,minlength=len(items));ucounts=np.bincount(u,minlength=len(users))
    for _ in range(15):
        bu=np.bincount(u,weights=r-mu-bi[i],minlength=len(users))/(ucounts+10)
        bi=np.bincount(i,weights=r-mu-bu[u],minlength=len(items))/(counts+25)
    baseline_bu=bu.copy();baseline_bi=bi.copy()
    candidates=[(16,.05),(32,.05),(32,.15),(48,.10)]
    best=None;history=[];summary=[]
    for factors,reg in candidates:
        rng=np.random.default_rng(42);P=rng.normal(0,.1,(len(users),factors));Q=rng.normal(0,.1,(len(items),factors))
        a=bu.copy();b=bi.copy();lowest=np.inf;wait=0;checkpoint=None
        for step in range(1,26):
            epoch(u,i,r,rng.permutation(len(r)),mu,a,b,P,Q,.008,reg)
            val=metrics(vr,predict(mu,a,b,P,Q,vu,vi))
            history.append({'factors':factors,'regularization':reg,'epoch':step,**val})
            if val['rmse']<lowest-1e-5:
                lowest=val['rmse'];wait=0;checkpoint=(a.copy(),b.copy(),P.copy(),Q.copy(),step)
            else:wait+=1
            if wait>=3:break
        summary.append({'factors':factors,'regularization':reg,'best_epoch':checkpoint[4],'validation_rmse':lowest})
        print(summary[-1],flush=True)
        if best is None or lowest<best[0]:best=(lowest,factors,reg,checkpoint)
    _,factors,reg,(bu,bi,P,Q,steps)=best
    baseline_pred=predict(mu,baseline_bu,baseline_bi,np.zeros((len(users),1)),np.zeros((len(items),1)),tu,ti)
    pred=predict(mu,bu,bi,P,Q,tu,ti)
    evaluation={'baseline':metrics(truth,baseline_pred),'factor_model':metrics(truth,pred),'selection':{'factors':factors,'regularization':reg,'epoch':steps,'validation_rmse':best[0]},'train_ratings':len(tr),'validation_ratings':len(va),'test_ratings':len(te),'users':len(users),'trained_movies':len(items),'test_unseen_movie_ratings':int((ti<0).sum()),'score_range':[.5,5],'source':json.loads((data/'source.json').read_text()),'note':'Test evaluated after validation selection. Per-user chronological split is not a globally prospective backtest. Exported model remains fitted on training data only.'}
    np.savez_compressed(out/'model.npz',mu=mu,bu=bu,bi=bi,P=P,Q=Q,users=users,items=items,counts=counts)
    pd.DataFrame(history).to_csv(out/'learning_curves.csv',index=False);pd.DataFrame(summary).to_csv(out/'candidate_results.csv',index=False)
    (out/'metrics.json').write_text(json.dumps(evaluation,indent=2))
    # Only recommend movies with >=20 training ratings; disclose this popularity/coverage choice.
    eligible=counts>=20
    totals=np.bincount(i,weights=r,minlength=len(items));averages=totals/np.maximum(counts,1)
    catalog=[{'id':int(mid),'title':str(movies.loc[mid,'title']),'genres':str(movies.loc[mid,'genres']),'count':int(counts[j]),'mean':float(averages[j]),'eligible':bool(eligible[j]),'bias':round(float(bi[j]),7),'factors':Q[j].round(7).tolist()} for j,mid in enumerate(items)]
    # Curated reproducible examples: active users with different mean rating habits.
    activity=tr.groupby('userId').agg(n=('rating','size'),mean=('rating','mean'));pool=activity[activity.n.between(80,400)].sort_values('mean').index.tolist()
    example_ids=[pool[int(len(pool)*q)] for q in [.15,.5,.85]]
    demos=[]
    for uid in example_ids:
        idx=um[int(uid)];known=df[df.userId==uid];seen={im[int(x)] for x in known.movieId if int(x) in im}
        recs=top_five(mu,bu,bi,P,Q,idx,seen,eligible)
        top=tr[tr.userId==uid].sort_values(['rating','timestamp'],ascending=False).head(8)
        demos.append({'id':int(uid),'bias':round(float(bu[idx]),7),'factors':P[idx].round(7).tolist(),'seen':sorted(seen),'history':[{'title':str(movies.loc[x.movieId,'title']),'rating':float(x.rating)} for x in top.itertuples()],'recommendations':[{'movieId':int(items[j]),'title':catalog[j]['title'],'score':score} for j,score in recs]})
    (out/'sample_recommendations.json').write_text(json.dumps(demos,indent=2))
    (web/'model.json').write_text(json.dumps({'mean':mu,'catalog':catalog,'users':demos,'metrics':evaluation,'minimum_movie_ratings':20},separators=(',',':')),encoding='utf-8')
    fig,axs=plt.subplots(1,2,figsize=(10,4))
    for ax,key in zip(axs,['rmse','mae']):
        bars=ax.bar(['Bias baseline','Matrix factorization'],[evaluation['baseline'][key],evaluation['factor_model'][key]],color=['#9ba4b2','#546dc5'])
        ax.bar_label(bars,fmt='%.3f',padding=4);ax.set_title(key.upper()+' · lower is better');ax.set_ylabel('Rating points');ax.set_ylim(0,max(b.get_height() for b in bars)*1.2)
    fig.suptitle('Held-out rating prediction');fig.tight_layout();fig.savefig(out/'evaluation.png',dpi=160);plt.close(fig)
    fig,ax=plt.subplots(figsize=(8,4.5));h=pd.DataFrame(history)
    for (f,regu),g in h.groupby(['factors','regularization']):ax.plot(g.epoch,g.rmse,label=f'{f} factors / reg {regu}')
    ax.set(xlabel='Training epoch',ylabel='Validation RMSE',title='Model selection uses validation data only');ax.legend();fig.tight_layout();fig.savefig(out/'learning_curves.png',dpi=160);plt.close(fig)
    (web/'evaluation.png').write_bytes((out/'evaluation.png').read_bytes());(web/'learning_curves.png').write_bytes((out/'learning_curves.png').read_bytes())
    (web/'DATASET_LICENSE.txt').write_bytes((ROOT/'DATASET_LICENSE.txt').read_bytes())
    print(json.dumps(evaluation,indent=2),flush=True);return evaluation
if __name__=='__main__':train()

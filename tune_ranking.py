"""Select a support-aware MF ranker on validation only; freeze before test audits.

This improves the serving objective without pretending ranking scores are stars.
Historical test results are reused for comparison, not a new untouched benchmark.
"""
from pathlib import Path
import json, os
import numpy as np
import pandas as pd
ROOT=Path(__file__).resolve().parent
os.environ.setdefault('MPLCONFIGDIR',str(ROOT/'.runtime/matplotlib'))

def measure(scores, allowed, truth, ids):
    values=np.where(allowed,scores,-np.inf)
    top=np.argsort(-values,kind='stable')[:5]
    chosen=[int(ids[j]) for j in top if np.isfinite(values[j])]
    hit=[int(mid in truth) for mid in chosen]
    ideal=sum(1/np.log2(k+2) for k in range(min(5,len(truth))))
    return [sum(hit)/5,sum(hit)/len(truth),sum(v/np.log2(k+2) for k,v in enumerate(hit))/ideal]

def run():
    s=np.load(ROOT/'outputs/model.npz',allow_pickle=False)
    df=pd.read_csv(ROOT/'data/ratings_sample.csv');ids=s['items'];im={int(x):j for j,x in enumerate(ids)};um={int(x):j for j,x in enumerate(s['users'])}
    train=df[df.split=='train'];eligible=s['counts']>=20
    support=np.log1p(s['counts'])
    totals=np.bincount(train.movieId.map(im),weights=train.rating,minlength=len(ids))
    average=(totals+25*float(s['mu']))/(s['counts']+25)
    histories={int(u):g for u,g in df.groupby('userId')}
    def users_for(split,n,seed):
        pool=df.loc[(df.split==split)&(df.rating>=4),'userId'].unique()
        return np.random.default_rng(seed).choice(pool,min(n,len(pool)),replace=False)
    val_users=users_for('validation',500,7301)
    weights=[0.,.05,.1,.2,.4,.8,1.6]
    def evaluate(users,split,weight_list,baselines=False):
        rows=[]
        for uid in users:
            g=histories[int(uid)];truth=set(g.loc[(g.split==split)&(g.rating>=4),'movieId'])
            known=g[g.split=='train'] if split=='validation' else g[g.split!='test']
            allow=eligible.copy()
            for mid in known.movieId:
                if mid in im:allow[im[mid]]=False
            u=um[int(uid)];raw=float(s['mu'])+s['bu'][u]+s['bi']+s['Q']@s['P'][u]
            choices={f'weight_{w:g}':raw+w*support for w in weight_list}
            if baselines:choices.update(original=np.clip(raw,.5,5),movie_average=average,most_rated=support)
            for name,score in choices.items():
                p,r,n=measure(score,allow,truth,ids)
                rows.append(dict(user=int(uid),model=name,precision_at_5=p,recall_at_5=r,ndcg_at_5=n))
        return pd.DataFrame(rows)
    val=evaluate(val_users,'validation',weights,True)
    means=val.groupby('model')[['precision_at_5','recall_at_5','ndcg_at_5']].mean()
    selected=max(weights,key=lambda w:(means.loc[f'weight_{w:g}','ndcg_at_5'],-w))
    config={'method':'support_aware_matrix_factorization','support_weight':selected,'formula':'unclipped MF rating estimate + weight * log(1 + training rating count)','selection':'Maximum mean validation NDCG@5; ties prefer smaller weight','validation_users':500,'validation_seed':7301,'candidate_weights':weights,'minimum_movie_ratings':20,'note':'Ranking score is not a star rating or probability. This favors well-supported films and may reduce novelty.'}
    # Freeze the selected configuration before any test evaluation.
    (ROOT/'outputs/ranking_config.json').write_text(json.dumps(config,indent=2))
    val.to_csv(ROOT/'outputs/ranking_validation_per_user.csv',index=False)
    means.to_csv(ROOT/'outputs/ranking_validation.csv')
    print('Frozen validation choice:',json.dumps(config),flush=True)
    test_users=users_for('test',200,2026)
    audit=evaluate(test_users,'test',[selected],True).replace({'model':{f'weight_{selected:g}':'improved'}})
    audit.to_csv(ROOT/'outputs/ranking_improvement_per_user.csv',index=False)
    result={'config':config,'validation':means.to_dict(orient='index'),'test':audit.groupby('model')[['precision_at_5','recall_at_5','ndcg_at_5']].mean().to_dict(orient='index'),'test_users':200,'test_seed':2026,'evaluation_note':'Same historical test cohort as the original audit; not a new untouched test. Weight selected on validation only. Test ratings >=4 define observed relevance, including unavailable items in recall denominator. All supported candidates; training and validation history excluded.','onboarding_note':'Existing-user evaluation only. Visitor fold-in quality is not separately established.'}
    (ROOT/'outputs/ranking_improvement.json').write_text(json.dumps(result,indent=2))
    (ROOT/'web/ranking_improvement.json').write_text(json.dumps(result,separators=(',',':')))
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig,axes=plt.subplots(1,3,figsize=(13,4))
    for ax,key in zip(axes,['precision_at_5','recall_at_5','ndcg_at_5']):
        names=['original','movie_average','most_rated','improved'];values=[result['test'][x][key] for x in names]
        bars=ax.bar(['Original MF','Movie mean','Most rated','Improved MF'],values,color=['#929aa9','#b4b9c4','#c9ad65','#427b72'])
        ax.bar_label(bars,fmt='%.3f',padding=3);ax.set_title(key.replace('_',' ').title());ax.tick_params(axis='x',rotation=25);ax.set_ylim(0,max(values)*1.25)
    fig.suptitle('Historical test ranking audit · 200 users · higher is better');fig.tight_layout();fig.savefig(ROOT/'outputs/ranking_improvement.png',dpi=160);plt.close(fig)
    print(json.dumps(result['test'],indent=2),flush=True)
    return result
if __name__=='__main__':run()

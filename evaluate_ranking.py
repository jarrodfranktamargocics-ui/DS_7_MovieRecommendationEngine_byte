"""Observed-positive ranking check for a fixed sample of 200 test users.

Unobserved items are not known dislikes; these metrics are incomplete-relevance proxies.
"""
from pathlib import Path
import json
import numpy as np
import pandas as pd
ROOT=Path(__file__).resolve().parent
def run():
    saved=np.load(ROOT/'outputs/model.npz',allow_pickle=False);df=pd.read_csv(ROOT/'data/ratings_sample.csv')
    users=saved['users'];items=saved['items'];um={int(v):i for i,v in enumerate(users)};im={int(v):i for i,v in enumerate(items)}
    train=df[df.split=='train'];relevance=df[(df.split=='test')&(df.rating>=4)]
    eligible=saved['counts']>=20
    candidates=relevance.userId.unique();chosen=np.random.default_rng(2026).choice(candidates,min(200,len(candidates)),replace=False)
    raw=np.bincount(train.movieId.map(im),weights=train.rating,minlength=len(items));prior=float(saved['mu'])
    # Bayesian movie-average baseline; fixed shrinkage of 25 training ratings.
    popularity=(raw+25*prior)/(saved['counts']+25)
    rows=[]
    for uid in chosen:
        u=um[int(uid)];truth=set(relevance.loc[relevance.userId==uid,'movieId'])
        known=set(df.loc[(df.userId==uid)&(df.split!='test'),'movieId'])
        allow=eligible.copy()
        for mid in known:
            if mid in im:allow[im[mid]]=False
        factor=np.clip(prior+saved['bu'][u]+saved['bi']+saved['Q']@saved['P'][u],.5,5)
        for name,score in [('movie_average',popularity.copy()),('factor_model',factor)]:
            score[~allow]=-np.inf;top=np.argsort(-score,kind='stable')[:5];ids=[int(items[j]) for j in top if np.isfinite(score[j])]
            hits=len(set(ids)&truth);dcg=sum(1/np.log2(k+2) for k,mid in enumerate(ids) if mid in truth);ideal=sum(1/np.log2(k+2) for k in range(min(5,len(truth))))
            rows.append({'user':int(uid),'model':name,'precision_at_5':hits/5,'recall_at_5':hits/len(truth),'ndcg_at_5':dcg/ideal})
    table=pd.DataFrame(rows);table.to_csv(ROOT/'outputs/ranking_per_user.csv',index=False)
    result={'users':len(chosen),'seed':2026,'relevance':'Held-out rating >=4; only users with at least one such rating. Unknown/unrated items have unknown relevance.','candidate_policy':'All movies with >=20 training ratings; excludes training and validation history. Unknown test movies remain in recall denominator.','metrics':table.groupby('model')[['precision_at_5','recall_at_5','ndcg_at_5']].mean().to_dict(orient='index')}
    (ROOT/'outputs/ranking_metrics.json').write_text(json.dumps(result,indent=2))
    (ROOT/'web/ranking_metrics.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result,indent=2));return result
if __name__=='__main__':run()

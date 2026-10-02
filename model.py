"""Biased matrix factorization trained only on observed ratings."""
import numpy as np
from numba import njit

@njit(cache=True)
def epoch(u,i,r,order,mu,bu,bi,P,Q,lr,reg):
    for row in order:
        a,b=u[row],i[row];estimate=mu+bu[a]+bi[b]
        for k in range(P.shape[1]):estimate+=P[a,k]*Q[b,k]
        error=r[row]-estimate
        bu[a]+=lr*(error-reg*bu[a]);bi[b]+=lr*(error-reg*bi[b])
        for k in range(P.shape[1]):
            old=P[a,k];P[a,k]+=lr*(error-reg*old);Q[b,k]+=lr*(error*old-reg*Q[b,k])

def predict(mu,bu,bi,P,Q,u,i):
    valid=i>=0;result=mu+bu[u]
    result=result.copy();result[valid]+=bi[i[valid]]+np.sum(P[u[valid]]*Q[i[valid]],axis=1)
    return np.clip(result,.5,5)

def metrics(actual,pred):
    return {'rmse':float(np.sqrt(np.mean((actual-pred)**2))),'mae':float(np.mean(np.abs(actual-pred)))}

def top_five(mu,bu,bi,P,Q,user,seen,eligible):
    scores=np.clip(mu+bu[user]+bi+Q@P[user],.5,5)
    scores=scores.copy();scores[~eligible]=-np.inf;scores[list(seen)]=-np.inf
    chosen=np.argsort(-scores,kind='stable')[:5]
    return [(int(i),float(scores[i])) for i in chosen if np.isfinite(scores[i])]

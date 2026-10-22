"""Training-only item similarities for the new-visitor hybrid recommender."""
from pathlib import Path
import json
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix
ROOT=Path(__file__).resolve().parent

def build():
    model=json.loads((ROOT/'web/model.json').read_text(encoding='utf8'))
    df=pd.read_csv(ROOT/'data/ratings_sample.csv');train=df[df.split=='train'].copy()
    movies={m['id']:i for i,m in enumerate(model['catalog'])};users={u:i for i,u in enumerate(sorted(train.userId.unique()))}
    means=train.groupby('userId').rating.mean()
    rows=train.userId.map(users).to_numpy();cols=train.movieId.map(movies).to_numpy()
    residual=(train.rating-train.userId.map(means)).to_numpy()
    shape=(len(users),len(movies));matrix=csr_matrix((residual,(rows,cols)),shape=shape)
    observed=csr_matrix((np.ones(len(train)),(rows,cols)),shape=shape)
    norm=np.sqrt(np.asarray(matrix.power(2).sum(axis=0)).ravel())
    eligible=np.array([m['eligible'] for m in model['catalog']]);indices=np.flatnonzero(eligible)
    neighbours={}
    for offset in range(0,len(indices),100):
        batch=indices[offset:offset+100]
        dot=(matrix[:,batch].T@matrix).toarray();common=(observed[:,batch].T@observed).toarray()
        similarity=dot/np.maximum(norm[batch,None]*norm[None,:],1e-12)*common/(common+25)
        similarity[:,~eligible]=0;similarity[common<10]=0
        for k,i in enumerate(batch):
            similarity[k,i]=0
            top=np.argsort(-similarity[k],kind='stable')[:80]
            neighbours[str(i)]=[[int(j),round(float(similarity[k,j]),7)] for j in top if similarity[k,j]>0]
    result={'method':'Training-only adjusted cosine; user-mean centered ratings; >=10 co-raters; shrinkage n/(n+25); top 80 positive neighbours','neighbors':neighbours}
    (ROOT/'web/neighbors.json').write_text(json.dumps(result,separators=(',',':')))
    print('Built item neighbours for',len(neighbours),'supported movies.')
if __name__=='__main__':build()

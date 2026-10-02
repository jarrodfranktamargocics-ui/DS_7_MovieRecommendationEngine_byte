"""Artifact integrity, split separation, and independent onboarding fixture."""
from pathlib import Path
import json
import numpy as np
import pandas as pd
ROOT=Path(__file__).resolve().parent
def verify():
    df=pd.read_csv(ROOT/'data/ratings_sample.csv')
    assert not df.duplicated(['userId','movieId']).any()
    for _,g in df.groupby('userId'):
        assert g[g.split=='train'].timestamp.max()<=g[g.split=='validation'].timestamp.min()
        assert g[g.split=='validation'].timestamp.max()<=g[g.split=='test'].timestamp.min()
    model=json.loads((ROOT/'web/model.json').read_text(encoding='utf-8'))
    choices=sorted(range(len(model['catalog'])),key=lambda j:-model['catalog'][j]['count'])[:5]
    ratings=list(zip(choices,[5.,4.,2.,3.5,1.]))
    x=np.array([[1]+model['catalog'][j]['factors'] for j,_ in ratings]);y=np.array([r-model['mean']-model['catalog'][j]['bias'] for j,r in ratings])
    result=np.linalg.solve(x.T@x+np.eye(x.shape[1]),x.T@y)
    (ROOT/'outputs/onboarding_fixture.json').write_text(json.dumps({'ratings':ratings,'bias':float(result[0]),'factors':result[1:].tolist()},indent=2))
    print('Verified rating-pair uniqueness and chronological split ordering for every sampled user.')
if __name__=='__main__':verify()

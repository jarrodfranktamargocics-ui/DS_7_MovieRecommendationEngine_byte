"""Download and deterministically sample the MovieLens 32M benchmark."""
from pathlib import Path
from urllib.request import urlopen
from datetime import datetime,timezone
import hashlib,json,zipfile
import numpy as np
import pandas as pd

ROOT=Path(__file__).resolve().parent
URL='https://files.grouplens.org/datasets/movielens/ml-32m.zip'
def prepare(users=5000,seed=42):
    data=ROOT/'data';data.mkdir(exist_ok=True)
    path=data/'ml-32m.zip'
    if not path.exists():
        temp=path.with_suffix('.part')
        with urlopen(URL,timeout=120) as response,temp.open('wb') as f:
            while block:=response.read(1024*1024):f.write(block)
        temp.replace(path)
    with zipfile.ZipFile(path) as z:
        # Published user identifiers are contiguous 1..200948. Seeded uniform user sampling.
        ids=set(np.random.default_rng(seed).choice(np.arange(1,200949),users,replace=False).tolist())
        chunks=[];digest=hashlib.md5()
        with z.open('ml-32m/ratings.csv') as f:
            while block:=f.read(1024*1024):digest.update(block)
        assert digest.hexdigest()=='cf12b74f9ad4b94a011f079e26d4270a','Ratings checksum mismatch'
        with z.open('ml-32m/ratings.csv') as f:
            for chunk in pd.read_csv(f,chunksize=1000000):chunks.append(chunk[chunk.userId.isin(ids)])
        ratings=pd.concat(chunks,ignore_index=True).sort_values(['userId','timestamp','movieId'])
        assert ratings.userId.nunique()==users
        movies_raw=z.read('ml-32m/movies.csv')
        assert hashlib.md5(movies_raw).hexdigest()=='0df90835c19151f9d819d0822e190797'
        (data/'movies.csv').write_bytes(movies_raw)
        (ROOT/'DATASET_LICENSE.txt').write_bytes(z.read('ml-32m/README.txt'))
    # Within-user chronological 80/10/10; ties have a deterministic movieId order.
    position=ratings.groupby('userId').cumcount();size=ratings.groupby('userId').userId.transform('size')
    ratings['split']=np.where(position<np.floor(size*.8),'train',np.where(position<np.floor(size*.9),'validation','test'))
    ratings.to_csv(data/'ratings_sample.csv',index=False)
    meta={'source':URL,'dataset':'MovieLens 32M','ratings_end':'2023-10-12','retrieved_or_verified_at_utc':datetime.now(timezone.utc).isoformat(),'sample_users':users,'sample_seed':seed,'sample_ratings':len(ratings),'source_ratings_md5':digest.hexdigest(),'sample_sha256':hashlib.sha256((data/'ratings_sample.csv').read_bytes()).hexdigest(),'split':'Per-user chronological 80/10/10; not a global prospective time split','split_counts':ratings.split.value_counts().to_dict()}
    (data/'source.json').write_text(json.dumps(meta,indent=2));print(json.dumps(meta,indent=2),flush=True)
    return ratings
if __name__=='__main__':prepare()

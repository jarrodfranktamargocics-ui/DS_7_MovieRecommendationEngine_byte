"""Top five recommendations for any user in the reproducible sample."""
import argparse,json
from pathlib import Path
import numpy as np
import pandas as pd
from model import top_five
ROOT=Path(__file__).resolve().parent
def recommend(user_id):
    saved=np.load(ROOT/'outputs/model.npz',allow_pickle=False)
    matches=np.flatnonzero(saved['users']==user_id)
    if not len(matches):raise ValueError('User is not in the sampled training set; use onboarding for a new user.')
    ratings=pd.read_csv(ROOT/'data/ratings_sample.csv');movies=pd.read_csv(ROOT/'data/movies.csv').set_index('movieId')
    ids=saved['items'];mapping={int(x):i for i,x in enumerate(ids)}
    seen={mapping[int(x)] for x in ratings.loc[ratings.userId==user_id,'movieId'] if int(x) in mapping}
    config_path=ROOT/'outputs/ranking_config.json'
    config=json.loads(config_path.read_text()) if config_path.exists() else {}
    ranked=top_five(float(saved['mu']),saved['bu'],saved['bi'],saved['P'],saved['Q'],int(matches[0]),seen,saved['counts']>=20,saved['counts'],config.get('support_weight'))
    return [{'movieId':int(ids[i]),'title':str(movies.loc[ids[i],'title']),'predicted_rating':round(score,3)} for i,score in ranked]
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--user',type=int,required=True)
    print(json.dumps(recommend(parser.parse_args().user),indent=2))

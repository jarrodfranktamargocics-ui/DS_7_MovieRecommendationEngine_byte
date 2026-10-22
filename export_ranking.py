"""Export the validation-selected ranker and regenerate Python reference examples."""
from pathlib import Path
import json
import numpy as np
from model import top_five
ROOT=Path(__file__).resolve().parent

def export():
    config=json.loads((ROOT/'outputs/ranking_config.json').read_text())
    s=np.load(ROOT/'outputs/model.npz',allow_pickle=False)
    model=json.loads((ROOT/'web/model.json').read_text(encoding='utf8'))
    model['ranking']=config
    for user in model['users']:
        u=int(np.flatnonzero(s['users']==user['id'])[0])
        rows=top_five(float(s['mu']),s['bu'],s['bi'],s['P'],s['Q'],u,set(user['seen']),s['counts']>=20,s['counts'],config['support_weight'])
        user['recommendations']=[{'movieId':int(s['items'][j]),'title':model['catalog'][j]['title'],'score':score} for j,score in rows]
    (ROOT/'outputs/sample_recommendations.json').write_text(json.dumps(model['users'],indent=2))
    (ROOT/'web/model.json').write_text(json.dumps(model,separators=(',',':')),encoding='utf8')
    print('Exported validation-selected ranker and three Python reference profiles.')
if __name__=='__main__':export()

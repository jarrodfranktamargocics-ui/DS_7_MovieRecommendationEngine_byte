"""Export charts from the existing MovieLens sample, without retraining."""
from pathlib import Path
from collections import Counter
import json,re,zipfile,io
import pandas as pd
ROOT=Path(__file__).resolve().parent
def build():
    model=json.loads((ROOT/'web/model.json').read_text(encoding='utf8'))
    ratings=pd.read_csv(ROOT/'data/ratings_sample.csv')
    catalog=model['catalog']
    with zipfile.ZipFile(ROOT/'data/ml-32m.zip') as archive:
        links=pd.read_csv(io.BytesIO(archive.read('ml-32m/links.csv')),dtype={'imdbId':str})
    imdb={str(row.movieId):'tt'+str(row.imdbId).zfill(7) for row in links.itertuples() if pd.notna(row.imdbId)}
    for m in catalog:
        match=re.search(r'\((\d{4})\)\s*$',m['title']);m['year']=int(match[1]) if match else None
    genres=Counter(g for m in catalog for g in m['genres'].split('|') if g!='(no genres listed)')
    decades=sorted({m['year']//10*10 for m in catalog if m['year']})
    heat=[{'genre':g,'decade':str(d)+'s','count':sum(g in m['genres'].split('|') and m['year'] is not None and m['year']//10*10==d for m in catalog)} for g,_ in genres.most_common(8) for d in decades]
    dates=pd.to_datetime(ratings.timestamp,unit='s',utc=True)
    data={'monthly':dates.dt.strftime('%Y-%m').value_counts().sort_index().to_dict(),'distribution':{str(k):int(v) for k,v in ratings.rating.value_counts().sort_index().items()},'genres':dict(genres),'years':dict(sorted(Counter(str(m['year']) for m in catalog if m['year']).items())),'heat':heat,'yearsById':{str(m['id']):m['year'] for m in catalog},'sampleRatings':len(ratings),'supportedMovies':sum(m['eligible'] for m in catalog),'movies2023':sum(m['year']==2023 for m in catalog),'supported2023':sum(m['year']==2023 and m['eligible'] for m in catalog),'learning':pd.read_csv(ROOT/'outputs/learning_curves.csv').to_dict(orient='records'),'ranking':json.loads((ROOT/'outputs/ranking_metrics.json').read_text()),'earliestRating':dates.min().strftime('%Y-%m-%d'),'latestRating':dates.max().strftime('%Y-%m-%d')}
    data['imdbById']={str(m['id']):imdb.get(str(m['id'])) for m in catalog}
    (ROOT/'web/explorer.json').write_text(json.dumps(data,separators=(',',':')))
    print({k:data[k] for k in ['sampleRatings','supportedMovies','movies2023','supported2023','latestRating']})
if __name__=='__main__':build()

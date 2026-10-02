# Next Frame — Movie Recommendation Engine

B.Y.T.E Data Science Task 7: collaborative filtering with regularized, biased matrix factorization. Get five recommendations for a dataset user, or rate at least three films to create a temporary visitor profile.

## Dataset and scope

[MovieLens 32M](https://grouplens.org/datasets/movielens/32m/), from GroupLens, contains 32,000,204 ratings. Ratings end **October 12, 2023**. This project does not claim coverage of 2026 releases or every 2023 film.

The source was downloaded and verified on October 2, 2026. `prepare.py` checks the published checksums, selects 5,000 users with seed 42, and retains all their 779,802 ratings. Source checksums, collection time and sample SHA-256 are recorded in `outputs/metrics.json`. The original dataset terms and citation are preserved in `DATASET_LICENSE.txt`; they also apply to redistributed dataset-derived artifacts. This is an educational, noncommercial demonstration. See those terms before reuse.

Citation: F. Maxwell Harper and Joseph A. Konstan. 2015. The MovieLens Datasets: History and Context. ACM Transactions on Interactive Intelligent Systems 5, 4, Article 19. https://doi.org/10.1145/2827872

## Run the website first (no training needed)

Install Python 3.12 or newer. Download or clone this repository, open a terminal in its folder, and run:

```powershell
python -m http.server 8007 --directory web --bind 127.0.0.1
```

Open **http://127.0.0.1:8007/** in your browser. Keep the terminal open; press Ctrl+C to stop the website. Do not double-click the HTML file: the browser needs HTTP to load the saved model.

The saved model is already included. Search for films you know, choose their ratings, and click **Find my recommendations**. Alternatively, choose **Explore sample users**. Visitor ratings remain in page memory and disappear on refresh.

## Reproduce the analysis

In Windows PowerShell, from this project folder:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe prepare.py
.\.venv\Scripts\python.exe train.py
.\.venv\Scripts\python.exe evaluate_ranking.py
.\.venv\Scripts\python.exe verify.py
.\.venv\Scripts\python.exe make_notebook.py
```

The first preparation downloads about 239 MB; allow extra disk space for extracted CSVs. Training is local and may take several minutes. No Reddit account, API key, or paid service is required. Explicitly using the environment's Python avoids PowerShell activation-policy issues.

Open `notebooks/movie_recommendations.ipynb` in VS Code with its Jupyter extension to read the executed analysis. The notebook shows preprocessing and model source, selection results, evaluation charts and recommendations for three users. The commands above run training; regenerating the notebook displays the saved experiment rather than silently training again.

For an individual sampled user, run `recommend.py --user ID`, replacing ID with one of the IDs in `outputs/sample_recommendations.json`. The script prints the top five unseen supported films. IDs outside the sampled users are not available.

If Node.js is installed, also run `node test_browser.mjs`. This verifies the browser's top-five results against Python for all three examples and checks visitor profile fitting against an independent NumPy solution.

## How it works

1. Sort each user's ratings by timestamp, using movie ID to break ties. Split chronologically into training (621,912), validation (77,655), and test (80,235) rows. Learn user/movie mappings only from training. Missing ratings are unknown, not zero-star reviews.
2. Fit a regularized user/movie-bias baseline. Train four matrix-factorization configurations using stochastic gradient descent on observed ratings. Predict `global mean + user bias + movie bias + user factors · movie factors`.
3. Select factor count, regularization and stopping epoch using validation RMSE only. The selected model has 16 factors, regularization 0.05, and four epochs. Evaluate the test set after this selection. The exported model remains trained on the training partition.
4. Recommend only films with at least 20 training ratings, excluding the user's known rated movies. The website includes three example profiles; the Python script supports all 5,000 sampled users. The browser exports all 19,615 learned movie profiles, with the support threshold applied to searchable/recommended movies.
5. For new visitors, hold movie factors fixed and estimate a user bias and vector with ridge least squares (regularization 1). This is a practical onboarding heuristic; its accuracy has not been separately evaluated.

## Results and their limits

Lower rating error is better. These are rating points on the 0.5–5 scale, **not accuracy percentages**.

| Test rating prediction | RMSE | MAE |
| --- | ---: | ---: |
| Regularized user/movie-bias baseline | 0.88334 | 0.66956 |
| Matrix factorization | 0.87937 | 0.66452 |

The improvement is modest. There are 2,629 test ratings for movies absent from training; those use the global mean plus user bias as fallback.

An additional fixed-seed ranking audit evaluates 200 users with at least one test rating of four stars or higher. It ranks all supported candidates, excludes training/validation history, and measures recovery of those held-out positive ratings. Higher is better here.

| Top-five ranking audit | Precision@5 | Recall@5 | NDCG@5 |
| --- | ---: | ---: | ---: |
| Bayesian movie-average baseline | 0.02400 | 0.01662 | 0.02986 |
| Matrix factorization | 0.00900 | 0.00753 | 0.00863 |

**The factor model does not beat the ranking baseline.** Slightly better star-rating predictions do not guarantee a better top-five list. These exploratory results are reported rather than used for further test-set tuning. Unknown/unrated items have unknown relevance, so these are sparse observed-feedback metrics, not a measure of visitor satisfaction. The ranking baseline differs from the rating-error baseline.

Other limits: per-user time splits are not a globally prospective backtest; sampling limits coverage; the support threshold favors popular films; clipped predictions can tie; and the reported errors evaluate established users, not new visitors. Modern films need new interaction data or a separately evaluated content-based extension.

![Rating evaluation](outputs/evaluation.png)
![Validation learning curves](outputs/learning_curves.png)

## Where the code and trained model live

- `prepare.py`: download, checksums, sampling and splits.
- `model.py` / `train.py`: matrix factorization and experiment/export pipeline.
- `outputs/model.npz`: trained Python model (numeric arrays, loaded without pickle).
- `web/model.json`: browser-ready factors, examples and recorded metrics.
- `recommend.py`: five recommendations for a sampled user ID.
- `evaluate_ranking.py`: supplementary ranking audit.
- `outputs/`: metrics, candidate results, charts and sample recommendations.
- `notebooks/movie_recommendations.ipynb`: executed analysis.
- `web/engine.js`: browser scoring and visitor profile fitting.
- `verify.py` / `test_browser.mjs`: split and inference checks.

## Publish with GitHub and Vercel

Create a public repository named **DS_7_MovieRecommendationEngine_byte** and upload this project's files. Keep `data/`, `.venv/` and `.runtime/` out of Git; `.gitignore` handles them. Include the saved outputs, notebook and `web/` artifacts so deployment needs no training.

In Vercel, choose **Add New → Project**, import that repository, and use the **Other** framework preset. Keep the root directory at the repository root, set the output directory to **web**, and leave build/install commands empty. The included `vercel.json` supplies the static configuration. Deploy, open the generated URL, and test both recommendation modes. No environment variables are needed. Later commits to the connected production branch trigger another deployment.

Author: Jarrod Frank Tamargo — [GitHub](https://github.com/jarrodfranktamargocics-ui).

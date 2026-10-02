# Movie Recommendation Engine — Task 7

Status: MovieLens through October 2023 confirmed. Model trained, evaluation and executed notebook generated, and initial visitor onboarding implemented. See README.md for measured results and reproducible commands. Publishing remains separate from local verification.

## Core requirements

- Collaborative filtering with regularized matrix factorization of observed user–movie ratings.
- Separate training, validation, and test data; tune only on validation data.
- Compare a simple bias/average-rating baseline with the factor model using RMSE and MAE.
- Return five highest-scoring eligible movies for a known user, excluding movies already rated in the supplied history.
- Provide notebook, reproducible scripts, evaluation charts, README, and examples for three user IDs.
- Separate public repository: DS_7_MovieRecommendationEngine_byte; deploy the eventual browser demo through Vercel.

## Dataset proposal

MovieLens 32M is a stable benchmark with 32,000,204 ratings and 87,585 movies. Its ratings end on October 12, 2023; it is not a 2026 catalogue. Source: https://grouplens.org/datasets/movielens/32m/

Use a deterministic user sample to keep local training practical. Record dataset hashes, retrieval time, sample seed, retained users/movies/ratings, and filtering rules. Fit mappings and popularity thresholds using training data, and explicitly report test items/users that need fallback predictions.

Keep missing ratings unobserved; do not treat them as zero-star ratings. Do not claim a rating estimate is a probability of watching a film. Historical rating prediction and prediction of future interactions are different evaluation tasks.

## Later onboarding flow

Visitors search for and rate a few movies from the trained catalogue. Estimate a new user vector and bias while keeping trained movie factors fixed. Recommend unseen movies using that profile. Explain that recommendations based on very few ratings are uncertain. Use a clearly labeled popularity fallback before enough ratings are supplied. Keep visitor ratings local to their browser by default.

## Optional newer-film extension

2024–2026 movies need a separate current metadata/ratings source. Metadata alone does not give collaborative filtering the user–movie interactions needed to learn new item factors. A future extension can use content-based recommendations for new items, clearly separated from evaluated collaborative predictions. Do not imply 2026 coverage without verifying the source.

## Hosting approach

Train in Python locally. Export the bounded movie catalogue, learned factors, and evaluation data for browser inference. This avoids credentials and a persistent Python server for the core Vercel demo. Carry the selected dataset's attribution and applicable redistribution conditions with any exported data.

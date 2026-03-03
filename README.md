# SleepScore Analytics Dashboard

ML-powered sleep quality prediction dashboard built with React + TypeScript + Vite.  
Trained on the [Kaggle Sleep Health and Lifestyle Dataset](https://www.kaggle.com/datasets/uom190346a/sleep-health-and-lifestyle-dataset) (n=374).

**Research Questions:**  
- RQ1: Predict sleep quality score from health/lifestyle inputs  
- RQ2: Identify key score drivers and provide actionable recommendations  
- RQ3: Quantify threshold effects near 7 hours of sleep  

---

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Create your env file
cp .env.example .env
# Edit .env and add your OpenAI API key

# 3. Run dev server
npm run dev
```

Open http://localhost:5173 in your browser.

> **Note:** The OpenAI-powered recommendations require the Vercel serverless
> function. In local dev mode the app falls back to rule-based recommendations
> automatically. To test the full API locally, deploy to Vercel or use
> `vercel dev` (see below).

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create sleep-score-dashboard --public --push
```

### 2. Connect to Vercel

- Go to https://vercel.com/new
- Import your GitHub repo
- Framework: **Vite**
- Add environment variables:
  - `OPENAI_API_KEY` = your OpenAI key
  - `VITE_PUBLIC_APP_URL` = your Vercel deploy URL (e.g. https://sleep-score-dashboard.vercel.app)
- Click **Deploy**

### 3. Update QR Code

Once deployed, update `VITE_PUBLIC_APP_URL` in Vercel's environment variables
to your actual deploy URL. Redeploy. The QR code auto-reads this variable.

### Local Vercel Dev (optional)

```bash
npm i -g vercel
vercel link
vercel dev
```

This runs the serverless function locally at http://localhost:3000.

---

## Project Structure

```
sleep-score-dashboard/
  api/
    recommend.ts        Vercel serverless function (OpenAI + cache + rate limit)
  src/
    main.tsx            React entry
    App.tsx             Main dashboard (tabs, charts, forms)
    model.ts            ML model coefficients, baselines, prediction engine
    index.css           Global styles (dark theme, CSS variables)
    vite-env.d.ts       TypeScript env types
  index.html            HTML shell
  package.json
  vite.config.ts
  vercel.json           Vercel routing config
  .env.example          Environment variable template
```

---

## Architecture

### Models (embedded in client)

| Model | Train MAE | Train RMSE | CV-MAE (5-fold) |
|-------|-----------|------------|-----------------|
| Ridge Regression | 3.82 | 5.36 | 7.11 |
| Gradient Boosting | 0.02 | 0.06 | 4.90 |

The final prediction blends both: 70% nonlinear (with piecewise threshold
corrections capturing the GBR's behavior) + 30% ridge.

### Feature Decisions

- **Sleep Duration** (83.6% importance): dominant predictor, nonlinear threshold at 7h
- **Stress Level** (8.7%): strong inverse relationship
- **Physical Activity vs Daily Steps**: kept both (low collinearity ~0.3 in this dataset, GBR assigned different weights)
- **BMI**: derived from user-input height + weight, categorized as Normal/Overweight/Obese
- **Blood Pressure**: split into Systolic + Diastolic as separate features
- **Sleep Disorder**: 219/374 rows were NaN, coded as "None" (no disorder reported)

### API Endpoint: `/api/recommend`

- **Rate limiting**: 10 requests/min per IP (in-memory bucket)
- **Caching**: 5-minute TTL keyed by normalized inputs
- **Retries**: 3 attempts with exponential backoff
- **Validation**: all numeric inputs range-checked server-side
- **Model**: `gpt-4o-mini` (fast, cheap, good for structured output)
- **Token limit**: max_tokens=500, temperature=0.4
- **Prompt**: receives only summary stats, never raw dataset rows
- **Fallback**: returns null so client uses local rule-based recommendations

---

## Security Notes

- `OPENAI_API_KEY` is only used in the serverless function, never exposed to the client
- No API keys are bundled in the frontend build
- `VITE_PUBLIC_APP_URL` is a public URL, safe to expose
- Rate limiting prevents abuse of the OpenAI endpoint
- Input validation prevents injection via the API

---

## Testing Checklist

- [ ] Calculator form accepts valid inputs across all fields
- [ ] Score updates reflect sleep duration changes (test <7h vs >7h)
- [ ] Occupation and age-band baselines show correct comparison
- [ ] Driver messages change based on stress level (test 3 vs 8)
- [ ] Charts render in Explore tab, filters highlight bars
- [ ] History table populates after multiple predictions
- [ ] QR code renders and points to the correct URL
- [ ] API fallback works (disconnect network, verify local recs appear)
- [ ] Mobile responsive: forms stack, charts resize
- [ ] Edge cases: min/max values for all numeric inputs

---

## References

- Li Y, et al. (2022). Nature Aging, 2, 425-437. (7h nonlinear optimum)
- Watson NF, et al. (2015). AASM/SRS J Clin Sleep Med, 11(6), 591-592. (7h+ consensus)
- Li Y, et al. (2019). J Psychosom Res, 117, 49-55. (stress and sleep quality)

---

Built by Prasanna

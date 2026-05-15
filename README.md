# RankForge `/api/seo-research`

This package gives you a backend/serverless endpoint for the RankForge **Research Keyword** button.

It includes:

- `api/seo-research.js` for **Vercel**
- `netlify/functions/seo-research.js` for **Netlify**
- `netlify.toml` redirect so `/api/seo-research` works on Netlify

## What it returns

The endpoint returns the shape your RankForge HTML expects:

```json
{
  "keyword": "motorcycle t-shirts UK",
  "country": "GBR",
  "location": "United Kingdom",
  "language": "en",
  "search_volume": 1000,
  "cpc": 0.4,
  "competition": 0.2,
  "keyword_difficulty": null,
  "clicks": 10,
  "impressions": 500,
  "ctr": 0.02,
  "average_position": 12.4,
  "related_keywords": [],
  "questions": [],
  "semantic_entities": [],
  "competitors": [],
  "content_gaps": []
}
```

## Required environment variables

For DataForSEO:

```bash
DATAFORSEO_LOGIN=your_login
DATAFORSEO_PASSWORD=your_password
```

Optional security/CORS:

```bash
ALLOWED_ORIGIN=https://www.motorcycleappareluk.co.uk
```

Optional Google Search Console support:

```bash
GSC_ACCESS_TOKEN=your_google_oauth_access_token
GSC_SITE_URL=https://www.motorcycleappareluk.co.uk/
```

The GSC access token approach is intentionally simple for the first build. For production, replace it with a proper OAuth refresh-token flow.

## Vercel setup

1. Put the `api` folder in the root of your Vercel project.
2. Add environment variables in Vercel Project Settings.
3. Deploy.
4. Your endpoint will be:

```text
/api/seo-research
```

Vercel deploys files under `api/` as serverless functions.

## Netlify setup

1. Put `netlify/functions/seo-research.js` and `netlify.toml` in your project root.
2. Add environment variables in Netlify Site Settings.
3. Deploy.
4. Your endpoint will be available at:

```text
/api/seo-research
```

The `netlify.toml` redirect maps that to:

```text
/.netlify/functions/seo-research
```

## Test locally

```bash
curl -X POST http://localhost:8888/api/seo-research \
  -H "Content-Type: application/json" \
  -d '{"keyword":"motorcycle t-shirts UK","country":"GBR","language":"en"}'
```

For Vercel local testing, use the Vercel dev URL instead.

## Notes

This endpoint uses these DataForSEO endpoints:

- Google Organic Live Advanced SERP
- Google Ads Search Volume Live
- DataForSEO Labs Google Related Keywords Live

DataForSEO response formats can vary slightly by endpoint and account settings, so the code is defensive and normalises the result before sending it to RankForge.

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


## Windows installation folder

For this build, use this local installation folder:

```text
C:\RankForge
```

Recommended Windows setup:

```bat
mkdir C:\RankForge
xcopy /E /I . C:\RankForge
cd C:\RankForge
npm install
```

Keep the project files inside `C:\RankForge` before running or deploying.

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

---

# RankForge `/api/generate-image`

This package now also includes a secure backend image-generation endpoint for RankForge.

It includes:

- `api/generate-image.js` for **Vercel**
- `netlify/functions/generate-image.js` for **Netlify**
- `netlify.toml` redirect so `/api/generate-image` works on Netlify
- `image-generator-test.html` as a small test page

## What it does

The endpoint creates an SEO/article/social image using the OpenAI Images API and returns:

```json
{
  "ok": true,
  "model": "gpt-image-1",
  "size": "1536x1024",
  "quality": "medium",
  "prompt": "Create a premium editorial hero image...",
  "image_base64": "...",
  "image_url": null,
  "data_url": "data:image/png;base64,...",
  "revised_prompt": null
}
```

## Required environment variables

```bash
OPENAI_API_KEY=sk-your-openai-key
```

Optional:

```bash
OPENAI_IMAGE_MODEL=gpt-image-1
ALLOWED_ORIGIN=https://www.yourdomain.com
```

## Request body

You can send a direct prompt:

```json
{
  "prompt": "Cinematic motorcycle rider at dusk on an empty road, premium editorial blog hero image",
  "size": "1536x1024",
  "quality": "medium"
}
```

Or let RankForge build the prompt from SEO fields:

```json
{
  "title": "Why Riding Clears Your Head",
  "keyword": "motorcycle rider mindset",
  "context": "Blog hero image for a motorcycle lifestyle article about using the road to reset mentally.",
  "style": "editorial",
  "size": "1536x1024",
  "quality": "medium",
  "brand": "RankForge SEO Content Suite"
}
```

## Supported style values

```text
editorial
blog
social
infographic
ecommerce
```

## Supported size values

```text
1024x1024
1024x1536
1536x1024
```

## Frontend usage

```js
const res = await fetch('/api/generate-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Why Riding Clears Your Head',
    keyword: 'motorcycle rider mindset',
    context: 'Cinematic blog hero image for a motorcycle lifestyle article.',
    style: 'editorial',
    size: '1536x1024',
    quality: 'medium'
  })
});

const data = await res.json();
document.querySelector('#preview').src = data.data_url || data.image_url;
```

## Netlify setup

Add these environment variables in Netlify:

```text
OPENAI_API_KEY
OPENAI_IMAGE_MODEL
ALLOWED_ORIGIN
```

Then deploy. The endpoint will be available at:

```text
/api/generate-image
```

## Security note

Do not put `OPENAI_API_KEY` in frontend JavaScript. Keep it in Netlify/Vercel environment variables only.

// Vercel Serverless Function
// Path: /api/generate-image
// Required environment variable:
// OPENAI_API_KEY=your_openai_api_key
// Optional environment variables:
// OPENAI_IMAGE_MODEL=gpt-image-1
// ALLOWED_ORIGIN=https://your-site.example

const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';

function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(body));
}

function safeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normaliseSize(size) {
  const allowed = new Set(['1024x1024', '1024x1536', '1536x1024']);
  return allowed.has(size) ? size : '1536x1024';
}

function normaliseQuality(quality) {
  const allowed = new Set(['low', 'medium', 'high']);
  return allowed.has(quality) ? quality : 'medium';
}

function buildSeoImagePrompt(input) {
  const title = safeString(input.title);
  const keyword = safeString(input.keyword);
  const context = safeString(input.context);
  const style = safeString(input.style, 'editorial');
  const brand = safeString(input.brand, 'RankForge');
  const directPrompt = safeString(input.prompt);

  if (directPrompt) return directPrompt.slice(0, 3500);

  const styleInstructions = {
    editorial: 'premium editorial hero image, cinematic lighting, realistic photography, strong composition, modern digital publishing feel',
    social: 'high-impact social media graphic, bold visual hook, clean negative space for headline overlay, modern marketing aesthetic',
    blog: 'professional blog featured image, realistic scene, polished but natural, suitable for SEO article header',
    infographic: 'clean editorial infographic background, subtle data/SEO visual language, modern SaaS design, no tiny unreadable text',
    ecommerce: 'premium ecommerce lifestyle photography, product-marketing feel, realistic materials, clean commercial lighting'
  };

  const selectedStyle = styleInstructions[style] || styleInstructions.editorial;

  return [
    `Create a ${selectedStyle}.`,
    title ? `Topic/title: ${title}.` : '',
    keyword ? `Primary SEO keyword: ${keyword}.` : '',
    context ? `Context: ${context}.` : '',
    `Brand/tool context: ${brand}.`,
    'Avoid visible logos, copyrighted brand marks, watermarks, distorted text, misspelled words, extra limbs, uncanny faces, or cluttered composition.',
    'Leave clean space where a website or social editor could place headline text later.',
    'Make it look professional, credible, and ready for a live SEO/content product.'
  ].filter(Boolean).join(' ').slice(0, 3500);
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed. Use POST.' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return json(res, 500, { error: 'Missing OPENAI_API_KEY environment variable.' });

  const body = req.body || {};
  const prompt = buildSeoImagePrompt(body);
  if (!prompt || prompt.length < 8) {
    return json(res, 400, { error: 'A prompt, title, keyword, or context is required.' });
  }

  const model = safeString(body.model, process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1');
  const size = normaliseSize(safeString(body.size, '1536x1024'));
  const quality = normaliseQuality(safeString(body.quality, 'medium'));

  try {
    const openaiRes = await fetch(OPENAI_IMAGES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, prompt, size, quality, n: 1 })
    });

    const text = await openaiRes.text();
    let payload;
    try { payload = JSON.parse(text); } catch { payload = { raw: text }; }

    if (!openaiRes.ok) {
      return json(res, openaiRes.status, {
        error: payload?.error?.message || payload?.message || `OpenAI image generation failed with status ${openaiRes.status}`,
        details: payload?.error || payload
      });
    }

    const image = payload?.data?.[0] || {};
    const b64 = image.b64_json || null;
    const url = image.url || null;

    return json(res, 200, {
      ok: true,
      model,
      size,
      quality,
      prompt,
      image_base64: b64,
      image_url: url,
      data_url: b64 ? `data:image/png;base64,${b64}` : null,
      revised_prompt: image.revised_prompt || null
    });
  } catch (err) {
    return json(res, 500, { error: err.message || 'Unknown image generation error.' });
  }
};

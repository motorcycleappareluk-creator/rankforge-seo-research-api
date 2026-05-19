// Vercel Serverless Function
// Path: /api/seo-research
// Environment variables required for DataForSEO:
// DATAFORSEO_LOGIN=your_login
// DATAFORSEO_PASSWORD=your_password
// Optional Google Search Console:
// GSC_ACCESS_TOKEN=oauth_access_token
// GSC_SITE_URL=https://www.example.com/

const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3';

function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(body));
}

function basicAuth() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return null;
  return 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');
}

async function dataForSeoPost(path, body) {
  const auth = basicAuth();
  if (!auth) throw new Error('Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD environment variable.');

  const response = await fetch(`${DATAFORSEO_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); } catch { payload = { raw: text }; }

  if (!response.ok) {
    throw new Error(payload?.status_message || payload?.message || `DataForSEO error ${response.status}`);
  }

  return payload;
}

function firstTaskResult(payload) {
  return payload?.tasks?.[0]?.result?.[0] || payload?.tasks?.[0]?.result || null;
}

function extractSerpItems(serpPayload) {
  const result = firstTaskResult(serpPayload);
  const items = Array.isArray(result?.items) ? result.items : [];

  const organic = items
    .filter(item => ['organic', 'featured_snippet', 'people_also_ask'].includes(item.type))
    .slice(0, 10);

  const competitors = organic
    .filter(item => item.url || item.domain)
    .map(item => ({
      title: item.title || item.name || item.domain || '',
      url: item.url || '',
      domain: item.domain || '',
      snippet: item.description || item.snippet || '',
      rank: item.rank_group || item.rank_absolute || null,
      type: item.type || 'organic'
    }));

  const questions = [];
  for (const item of items) {
    if (item.type === 'people_also_ask' && Array.isArray(item.items)) {
      for (const q of item.items) {
        if (q.title) questions.push(q.title);
      }
    }
    if (item.title && /\?$/.test(item.title)) questions.push(item.title);
  }

  return { competitors, questions };
}

function extractKeywordMetrics(searchVolumePayload, keyword) {
  const result = firstTaskResult(searchVolumePayload);
  const rows = Array.isArray(result) ? result : (result?.items || []);
  const match = rows.find(row => String(row.keyword || '').toLowerCase() === keyword.toLowerCase()) || rows[0] || {};

  return {
    search_volume: match.search_volume ?? null,
    cpc: match.cpc ?? null,
    competition: match.competition ?? null,
    competition_index: match.competition_index ?? null,
    monthly_searches: match.monthly_searches || []
  };
}

function extractRelatedKeywords(relatedPayload) {
  const result = firstTaskResult(relatedPayload);
  const items = Array.isArray(result?.items) ? result.items : [];

  return items.slice(0, 30).map(item => {
    if (typeof item === 'string') return item;
    return item.keyword || item.related_keyword || item.title || '';
  }).filter(Boolean);
}

function buildContentGaps({ keyword, competitors, questions, relatedKeywords, gsc }) {
  const gaps = [];

  if (competitors.length) {
    gaps.push('Review competitor titles and snippets before writing; aim to cover the topic more clearly and practically.');
  }

  if (questions.length) {
    gaps.push('Answer common question-style searches directly in the article and FAQ section.');
  }

  if (relatedKeywords.length) {
    gaps.push('Include relevant related keywords naturally to build topical depth.');
  }

  if (gsc?.impressions && gsc?.ctr !== null && Number(gsc.ctr) < 0.03) {
    gaps.push('Existing Search Console data suggests low CTR; improve meta title and meta description for stronger click appeal.');
  }

  if (gsc?.average_position && Number(gsc.average_position) > 8 && Number(gsc.average_position) <= 25) {
    gaps.push('This looks like a striking-distance opportunity; improve internal links, content depth and on-page relevance.');
  }

  if (!gaps.length) {
    gaps.push(`Create a page that gives a clearer, more useful answer for "${keyword}" than generic competitor content.`);
  }

  return gaps;
}

function deriveEntities(keyword, relatedKeywords, competitors) {
  const stop = new Set(['the','and','for','with','from','that','this','best','near','your','you','are','how','what','why','when','where','uk','buy','guide']);
  const text = [keyword, ...relatedKeywords, ...competitors.map(c => `${c.title} ${c.snippet}`)].join(' ');
  const words = text.toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) || [];
  const counts = new Map();
  for (const word of words) {
    if (stop.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()].sort((a,b) => b[1] - a[1]).slice(0, 25).map(([word]) => word);
}

async function getGscData(keyword) {
  const token = process.env.GSC_ACCESS_TOKEN;
  const siteUrl = process.env.GSC_SITE_URL;
  if (!token || !siteUrl) return null;

  const now = new Date();
  const end = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const start = new Date(now.getTime() - 93 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      startDate: start,
      endDate: end,
      dimensions: ['query'],
      rowLimit: 25,
      dimensionFilterGroups: [{
        filters: [{ dimension: 'query', operator: 'contains', expression: keyword }]
      }]
    })
  });

  if (!response.ok) return null;

  const payload = await response.json();
  const rows = payload.rows || [];
  const totals = rows.reduce((acc, row) => {
    acc.clicks += row.clicks || 0;
    acc.impressions += row.impressions || 0;
    acc.positionWeighted += (row.position || 0) * (row.impressions || 0);
    return acc;
  }, { clicks: 0, impressions: 0, positionWeighted: 0 });

  return {
    clicks: totals.clicks,
    impressions: totals.impressions,
    ctr: totals.impressions ? totals.clicks / totals.impressions : null,
    average_position: totals.impressions ? totals.positionWeighted / totals.impressions : null,
    rows: rows.map(row => ({
      query: row.keys?.[0] || '',
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position
    }))
  };
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed. Use POST.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const keyword = String(body.keyword || '').trim();
    const country = body.country || 'GBR';
    const language = body.language || 'en';
    const locationName = body.location_name || 'United Kingdom';

    if (!keyword) return json(res, 400, { error: 'Missing keyword.' });

    const [serp, searchVolume, related, gsc] = await Promise.allSettled([
      dataForSeoPost('/serp/google/organic/live/advanced', [{ keyword, location_name: locationName, language_code: language, depth: 20 }]),
      dataForSeoPost('/keywords_data/google_ads/search_volume/live', [{ keywords: [keyword], location_name: locationName, language_code: language }]),
      dataForSeoPost('/dataforseo_labs/google/related_keywords/live', [{ keyword, location_code: 2826, language_code: language, depth: 2, include_seed_keyword: true, limit: 30 }]),
      getGscData(keyword)
    ]);

    const serpData = serp.status === 'fulfilled' ? extractSerpItems(serp.value) : { competitors: [], questions: [] };
    const metrics = searchVolume.status === 'fulfilled' ? extractKeywordMetrics(searchVolume.value, keyword) : {};
    const relatedKeywords = related.status === 'fulfilled' ? extractRelatedKeywords(related.value) : [];
    const gscData = gsc.status === 'fulfilled' ? gsc.value : null;
    const semanticEntities = deriveEntities(keyword, relatedKeywords, serpData.competitors);
    const contentGaps = buildContentGaps({ keyword, competitors: serpData.competitors, questions: serpData.questions, relatedKeywords, gsc: gscData });

    return json(res, 200, {
      keyword,
      country,
      location: locationName,
      language,
      search_volume: metrics.search_volume ?? null,
      cpc: metrics.cpc ?? null,
      competition: metrics.competition ?? null,
      competition_index: metrics.competition_index ?? null,
      keyword_difficulty: null,
      clicks: gscData?.clicks ?? null,
      impressions: gscData?.impressions ?? null,
      ctr: gscData?.ctr ?? null,
      average_position: gscData?.average_position ?? null,
      related_keywords: relatedKeywords,
      questions: [...new Set(serpData.questions)].slice(0, 15),
      semantic_entities: semanticEntities,
      competitors: serpData.competitors,
      content_gaps: contentGaps,
      provider_status: {
        serp: serp.status,
        search_volume: searchVolume.status,
        related_keywords: related.status,
        search_console: gscData ? 'fulfilled' : 'not_configured_or_failed'
      }
    });
  } catch (error) {
    return json(res, 500, { error: error.message || 'SEO research failed.' });
  }
};

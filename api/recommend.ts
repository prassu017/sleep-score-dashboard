import type { VercelRequest, VercelResponse } from '@vercel/node';

// ─── In-memory cache & rate limiter ─────────────────────────────
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 300_000; // 5 minutes
const rateBucket = new Map<string, number[]>();
const RATE_LIMIT = 10; // max calls per minute per IP
const RATE_WINDOW = 60_000;

function rateCheck(ip: string): boolean {
  const now = Date.now();
  const hits = (rateBucket.get(ip) || []).filter(t => now - t < RATE_WINDOW);
  if (hits.length >= RATE_LIMIT) return false;
  hits.push(now);
  rateBucket.set(ip, hits);
  return true;
}

function cacheKey(body: Record<string, unknown>): string {
  const keys = ['age', 'occupation', 'sleepDuration', 'stressLevel', 'physicalActivity',
    'dailySteps', 'heartRate', 'bmiCategory', 'sleepDisorder', 'score'];
  return keys.map(k => `${k}:${body[k]}`).join('|');
}

// ─── OpenAI call with retries + exponential backoff ─────────────
async function callOpenAI(prompt: string, retries = 3): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 500,
          temperature: 0.4,
          messages: [
            {
              role: 'system',
              content: 'You are a sleep health advisor. Return ONLY valid JSON arrays. No markdown, no backticks, no preamble.'
            },
            { role: 'user', content: prompt }
          ],
        }),
      });

      if (res.status === 429 || res.status >= 500) {
        const wait = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI ${res.status}: ${err}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (e) {
      if (attempt === retries - 1) throw e;
      const wait = Math.pow(2, attempt) * 1000;
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw new Error('Max retries exceeded');
}

// ─── Input validation ───────────────────────────────────────────
function validate(body: Record<string, unknown>): string | null {
  const num = (k: string, min: number, max: number) => {
    const v = Number(body[k]);
    if (isNaN(v) || v < min || v > max) return `${k} must be ${min}-${max}`;
    return null;
  };
  return (
    num('age', 10, 100) ||
    num('sleepDuration', 2, 16) ||
    num('stressLevel', 1, 10) ||
    num('physicalActivity', 0, 300) ||
    num('dailySteps', 0, 50000) ||
    num('heartRate', 40, 150) ||
    num('score', 0, 100) ||
    (!body['occupation'] ? 'occupation required' : null) ||
    (!body['bmiCategory'] ? 'bmiCategory required' : null)
  );
}

// ─── Handler ────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // Rate limit
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';
  if (!rateCheck(ip)) return res.status(429).json({ error: 'Rate limited. Try again in a minute.' });

  const body = req.body as Record<string, unknown>;

  // Validate
  const err = validate(body);
  if (err) return res.status(400).json({ error: err });

  // Cache check
  const key = cacheKey(body);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return res.status(200).json(cached.data);
  }

  // Build prompt (only summary stats, never raw rows)
  const prompt = `Based on these computed metrics from the Kaggle Sleep Health and Lifestyle Dataset, give 3-4 concise actionable recommendations.

User: Age ${body.age}, ${body.occupation}, Sleep ${body.sleepDuration}h, Stress ${body.stressLevel}/8, Activity ${body.physicalActivity} min, Steps ${body.dailySteps}, HR ${body.heartRate} bpm, BMI: ${body.bmiCategory}, Disorder: ${body.sleepDisorder}
Predicted Score: ${body.score}/100
Occupation avg: ${body.occAvgScore}/100 (n=${body.occCount})
Age band avg: ${body.ageAvgScore}/100
Top drivers: ${body.driversText}

References (use for grounding, keep wording original):
- Watson et al. 2015 AASM: 7+ hours for adults, <7h linked to health risks
- Li et al. 2022 Nature Aging: ~7h nonlinear optimum for cognition
- Li et al. 2019: stress and rumination degrade sleep quality

Rules: Do NOT invent statistics or population averages. Only use the baselines provided above. Be specific to this user.
Return a JSON array of objects with "title" (string) and "body" (string, under 40 words each). Nothing else.`;

  try {
    const raw = await callOpenAI(prompt);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const recs = JSON.parse(cleaned);
    const result = { recommendations: recs, source: 'openai' };
    cache.set(key, { data: result, ts: Date.now() });
    return res.status(200).json(result);
  } catch (e: unknown) {
    console.error('OpenAI error:', e);
    return res.status(200).json({ recommendations: null, source: 'fallback', error: String(e) });
  }
}

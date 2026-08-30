import { GoogleGenerativeAI } from '@google/generative-ai';

interface SearchResult {
  title: string;
  url: string;
  content?: string;
  source: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// LIVE SCRAPERS
// ──────────────────────────────────────────────────────────────────────────────

async function searchTavily(query: string, apiKey: string): Promise<SearchResult[]> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ api_key: apiKey, query, search_depth: 'basic', max_results: 6 })
    });
    clearTimeout(id);
    if (!resp.ok) { console.warn('[Tavily] Non-OK:', resp.status); return []; }
    const data: any = await resp.json();
    const results = (data.results || []).map((r: any) => ({ title: r.title, url: r.url, content: r.content, source: 'Tavily' }));
    console.log(`[Tavily] Returned ${results.length} results.`);
    return results;
  } catch (e: any) { console.warn('[Tavily] Error:', e.message); return []; }
}

async function searchFirecrawl(query: string, apiKey: string): Promise<SearchResult[]> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({ query, limit: 4 })
    });
    clearTimeout(id);
    if (!resp.ok) { console.warn('[Firecrawl] Non-OK:', resp.status); return []; }
    const data: any = await resp.json();
    const results = (data.data || []).map((r: any) => ({
      title: r.title || r.metadata?.title || 'Resource',
      url: r.url,
      content: r.description || r.markdown?.substring(0, 300),
      source: 'Firecrawl'
    }));
    console.log(`[Firecrawl] Returned ${results.length} results.`);
    return results;
  } catch (e: any) { console.warn('[Firecrawl] Error:', e.message); return []; }
}

async function searchApify(query: string, apiKey: string): Promise<SearchResult[]> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(`https://api.apify.com/v2/acts/apify~rag-web-browser/run-sync-get-dataset-items?token=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ query, maxResults: 3 })
    });
    clearTimeout(id);
    if (!resp.ok) { console.warn('[Apify] Non-OK:', resp.status); return []; }
    const data: any = await resp.json();
    if (!Array.isArray(data)) return [];
    const results = data.map((item: any) => ({
      title: item.title || 'Apify Resource',
      url: item.url || '',
      content: item.text?.substring(0, 300),
      source: 'Apify'
    }));
    console.log(`[Apify] Returned ${results.length} results.`);
    return results;
  } catch (e: any) { console.warn('[Apify] Error:', e.message); return []; }
}

async function runMultiScraper(query: string): Promise<SearchResult[]> {
  const tavilyKey    = process.env.TAVILY_API_KEY?.trim();
  const firecrawlKey = process.env.FIRECRAWL_API_KEY?.trim();
  const apifyKey     = (process.env.APIFY_API_KEY || process.env.APIFY_TOKEN)?.trim();

  const tasks: Promise<SearchResult[]>[] = [];
  if (tavilyKey)    tasks.push(searchTavily(query, tavilyKey));
  if (firecrawlKey) tasks.push(searchFirecrawl(query, firecrawlKey));
  if (apifyKey)     tasks.push(searchApify(query, apifyKey));

  if (tasks.length === 0) {
    console.log('[Multi-Scraper] No scraper API keys found.');
    return [];
  }

  const settled = await Promise.allSettled(tasks);
  const results: SearchResult[] = [];
  settled.forEach(r => { if (r.status === 'fulfilled') results.push(...r.value); });
  console.log(`[Multi-Scraper] Total live results: ${results.length}`);
  return results;
}

// ──────────────────────────────────────────────────────────────────────────────
// INTENT CLASSIFICATION
// ──────────────────────────────────────────────────────────────────────────────

type Intent = 'GREETING' | 'CONCEPT' | 'RESOURCE';

function classifyIntent(message: string): Intent {
  const t = message.toLowerCase().trim();

  const greetings = ['hello', 'hi', 'hey', 'good morning', 'good evening', 'good afternoon',
    'how are you', 'thank you', 'thanks', 'bye', 'ok', 'okay', 'cool'];
  if (greetings.includes(t)) return 'GREETING';

  const resourceSignals = [
    'roadmap', 'learning path', 'curriculum', 'study plan',
    'resources', 'recommend', 'courses', 'course', 'tutorials', 'tutorial',
    'refer me', 'youtube', 'videos', 'books', 'projects to build',
    'portfolio projects', 'how can i learn', 'how do i learn', 'how to become',
    'i want to learn', 'help me learn', 'teach me', 'guide me',
    'within 60 days', 'within 30 days', 'roadmap for', 'path to',
    'start freelancing', 'get started with', 'where to start'
  ];
  if (resourceSignals.some(s => t.includes(s))) return 'RESOURCE';

  return 'CONCEPT';
}

// ──────────────────────────────────────────────────────────────────────────────
// JSON EXTRACTION HELPER
// ──────────────────────────────────────────────────────────────────────────────

function extractJSON(text: string): any {
  let s = text.trim();
  s = s.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = s.indexOf('{');
  const end   = s.lastIndexOf('}');
  if (start !== -1 && end > start) s = s.substring(start, end + 1);
  return JSON.parse(s);
}

// ──────────────────────────────────────────────────────────────────────────────
// OPENROUTER CALLER
// OpenAI-compatible API — works with any model hosted on openrouter.ai
// Recommended fast free model: meta-llama/llama-3.3-70b-instruct:free
// ──────────────────────────────────────────────────────────────────────────────

async function callOpenRouter(prompt: string, apiKey: string): Promise<string> {
  // Fast free models in priority order
  const model = process.env.OPENROUTER_MODEL?.trim() || 'meta-llama/llama-3.3-70b-instruct:free';

  console.log(`[OpenRouter] Calling model: ${model}`);

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 30000);

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://suv-agent.vercel.app',
      'X-Title': 'suv++ Agent'
    },
    signal: controller.signal,
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 3000,
      temperature: 0.7
    })
  });
  clearTimeout(id);

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenRouter HTTP ${resp.status}: ${errText.substring(0, 200)}`);
  }

  const data: any = await resp.json();
  const text = data.choices?.[0]?.message?.content?.trim();

  if (!text) throw new Error('OpenRouter returned empty response.');

  console.log(`[OpenRouter] ✅ Success with model: ${model}`);
  return text;
}

// ──────────────────────────────────────────────────────────────────────────────
// GEMINI FALLBACK CHAIN
// Tries multiple Gemini models in order when OpenRouter is unavailable.
// ──────────────────────────────────────────────────────────────────────────────

async function callGemini(genAI: GoogleGenerativeAI, prompt: string): Promise<string> {
  const userModel    = process.env.GEMINI_MODEL?.trim();
  const MODEL_CHAIN: string[] = userModel
    ? [userModel, 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.7-flash', 'gemini-3.6-flash']
    : ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.7-flash', 'gemini-3.6-flash'];

  const tried: string[] = [];

  for (const modelName of MODEL_CHAIN) {
    if (tried.includes(modelName)) continue;
    tried.push(modelName);
    try {
      const m = genAI.getGenerativeModel({ model: modelName });
      const result = await m.generateContent(prompt);
      const text = result.response.text().trim();
      console.log(`[Gemini] ✅ Success with model: ${modelName}`);
      return text;
    } catch (err: any) {
      const msg: string = err?.message || '';
      const isRecoverable =
        msg.includes('404') || msg.includes('429') || msg.includes('503') ||
        msg.includes('quota') || msg.includes('no longer available') ||
        msg.includes('Too Many Requests') || msg.includes('Not Found') ||
        msg.includes('not found') || msg.includes('Service Unavailable');

      if (isRecoverable) {
        console.warn(`[Gemini] ⚠️  ${modelName} skipped: ${msg.substring(0, 120)}`);
        continue;
      }
      throw err;
    }
  }

  throw new Error(
    `All Gemini models exhausted. Tried: ${tried.join(', ')}. ` +
    'Enable billing at https://aistudio.google.com/apikey'
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MASTER AI CALLER  — OpenRouter first, Gemini as fallback
// ──────────────────────────────────────────────────────────────────────────────

async function callAI(genAI: GoogleGenerativeAI, prompt: string): Promise<string> {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();

  // 1. Try OpenRouter first (fast, generous free tier, no daily quota)
  if (openRouterKey) {
    try {
      const text = await callOpenRouter(prompt, openRouterKey);
      return text;
    } catch (err: any) {
      console.warn(`[OpenRouter] Failed: ${err.message?.substring(0, 150)} — falling back to Gemini`);
    }
  } else {
    console.log('[AI] No OPENROUTER_API_KEY found — using Gemini directly.');
  }

  // 2. Fallback: Gemini model chain
  return callGemini(genAI, prompt);
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ──────────────────────────────────────────────────────────────────────────────

export async function generateLearningPath(message: string, profile: any, history: any[] = []) {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) throw new Error('GEMINI_API_KEY is not set in backend environment.');

  const genAI = new GoogleGenerativeAI(geminiKey);

  const profileSummary = [
    `Name: ${profile?.full_name || 'Learner'}`,
    `Skill Level: ${profile?.current_skill_level || 'Beginner'}`,
    `Current Role: ${profile?.current_job_role || 'Student / Developer'}`,
    `Target Role: ${profile?.target_role || 'Not specified'}`,
    `Interests: ${profile?.interests || 'General tech'}`,
    `Weekly Hours: ${profile?.time_available_per_week || '5–10 hours'}`,
  ].join('\n');

  const historyContext = history.length > 0
    ? history.map(h => `${h.role === 'user' ? 'User' : 'Agent'}: ${h.content}`).join('\n')
    : 'No prior context.';

  const intent = classifyIntent(message);
  console.log(`[Intent] "${message}" => ${intent}`);

  // ─── GREETING ─────────────────────────────────────────────────────────────
  if (intent === 'GREETING') {
    const prompt = `You are suv++ Agent, an enthusiastic senior AI engineer and career mentor.
The learner said: "${message}"
Learner Profile: ${profileSummary}

Give a warm, energetic welcome (2–3 sentences). Then highlight 5 domains they can explore:
🤖 AI & Machine Learning, 🛡️ Cybersecurity, 🌐 Full-Stack Web Dev, 📊 Data Science, ⚙️ DevOps/Cloud.
Invite them to either ask "what is X" for a deep explanation, or "I want to learn X" for a personalized roadmap.`;

    const text = await callAI(genAI, prompt);
    return { assistantResponse: text, learningPath: null };
  }

  // ─── CONCEPT ──────────────────────────────────────────────────────────────
  if (intent === 'CONCEPT') {
    const prompt = `You are suv++ Agent — a world-class senior software engineer, architect, and technical mentor.
Learner asked: "${message}"

Profile:
${profileSummary}

Conversation History:
${historyContext}

Deliver a thorough, senior-engineer-level explanation structured exactly as follows:
1. **TL;DR** — One sharp sentence defining the concept.
2. ## What It Is — Clear definition with a real-world analogy.
3. ## How It Works — Step-by-step breakdown (use bullets or numbered list).
4. ## Real-World Uses — 3–5 concrete industry examples with **bold** company/tool names.
5. ## Key Terms — Brief definitions of 3–5 important related concepts.
6. ## Want to Go Deeper? — Invite them to type "I want to learn [topic]" for a full personalized roadmap with courses, YouTube videos, and hands-on projects.

Use **bold** for key terms. Use \`code snippets\` where relevant. Tailor depth to skill level: ${profile?.current_skill_level || 'Beginner'}.`;

    const text = await callAI(genAI, prompt);
    return { assistantResponse: text, learningPath: null };
  }

  // ─── RESOURCE / ROADMAP ───────────────────────────────────────────────────
  console.log('[Roadmap Engine] Launching live scraper pipeline...');
  const searchQuery = `${message} best courses youtube tutorials documentation projects 2025`;
  const liveResults = await runMultiScraper(searchQuery);
  console.log(`[Roadmap Engine] Scraped ${liveResults.length} live resources.`);

  const roadmapPrompt = `You are suv++ Agent — a principal engineer and career strategist.
Build a precise, actionable learning roadmap.

Learner Profile:
${profileSummary}

Conversation Context:
${historyContext}

User Request: "${message}"

Live Scraped Resources (use the best real URLs from these):
${JSON.stringify(liveResults.slice(0, 10), null, 2)}

STRICT RULES:
1. "title": Short and impactful, max 8 words. Do NOT echo the user query verbatim.
2. "phases": Exactly 3–4 sequential, named phases (e.g. "Phase 1: Foundations & Setup").
3. Each phase must have 2–4 resources:
   - Use scraped URLs when high quality, otherwise use known good URLs (YouTube, freeCodeCamp, official docs).
   - "type": one of "Video" | "Course" | "Article" | "Project" | "Documentation"
   - "reason": 1–2 sentences on WHY this fits this learner's exact goal and skill level.
4. "intro_message": 2–3 sentence markdown summary of what they will achieve.
5. "next_action": The exact first action they should do TODAY (be very specific).

Respond ONLY with a raw JSON object. No markdown fences, no extra text.

{
  "intro_message": "...",
  "title": "...",
  "goal": "...",
  "level": "Beginner | Intermediate | Advanced",
  "estimated_duration": "...",
  "phases": [
    {
      "phase_name": "Phase 1: ...",
      "resources": [
        { "title": "...", "url": "https://...", "type": "...", "reason": "..." }
      ]
    }
  ],
  "next_action": "..."
}`;

  let learningPath: any = null;
  let introMessage = '';

  try {
    const raw = await callAI(genAI, roadmapPrompt);
    console.log('[Roadmap] AI response preview:', raw.substring(0, 200));
    const parsed = extractJSON(raw);

    learningPath = {
      title: parsed.title,
      goal: parsed.goal,
      level: parsed.level || 'Beginner',
      estimated_duration: parsed.estimated_duration || '4–6 Weeks',
      phases: parsed.phases || [],
      next_action: parsed.next_action
    };
    introMessage = parsed.intro_message || `Here is your personalized roadmap: **${parsed.title}**. Let's get started!`;
  } catch (err: any) {
    console.error('[Roadmap] AI/JSON error — using scraped fallback. Error:', err.message);

    const phases: any[] = [];
    if (liveResults.length > 0) {
      phases.push({
        phase_name: 'Phase 1: Get Started',
        resources: liveResults.slice(0, 3).map(r => ({
          title: r.title,
          url: r.url,
          type: 'Course',
          reason: `Live resource from ${r.source} — directly relevant to your goal.`
        }))
      });
      if (liveResults.length > 3) {
        phases.push({
          phase_name: 'Phase 2: Practice & Apply',
          resources: liveResults.slice(3, 6).map(r => ({
            title: r.title,
            url: r.url,
            type: 'Video',
            reason: `Hands-on tutorial found live via ${r.source}.`
          }))
        });
      }
    }

    learningPath = {
      title: message.split(' ').slice(0, 6).join(' ') + ' Roadmap',
      goal: `Build practical skills in: ${message}`,
      level: profile?.current_skill_level || 'Beginner',
      estimated_duration: '6–8 Weeks',
      phases,
      next_action: 'Start Phase 1 today — spend 30 focused minutes on the first resource.'
    };
    introMessage = `I've built your personalized roadmap for **"${message}"** using live web resources. Let's go! 🚀`;
  }

  return { assistantResponse: introMessage, learningPath };
}

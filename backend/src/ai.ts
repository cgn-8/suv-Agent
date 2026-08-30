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
    const results = (data.data || []).map((r: any) => ({ title: r.title || r.metadata?.title || 'Resource', url: r.url, content: r.description || r.markdown?.substring(0, 300), source: 'Firecrawl' }));
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
    const results = data.map((item: any) => ({ title: item.title || 'Apify Resource', url: item.url || '', content: item.text?.substring(0, 300), source: 'Apify' }));
    console.log(`[Apify] Returned ${results.length} results.`);
    return results;
  } catch (e: any) { console.warn('[Apify] Error:', e.message); return []; }
}

async function runMultiScraper(query: string): Promise<SearchResult[]> {
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  const firecrawlKey = process.env.FIRECRAWL_API_KEY?.trim();
  const apifyKey = (process.env.APIFY_API_KEY || process.env.APIFY_TOKEN)?.trim();

  const tasks: Promise<SearchResult[]>[] = [];
  if (tavilyKey)    tasks.push(searchTavily(query, tavilyKey));
  if (firecrawlKey) tasks.push(searchFirecrawl(query, firecrawlKey));
  if (apifyKey)     tasks.push(searchApify(query, apifyKey));

  if (tasks.length === 0) {
    console.log('[Multi-Scraper] No API keys found — running without live scraped data.');
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
  const end = s.lastIndexOf('}');
  if (start !== -1 && end > start) s = s.substring(start, end + 1);
  return JSON.parse(s);
}

// ──────────────────────────────────────────────────────────────────────────────
// GEMINI MODEL FALLBACK CHAIN
// Tries models in order until one responds. Handles 404 (unavailable) and
// 429 (quota exhausted) gracefully by moving to the next model.
// ──────────────────────────────────────────────────────────────────────────────

async function callGemini(genAI: GoogleGenerativeAI, prompt: string): Promise<string> {
  // If user set GEMINI_MODEL explicitly, try that first, then fallbacks
  const userModel = process.env.GEMINI_MODEL?.trim();
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
        msg.includes('404') ||
        msg.includes('429') ||
        msg.includes('quota') ||
        msg.includes('no longer available') ||
        msg.includes('Too Many Requests') ||
        msg.includes('not found') ||
        msg.includes('Not Found');

      if (isRecoverable) {
        console.warn(`[Gemini] ⚠️  ${modelName} skipped: ${msg.substring(0, 120)}`);
        continue;
      }
      // Unexpected error (auth, network, etc.) — rethrow immediately
      throw err;
    }
  }

  throw new Error(
    'All Gemini models are quota-exhausted or unavailable for this API key.\n' +
    'Tried: ' + tried.join(', ') + '\n' +
    'Fix: Enable billing at https://aistudio.google.com/apikey or create a new API key.'
  );
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

    const text = await callGemini(genAI, prompt);
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

Deliver a thorough, senior-engineer-level explanation structured as follows:
1. **TL;DR** — One sharp sentence defining the concept.
2. ## What It Is — Clear definition with a real-world analogy.
3. ## How It Works — Step-by-step breakdown (use bullets or numbered list).
4. ## Real-World Uses — 3–5 concrete industry examples with **bold** company/tool names.
5. ## Key Terms — Brief definitions of 3–5 important related concepts.
6. ## Want to Go Deeper? — Invite them to type "I want to learn [topic]" for a full personalized roadmap with courses, YouTube videos, and hands-on projects.

Use **bold** for key terms. Use \`code snippets\` for any code or commands. Tailor depth to: ${profile?.current_skill_level || 'Beginner'}.`;

    const text = await callGemini(genAI, prompt);
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

Live Scraped Resources from Tavily / Firecrawl / Apify (use the best real URLs from these):
${JSON.stringify(liveResults.slice(0, 10), null, 2)}

STRICT RULES:
1. "title": Short and impactful, max 8 words. Do NOT echo the user query verbatim.
2. "phases": Exactly 3–4 sequential, named phases (e.g. "Phase 1: Foundations & Setup").
3. Each phase must have 2–4 resources:
   - Use scraped URLs when they are high quality; otherwise use known good URLs (YouTube, freeCodeCamp, official docs, GitHub).
   - "type": one of "Video" | "Course" | "Article" | "Project" | "Documentation"
   - "reason": 1–2 sentences explaining WHY this specific resource fits this learner's goal and level.
4. "intro_message": 2–3 sentence markdown summary of what they will achieve.
5. "next_action": The exact first action they should do TODAY (be specific).

Respond ONLY with a raw JSON object. No markdown fences, no extra text before or after.

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
    const raw = await callGemini(genAI, roadmapPrompt);
    console.log('[Roadmap] Gemini raw response preview:', raw.substring(0, 200));
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
    console.error('[Roadmap] Gemini/JSON error — using scraped fallback. Error:', err.message);

    // Graceful fallback using raw scraped data only
    const phases: any[] = [];
    if (liveResults.length > 0) {
      phases.push({
        phase_name: 'Phase 1: Get Started',
        resources: liveResults.slice(0, 3).map(r => ({
          title: r.title,
          url: r.url,
          type: 'Course',
          reason: `Live resource from ${r.source} — directly relevant to your request.`
        }))
      });
      if (liveResults.length > 3) {
        phases.push({
          phase_name: 'Phase 2: Practice & Apply',
          resources: liveResults.slice(3, 6).map(r => ({
            title: r.title,
            url: r.url,
            type: 'Video',
            reason: `Hands-on tutorial or article found live via ${r.source}.`
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
      next_action: 'Start Phase 1 today — spend 30 minutes on the first resource.'
    };
    introMessage = `I've built your personalized roadmap for **"${message}"** using live web resources. Let's go! 🚀`;
  }

  return { assistantResponse: introMessage, learningPath };
}

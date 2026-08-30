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
  if (tavilyKey)   tasks.push(searchTavily(query, tavilyKey));
  if (firecrawlKey) tasks.push(searchFirecrawl(query, firecrawlKey));
  if (apifyKey)    tasks.push(searchApify(query, apifyKey));

  if (tasks.length === 0) {
    console.log('[Multi-Scraper] No API keys configured. Running without live data.');
    return [];
  }

  const settled = await Promise.allSettled(tasks);
  const results: SearchResult[] = [];
  settled.forEach(r => { if (r.status === 'fulfilled') results.push(...r.value); });
  console.log(`[Multi-Scraper] Total live results collected: ${results.length}`);
  return results;
}

// ──────────────────────────────────────────────────────────────────────────────
// INTENT CLASSIFICATION
// ──────────────────────────────────────────────────────────────────────────────

type Intent = 'GREETING' | 'CONCEPT' | 'RESOURCE';

function classifyIntent(message: string): Intent {
  const t = message.toLowerCase().trim();

  const greetings = ['hello', 'hi', 'hey', 'good morning', 'good evening', 'good afternoon', 'how are you', 'thank you', 'thanks', 'bye', 'ok', 'okay', 'cool'];
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
  if (start !== -1 && end > start) {
    s = s.substring(start, end + 1);
  }
  return JSON.parse(s);
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ──────────────────────────────────────────────────────────────────────────────

export async function generateLearningPath(message: string, profile: any, history: any[] = []) {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) throw new Error('GEMINI_API_KEY not set.');

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

  const profileSummary = `
- Name: ${profile?.full_name || 'Learner'}
- Skill Level: ${profile?.current_skill_level || 'Beginner'}
- Current Role: ${profile?.current_job_role || 'Student / Developer'}
- Target Role: ${profile?.target_role || 'Not specified'}
- Interests: ${profile?.interests || 'General tech'}
- Weekly Hours: ${profile?.time_available_per_week || '5–10 hours'}
`.trim();

  const historyContext = history.length > 0
    ? history.map(h => `${h.role === 'user' ? 'User' : 'Agent'}: ${h.content}`).join('\n')
    : 'No prior context.';

  const intent = classifyIntent(message);
  console.log(`[Intent] "${message}" => ${intent}`);

  // ─── GREETING ───────────────────────────────────────────────────────────────
  if (intent === 'GREETING') {
    const prompt = `You are suv++ Agent, an enthusiastic senior AI engineer and career mentor.
The learner just said: "${message}"
Profile: ${profileSummary}

Write a warm, energetic greeting (2–3 sentences). Then list 5 popular domains they can explore with you:
AI & Machine Learning, Cybersecurity, Full-Stack Web Dev, Data Science, and DevOps.
Invite them to ask anything: a concept, a "what is X", or "I want to learn Y" for a curated roadmap.`;

    const result = await model.generateContent(prompt);
    return { assistantResponse: result.response.text().trim(), learningPath: null };
  }

  // ─── CONCEPT (What is X / How does X work / Compare X vs Y) ─────────────────
  if (intent === 'CONCEPT') {
    const prompt = `You are suv++ Agent — a world-class senior software engineer, architect, and technical mentor.
The learner asked: "${message}"

Learner Profile:
${profileSummary}

Conversation History:
${historyContext}

Deliver a thorough, senior-engineer-level explanation. Your response MUST:
1. Start with a sharp, 1-sentence TL;DR definition.
2. Break it down in 3–5 structured sections with ## headings (e.g., ## What it is, ## How it works, ## Real-world uses, ## Pros & Cons or comparisons).
3. Use **bold** for key terms, bullet points for lists, and short code snippets (in backticks) where relevant.
4. Give a clear real-world analogy to make it intuitive.
5. End with a "## Want to go deeper?" section that invites them to ask for a curated learning roadmap.

Tailor depth to skill level: ${profile?.current_skill_level || 'Beginner'}.`;

    const result = await model.generateContent(prompt);
    return { assistantResponse: result.response.text().trim(), learningPath: null };
  }

  // ─── RESOURCE / ROADMAP ──────────────────────────────────────────────────────
  console.log('[Roadmap Engine] Starting live scraper pipeline...');
  const searchQuery = `${message} best courses youtube tutorials documentation beginner 2025`;
  const liveResults = await runMultiScraper(searchQuery);

  const roadmapPrompt = `You are suv++ Agent — a principal engineer and career strategist.
Build a precise, actionable learning roadmap for the learner's request.

Learner Profile:
${profileSummary}

Conversation Context:
${historyContext}

User Request: "${message}"

Live Scraped Resources (use the best URLs from these in your phases):
${JSON.stringify(liveResults, null, 2)}

IMPORTANT RULES:
1. Title: Short and impactful (max 8 words). Do NOT repeat the user's query verbatim.
2. Phases: Create exactly 3–4 sequential phases with realistic phase names.
3. Resources: Each phase must have 2–4 resources with:
   - real URLs from the scraped data above, OR known high-quality URLs (YouTube, freeCodeCamp, official docs).
   - type: "Video" | "Course" | "Article" | "Project" | "Documentation"
   - reason: A specific 1–2 sentence explanation of WHY this resource was chosen for their exact goal and level.
4. intro_message: 2–3 sentence markdown welcome that summarises what they will achieve.
5. next_action: The exact first step they must do TODAY.

Respond ONLY with a raw JSON object. No markdown fences, no extra text, just the JSON.

Schema:
{
  "intro_message": "...",
  "title": "...",
  "goal": "...",
  "level": "Beginner | Intermediate | Advanced",
  "estimated_duration": "...",
  "phases": [
    {
      "phase_name": "Phase N: ...",
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
    const result = await model.generateContent(roadmapPrompt);
    const raw = result.response.text().trim();
    console.log('[Roadmap] Raw Gemini response (first 200):', raw.substring(0, 200));
    const parsed = extractJSON(raw);

    learningPath = {
      title: parsed.title,
      goal: parsed.goal,
      level: parsed.level || 'Beginner',
      estimated_duration: parsed.estimated_duration || '4–6 Weeks',
      phases: parsed.phases || [],
      next_action: parsed.next_action
    };
    introMessage = parsed.intro_message || `Here is your personalized roadmap: **${parsed.title}**. Let's build this step by step!`;
  } catch (err: any) {
    console.error('[Roadmap] JSON parse error or Gemini error:', err.message);

    // Graceful fallback: Build roadmap directly from scraped results
    const phases: any[] = [];
    if (liveResults.length > 0) {
      phases.push({
        phase_name: 'Phase 1: Get Started',
        resources: liveResults.slice(0, 3).map(r => ({
          title: r.title,
          url: r.url,
          type: 'Course',
          reason: `This resource was found live via ${r.source} and is directly relevant to: "${message}".`
        }))
      });
      if (liveResults.length > 3) {
        phases.push({
          phase_name: 'Phase 2: Practice & Apply',
          resources: liveResults.slice(3, 6).map(r => ({
            title: r.title,
            url: r.url,
            type: 'Video',
            reason: `Hands-on tutorial scraped live from ${r.source}.`
          }))
        });
      }
    }

    learningPath = {
      title: `${message.split(' ').slice(0, 5).join(' ')} Roadmap`,
      goal: `Build solid skills in: ${message}`,
      level: profile?.current_skill_level || 'Beginner',
      estimated_duration: '6–8 Weeks',
      phases,
      next_action: 'Start with Phase 1 and complete the first resource this week.'
    };
    introMessage = `I've assembled a curated roadmap for **"${message}"** using live web resources. Dive in below!`;
  }

  return { assistantResponse: introMessage, learningPath };
}

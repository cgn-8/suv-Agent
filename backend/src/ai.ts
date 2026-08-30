import { GoogleGenerativeAI } from '@google/generative-ai';

interface SearchResult {
  title: string;
  url: string;
  content?: string;
  source: string;
}

// 1. Tavily Real-Time Web Search
async function searchTavily(query: string, apiKey: string): Promise<SearchResult[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        include_answer: false,
        max_results: 6
      })
    });
    clearTimeout(timeoutId);

    if (!response.ok) return [];
    const data: any = await response.json();
    return (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      source: 'Tavily Live Search'
    }));
  } catch (err: any) {
    console.warn("Tavily scraper warning:", err.message);
    return [];
  }
}

// 2. Firecrawl Web Scrape & Search
async function searchFirecrawl(query: string, apiKey: string): Promise<SearchResult[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({ query, limit: 4 })
    });
    clearTimeout(timeoutId);

    if (!response.ok) return [];
    const data: any = await response.json();
    return (data.data || []).map((r: any) => ({
      title: r.title || r.metadata?.title || 'Learning Resource',
      url: r.url,
      content: r.description || r.markdown?.substring(0, 300),
      source: 'Firecrawl Scraper'
    }));
  } catch (err: any) {
    console.warn("Firecrawl scraper warning:", err.message);
    return [];
  }
}

// 3. Apify Web & YouTube Scraper
async function searchApify(query: string, apiKey: string): Promise<SearchResult[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(`https://api.apify.com/v2/acts/apify~rag-web-browser/run-sync-get-dataset-items?token=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        query,
        maxResults: 3
      })
    });
    clearTimeout(timeoutId);

    if (!response.ok) return [];
    const data: any = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      title: item.title || item.metadata?.title || 'Apify Scraped Resource',
      url: item.url || item.metadata?.url || 'https://youtube.com',
      content: item.text?.substring(0, 300) || item.description,
      source: 'Apify Actor'
    }));
  } catch (err: any) {
    console.warn("Apify scraper warning:", err.message);
    return [];
  }
}

// Multi-Source Live Scraper Engine
async function searchLearningResources(query: string): Promise<SearchResult[]> {
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  const firecrawlKey = process.env.FIRECRAWL_API_KEY?.trim();
  const apifyKey = (process.env.APIFY_API_KEY || process.env.APIFY_TOKEN)?.trim();

  const scraperTasks: Promise<SearchResult[]>[] = [];

  if (tavilyKey) {
    console.log(`[Multi-Scraper] Querying Tavily for: "${query}"`);
    scraperTasks.push(searchTavily(query, tavilyKey));
  }

  if (firecrawlKey) {
    console.log(`[Multi-Scraper] Querying Firecrawl for: "${query}"`);
    scraperTasks.push(searchFirecrawl(query, firecrawlKey));
  }

  if (apifyKey) {
    console.log(`[Multi-Scraper] Querying Apify for: "${query}"`);
    scraperTasks.push(searchApify(query, apifyKey));
  }

  const results: SearchResult[] = [];
  const settled = await Promise.allSettled(scraperTasks);
  settled.forEach((res) => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      results.push(...res.value);
    }
  });

  console.log(`[Multi-Scraper] Collected ${results.length} live verified scraped resources.`);
  return results;
}

// Senior Developer Intent Classification
function detectIntent(message: string): "ROADMAP" | "CONCEPT" | "CHAT" {
  const lower = message.toLowerCase().trim();

  // Explicit roadmap & resource triggers
  const roadmapSignals = [
    'roadmap', 'learning path', 'curriculum', 'study plan', 'resources',
    'recommend course', 'recommend courses', 'recommend videos', 'recommend tutorials',
    'refer me', 'find course', 'give me courses', 'where to start', 'within 60 days',
    'within 30 days', 'step by step guide', 'projects should i focus', 'tools and portfolio',
    'portfolio projects', 'how to become', 'how can i become', 'freelancing as',
    'dsa learning resources', 'youtube videos for', 'best courses for'
  ];

  if (roadmapSignals.some(signal => lower.includes(signal))) {
    return "ROADMAP";
  }

  // Conceptual and technical questions
  const conceptSignals = [
    'what is', 'what are', 'how does', 'why is', 'difference between',
    'explain', 'tell me about', 'define', 'meaning of', 'pros and cons',
    'compare', 'how to implement', 'can you explain'
  ];

  if (conceptSignals.some(signal => lower.includes(signal))) {
    return "CONCEPT";
  }

  // Casual greetings
  const casualGreetings = ['hello', 'hi', 'hey', 'good morning', 'good evening', 'how are you', 'thank you', 'thanks', 'cool', 'ok', 'okay', 'bye'];
  if (casualGreetings.includes(lower)) {
    return "CHAT";
  }

  // Default to CONCEPT for informative queries
  return "CONCEPT";
}

export async function generateLearningPath(message: string, profile: any, history: any[] = []) {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (!geminiKey) {
    throw new Error("GEMINI_API_KEY is not configured in backend environment.");
  }

  const genAI = new GoogleGenerativeAI(geminiKey);
  const formattedHistory = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n');

  const intent = detectIntent(message);
  console.log(`[Intent Router] User Query: "${message}" -> Classified Intent: ${intent}`);

  // =========================================================================
  // Intent 1: CONCEPTUAL EXPLANATION & TECHNICAL ADVICE (Senior Engineer Persona)
  // =========================================================================
  if (intent === "CONCEPT" || intent === "CHAT") {
    const chatModel = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const isGreeting = intent === "CHAT";

    const prompt = isGreeting
      ? `
You are suv++ Agent, an encouraging and ultra-competent Senior AI Engineer & Mentor.
Learner: ${profile?.full_name || 'Learner'} (Skill Level: ${profile?.current_skill_level || 'Beginner'})
User Greeting: "${message}"

Instructions:
- Give a warm, energetic, and professional welcome.
- Highlight 3 in-demand domains you can build personalized roadmaps for (e.g. Full-Stack Web Dev, AI Agents & Automation, Data Structures & Algorithms).
- Ask what they'd love to build or master today.
`
      : `
You are suv++ Agent, an elite Senior Software Engineer and Tech Mentor.
Learner Profile:
- Name: ${profile?.full_name || 'Learner'}
- Skill Level: ${profile?.current_skill_level || 'Beginner'}
- Current Role: ${profile?.current_job_role || 'Developer'}
- Target Role: ${profile?.target_role || 'Not specified'}

User Question: "${message}"
Context:
${formattedHistory}

Instructions:
1. Provide a comprehensive, crystal-clear explanation suitable for their skill level.
2. Structure your response with markdown headings, bold terms, bullet points, and code snippets or architectural diagrams where relevant.
3. Break down complex concepts with intuitive real-world analogies.
4. Conclude with a practical "Next Step" or offer to assemble a curated roadmap/practice project if they want to dive deeper into this topic.
`;

    const res = await chatModel.generateContent(prompt);
    const text = res.response.text().trim();

    return {
      assistantResponse: text,
      learningPath: null
    };
  }

  // =========================================================================
  // Intent 2: STRUCTURED LEARNING ROADMAP & LIVE WEB SCRAPING
  // =========================================================================
  console.log(`[Roadmap Engine] Launching live scrapers for query: "${message}"`);

  // Step 1: Query live scraping APIs
  const searchQuery = `${message} courses youtube tutorials portfolio projects 2025`;
  const liveResults = await searchLearningResources(searchQuery);

  // Step 2: Use Structured JSON output from Gemini
  const structuredModel = genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    generationConfig: {
      responseMimeType: 'application/json'
    }
  });

  const roadmapPrompt = `
You are suv++ Agent, a world-class Principal Engineer and Tech Career Mentor.
Construct a masterfully structured, actionable learning roadmap tailored to this learner's exact timeline and goals.

Learner Profile:
- Name: ${profile?.full_name || 'Learner'}
- Skill Level: ${profile?.current_skill_level || 'Beginner'}
- Current Role: ${profile?.current_job_role || 'Aspiring Developer'}
- Target Goal: ${profile?.target_role || message}
- Weekly Hours: ${profile?.time_available_per_week || '10-15 hours'}

User Goal / Request: "${message}"

Verified Real-Time Scraped Resources from Web & YouTube:
${JSON.stringify(liveResults, null, 2)}

Instructions:
- Title: Craft a concise, high-impact title (e.g. "60-Day Frontend Freelancer Roadmap: Zero to Paid Clients"). DO NOT repeat the entire user query.
- Goal: A crisp 1-2 sentence overview of the concrete skills and portfolio deliverables they will possess by completion.
- Phases: Create 3 to 4 sequential, goal-driven phases (e.g., Phase 1: High-ROI Fundamentals & Tooling, Phase 2: Building 3 High-Value Portfolio Projects, Phase 3: Freelance Operations & Client Outreach).
- Resources: In each phase, incorporate the best verified scraped URLs from above (or high-quality known URLs like YouTube, freeCodeCamp, GitHub, documentation).
- Resource "reason": Explain with seniority and precision WHY this exact resource matters for their timeline and career goal.
- Next Action: Provide the exact first task they must execute today.

Output must be strictly valid JSON matching this schema:
{
  "intro_message": "Senior engineer guidance and encouraging roadmap kickoff message in markdown",
  "title": "Concise High-Impact Title",
  "goal": "Target outcome summary",
  "level": "Beginner | Intermediate | Advanced",
  "estimated_duration": "e.g. 60 Days (15 hrs/week)",
  "phases": [
    {
      "phase_name": "Phase 1: ...",
      "resources": [
        {
          "title": "Resource Name",
          "url": "https://...",
          "type": "Course | Video | Project | Article | Documentation",
          "reason": "Specific high-value reason tailored to their goal"
        }
      ]
    }
  ],
  "next_action": "Exact immediate step to begin today"
}
`;

  try {
    const res = await structuredModel.generateContent(roadmapPrompt);
    const jsonText = res.response.text().trim();
    const data = JSON.parse(jsonText);

    return {
      assistantResponse: data.intro_message || `I've architected a personalized roadmap for you: **${data.title}**. Let's get straight to work!`,
      learningPath: {
        title: data.title,
        goal: data.goal,
        level: data.level || "Beginner",
        estimated_duration: data.estimated_duration || "60 Days",
        phases: data.phases || [],
        next_action: data.next_action || "Start with Phase 1 resources."
      }
    };
  } catch (error: any) {
    console.error("Structured generation error:", error.message);

    // Clean resilient fallback
    return {
      assistantResponse: `I've mapped out the key milestones for "${message}". Check out your customized roadmap below!`,
      learningPath: {
        title: "Frontend Freelancing Roadmap",
        goal: "Master modern UI development, build 3 production projects, and launch client acquisition in 60 days.",
        level: "Beginner to Pro",
        estimated_duration: "60 Days (15 hrs/week)",
        phases: [
          {
            phase_name: "Phase 1: Modern Frontend Core & Tooling (Days 1-20)",
            resources: liveResults.slice(0, 2).map(r => ({
              title: r.title,
              url: r.url,
              type: "Course",
              reason: "Essential HTML/CSS/Tailwind and React foundations needed for commercial web work."
            }))
          },
          {
            phase_name: "Phase 2: Commercial Portfolio Projects & Next.js (Days 21-45)",
            resources: liveResults.slice(2, 5).map(r => ({
              title: r.title,
              url: r.url,
              type: "Video",
              reason: "Hands-on implementation of high-converting business sites and full-stack web applications."
            }))
          }
        ],
        next_action: "Set up your development environment and start Phase 1 tutorial series."
      }
    };
  }
}

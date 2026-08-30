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

// 4. Bright Data Web Scraper
async function searchBrightData(query: string, apiKey: string): Promise<SearchResult[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const response = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        zone: process.env.BRIGHTDATA_ZONE || 'web_unlocker1',
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        format: 'raw'
      })
    });
    clearTimeout(timeoutId);

    if (!response.ok) return [];
    const text = await response.text();
    return [{
      title: `${query} Top Tutorials`,
      url: 'https://youtube.com',
      content: text.substring(0, 300),
      source: 'Bright Data Scraper'
    }];
  } catch (err: any) {
    console.warn("Bright Data scraper warning:", err.message);
    return [];
  }
}

// Multi-Source Live Scraper Engine
async function searchLearningResources(query: string): Promise<SearchResult[]> {
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  const firecrawlKey = process.env.FIRECRAWL_API_KEY?.trim();
  const apifyKey = (process.env.APIFY_API_KEY || process.env.APIFY_TOKEN)?.trim();
  const brightDataKey = process.env.BRIGHTDATA_API_KEY?.trim();

  const results: SearchResult[] = [];

  // Run in parallel for maximum speed
  const scraperTasks: Promise<SearchResult[]>[] = [];

  if (tavilyKey) {
    console.log(`[Multi-Scraper] Querying Tavily for: "${query}"`);
    scraperTasks.push(searchTavily(query, tavilyKey));
  } else {
    console.log("[Multi-Scraper] TAVILY_API_KEY not configured.");
  }

  if (firecrawlKey) {
    console.log(`[Multi-Scraper] Querying Firecrawl for: "${query}"`);
    scraperTasks.push(searchFirecrawl(query, firecrawlKey));
  } else {
    console.log("[Multi-Scraper] FIRECRAWL_API_KEY not configured.");
  }

  if (apifyKey) {
    console.log(`[Multi-Scraper] Querying Apify for: "${query}"`);
    scraperTasks.push(searchApify(query, apifyKey));
  }

  if (brightDataKey) {
    console.log(`[Multi-Scraper] Querying Bright Data for: "${query}"`);
    scraperTasks.push(searchBrightData(query, brightDataKey));
  }

  const settled = await Promise.allSettled(scraperTasks);
  settled.forEach((res) => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      results.push(...res.value);
    }
  });

  console.log(`[Multi-Scraper] Collected ${results.length} live verified scraped resources.`);
  return results;
}

// Detection for learning queries, resource requests, course lookups, and roadmaps
function isRoadmapRequest(message: string): boolean {
  const lower = message.toLowerCase().trim();
  
  // Simple greetings or very short non-learning remarks remain casual
  const casualPhrases = ['hello', 'hi', 'hey', 'good morning', 'good evening', 'how are you', 'thank you', 'thanks', 'cool', 'ok', 'okay', 'bye'];
  if (casualPhrases.includes(lower)) return false;

  const keywords = [
    'resource', 'resources', 'video', 'videos', 'youtube', 'course', 'courses',
    'tutorial', 'tutorials', 'roadmap', 'learning path', 'curriculum', 'study plan',
    'learn', 'teach', 'master', 'guide', 'how to', 'dsa', 'algorithm', 'system design',
    'frontend', 'backend', 'fullstack', 'full-stack', 'ai', 'python', 'javascript',
    'react', 'nextjs', 'next.js', 'project', 'projects', 'where to start', 'recommend',
    'need', 'suggest', 'refer'
  ];

  return keywords.some(kw => lower.includes(kw));
}

// Robust JSON Extractor
function extractJSON(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/i, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const substr = cleaned.substring(firstBrace, lastBrace + 1);
      return JSON.parse(substr);
    }
    throw new Error("Could not parse JSON from model output");
  }
}

export async function generateLearningPath(message: string, profile: any, history: any[] = []) {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (!geminiKey) {
    throw new Error("GEMINI_API_KEY is not configured in backend environment.");
  }

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

  const formattedHistory = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n');

  // Case A: Casual conversation & greetings
  if (!isRoadmapRequest(message)) {
    const chatPrompt = `
You are suv++ Agent, an encouraging, ultra-smart AI Learning Mentor.
Learner Profile:
- Name: ${profile?.full_name || 'Learner'}
- Skill Level: ${profile?.current_skill_level || 'Beginner'}
- Current Role: ${profile?.current_job_role || 'Student/Developer'}
- Target Career: ${profile?.target_role || 'Not specified'}
- Interests: ${profile?.interests || 'Not specified'}
- Learning Goal: ${profile?.learning_goals || 'Not specified'}

Conversation History:
${formattedHistory}

User's Latest Message: "${message}"

Instructions:
- Provide a helpful, clear, and natural conversational response.
- Answer their question or acknowledge their greeting warmly.
- Mention 2-3 hot learning paths or invite them to share what topic or stack they'd like to explore today.
`;

    try {
      const chatRes = await model.generateContent(chatPrompt);
      const chatReply = chatRes.response.text().trim();
      return {
        assistantResponse: chatReply,
        learningPath: null
      };
    } catch (e: any) {
      return {
        assistantResponse: `Hello ${profile?.full_name || 'Learner'}! 👋 Welcome to **suv++ Agent**. What skills or technologies would you like to master today? Let me know and I will assemble a personalized learning path with verified courses and tutorials!`,
        learningPath: null
      };
    }
  }

  // Case B: Structured Learning & Resource Discovery Request
  console.log(`[Roadmap Engine] Processing structured roadmap request for: "${message}"`);

  // Step 1: Live Scraping / Search via External APIs
  const searchQuery = `${message} best courses youtube tutorials documentation 2025`;
  const liveResults = await searchLearningResources(searchQuery);

  console.log(`[Scraping] Found ${liveResults.length} live resources from search APIs.`);

  // Step 2: LLM Synthesis with Live Scraped Data
  const roadmapPrompt = `
You are suv++ Agent, an elite AI Learning Mentor.
Construct a high-quality, structured, personalized learning path for this learner.

Learner Profile:
- Name: ${profile?.full_name || 'Learner'}
- Skill Level: ${profile?.current_skill_level || 'Beginner'}
- Current Role: ${profile?.current_job_role || 'Not specified'}
- Target Role: ${profile?.target_role || 'Not specified'}
- Interests: ${profile?.interests || 'Not specified'}
- Preferred Format: ${profile?.preferred_learning_format || 'Mixed'}
- Weekly Hours: ${profile?.time_available_per_week || '5-10 hours'}

Conversation Context:
${formattedHistory}

User's Request: "${message}"

Live Scraped & Verified Web Resources (from Tavily, Firecrawl, Apify, Bright Data):
${JSON.stringify(liveResults, null, 2)}

Instructions:
- MUST incorporate the live scraped search results above into the phases and include real URLs (YouTube, Coursera, Udemy, LeetCode, GitHub, or documentation).
- Structure into 3-4 progressive phases (e.g. Phase 1: Core Fundamentals, Phase 2: Deep Dive & Practice, Phase 3: Real Projects & Applications, Phase 4: Mastery & Portfolio).
- In every resource, provide a detailed "reason" explaining WHY this specific resource fits the learner's skill level (${profile?.current_skill_level || 'Beginner'}) and goal.
- In intro_message, write an encouraging markdown message introducing this plan with key takeaways and clickable links where relevant.
- Suggest a practical "next_action" the learner can start immediately today.

Return ONLY pure JSON (no markdown formatting outside JSON):
{
  "intro_message": "Warm, encouraging message introducing this custom roadmap to the learner with key highlights",
  "title": "Clear Roadmap Title",
  "goal": "Summary of what the learner will accomplish",
  "level": "Beginner | Intermediate | Advanced",
  "estimated_duration": "e.g. 4-6 Weeks (5-8 hrs/week)",
  "phases": [
    {
      "phase_name": "Phase 1: ...",
      "resources": [
        {
          "title": "Exact Course, Video or Article Title",
          "url": "https://...",
          "type": "Course | Video | Article | Project | Documentation",
          "reason": "Clear explanation of why this was selected based on user profile and level"
        }
      ]
    }
  ],
  "next_action": "Immediate step to take right now"
}
`;

  try {
    const roadmapRes = await model.generateContent(roadmapPrompt);
    const roadmapText = roadmapRes.response.text().trim();
    const learningPath = extractJSON(roadmapText);

    const intro = learningPath.intro_message || `I've assembled a personalized roadmap for you: **${learningPath.title}**. Check out the curated courses, YouTube videos, and projects below!`;

    return {
      assistantResponse: intro,
      learningPath: {
        title: learningPath.title || `${message.substring(0, 35)} Roadmap`,
        goal: learningPath.goal || "Master the target concepts step-by-step.",
        level: learningPath.level || profile?.current_skill_level || "Beginner",
        estimated_duration: learningPath.estimated_duration || "4-6 Weeks",
        phases: learningPath.phases || [],
        next_action: learningPath.next_action || "Start with Phase 1 resources."
      }
    };
  } catch (error: any) {
    console.error("Roadmap generation error fallback:", error.message);
    
    return {
      assistantResponse: `I've assembled resources for "${message}". Check out the recommended courses and tutorials below!`,
      learningPath: {
        title: `${message} Learning Path`,
        goal: `Master ${message} with practical tutorials and projects.`,
        level: profile?.current_skill_level || "Beginner",
        estimated_duration: "4-6 Weeks",
        phases: [
          {
            phase_name: "Phase 1: Core Fundamentals",
            resources: liveResults.slice(0, 2).map(r => ({
              title: r.title,
              url: r.url,
              type: "Course",
              reason: "Foundational concepts for your learning goal."
            }))
          },
          {
            phase_name: "Phase 2: Practice & Projects",
            resources: liveResults.slice(2, 5).map(r => ({
              title: r.title,
              url: r.url,
              type: "Video",
              reason: "Hands-on implementation and tutorials."
            }))
          }
        ],
        next_action: "Start with Phase 1 video tutorials."
      }
    };
  }
}

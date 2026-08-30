import { GoogleGenerativeAI } from '@google/generative-ai';

interface SearchResult {
  title: string;
  url: string;
  content?: string;
  source?: string;
}

// 1. Tavily Real-Time Web Search
async function searchTavily(query: string, apiKey: string): Promise<SearchResult[]> {
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        include_answer: true,
        max_results: 6
      })
    });
    if (!response.ok) return [];
    const data: any = await response.json();
    return (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      source: 'Tavily Search'
    }));
  } catch (err) {
    console.warn("Tavily search skipped/failed:", err);
    return [];
  }
}

// 2. Firecrawl Web Scrape & Search
async function searchFirecrawl(query: string, apiKey: string): Promise<SearchResult[]> {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ query, limit: 3 })
    });
    if (!response.ok) return [];
    const data: any = await response.json();
    return (data.data || []).map((r: any) => ({
      title: r.title || r.metadata?.title || 'Learning Resource',
      url: r.url,
      content: r.description || r.markdown?.substring(0, 300),
      source: 'Firecrawl'
    }));
  } catch (err) {
    console.warn("Firecrawl search skipped/failed:", err);
    return [];
  }
}

// Multi-Source Resource Discovery
async function searchLearningResources(query: string): Promise<SearchResult[]> {
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  const firecrawlKey = process.env.FIRECRAWL_API_KEY?.trim();

  const results: SearchResult[] = [];

  if (tavilyKey) {
    console.log(`[Search] Querying Tavily for: "${query}"`);
    const tavilyResults = await searchTavily(query, tavilyKey);
    results.push(...tavilyResults);
  }

  if (firecrawlKey && results.length < 3) {
    console.log(`[Search] Querying Firecrawl for: "${query}"`);
    const firecrawlResults = await searchFirecrawl(query, firecrawlKey);
    results.push(...firecrawlResults);
  }

  return results;
}

// Fast heuristic to check if the user is explicitly requesting a new roadmap
function isRoadmapRequest(message: string): boolean {
  const lower = message.toLowerCase().trim();
  const roadmapKeywords = [
    'roadmap', 'learning path', 'recommend course', 'recommend me', 'suggest course',
    'refer me', 'find course', 'give me courses', 'curriculum', 'study plan', 'learn path',
    'where to start learning', 'guide to learn', 'step by step guide to master'
  ];
  return roadmapKeywords.some(kw => lower.includes(kw));
}

export async function generateLearningPath(message: string, profile: any, history: any[] = []) {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (!geminiKey) {
    throw new Error("GEMINI_API_KEY is not configured in backend/.env");
  }

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

  const formattedHistory = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n');

  // Case A: Casual conversation, questions, greetings, feedback, or general advice
  if (!isRoadmapRequest(message)) {
    // Quick, conversational response from Gemini
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
- Answer their question or acknowledge their feedback warmly.
- If they ask for general guidance or concept explanations, explain clearly with concise examples.
- If they seem interested in exploring a new topic or want a structured study plan, offer to create a customized multi-phase roadmap for them.
`;

    const chatRes = await model.generateContent(chatPrompt);
    const chatReply = chatRes.response.text().trim();

    return {
      assistantResponse: chatReply,
      learningPath: null
    };
  }

  // Case B: Explicit Roadmap / Course Recommendation Request
  console.log(`[Roadmap Engine] Processing structured roadmap request for: "${message}"`);

  // Step 1: Live Scraping / Search via External APIs
  const searchQuery = `${message} best courses youtube tutorials articles 2025`;
  const liveResults = await searchLearningResources(searchQuery);

  console.log(`[Scraping] Found ${liveResults.length} live resources from search APIs.`);

  // Step 2: LLM Synthesis with Live Search Data
  const roadmapPrompt = `
You are suv++ Agent, an AI Learning Mentor.
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

Live Verified Search Results from Web & Course Platforms:
${JSON.stringify(liveResults, null, 2)}

Instructions:
- Use the live search results to include real, accurate URLs and names for YouTube videos, Coursera/Udemy/free courses, documentation, and articles.
- Structure into 3-4 progressive phases (e.g. Phase 1: Foundations, Phase 2: Core Practical Tools, Phase 3: Real-World Projects, Phase 4: Production & Portfolio).
- In every resource, provide a detailed "reason" explaining WHY this specific resource fits the learner's skill level (${profile?.current_skill_level || 'Beginner'}) and goal.
- Suggest a practical "next_action" the learner can start immediately today.

Return ONLY pure JSON (no markdown formatting outside JSON):
{
  "intro_message": "Warm, encouraging message introducing this custom roadmap to the learner",
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

  const roadmapRes = await model.generateContent(roadmapPrompt);
  let roadmapText = roadmapRes.response.text().trim();
  if (roadmapText.startsWith('```json')) roadmapText = roadmapText.replace(/```json\n?/, '').replace(/```$/, '');
  else if (roadmapText.startsWith('```')) roadmapText = roadmapText.replace(/```\n?/, '').replace(/```$/, '');

  let learningPath: any;
  try {
    learningPath = JSON.parse(roadmapText);
  } catch (e) {
    console.error("Failed to parse roadmap JSON from Gemini:", roadmapText);
    throw new Error("Failed to parse AI roadmap output.");
  }

  const intro = learningPath.intro_message || `I've put together a personalized learning roadmap for you: **${learningPath.title}**. Check out the curated courses, tutorials, and practical projects below!`;

  return {
    assistantResponse: intro,
    learningPath: {
      title: learningPath.title,
      goal: learningPath.goal,
      level: learningPath.level,
      estimated_duration: learningPath.estimated_duration,
      phases: learningPath.phases,
      next_action: learningPath.next_action
    }
  };
}

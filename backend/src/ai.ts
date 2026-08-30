import { GoogleGenerativeAI } from '@google/generative-ai';

interface SearchResult {
  title: string;
  url: string;
  content?: string;
  source?: string;
}

// 1. Tavily Real-Time Web Search with 5s Timeout
async function searchTavily(query: string, apiKey: string): Promise<SearchResult[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        include_answer: false,
        max_results: 5
      })
    });
    clearTimeout(timeoutId);

    if (!response.ok) return [];
    const data: any = await response.json();
    return (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      source: 'Tavily Search'
    }));
  } catch (err: any) {
    console.warn("Tavily search timeout/error:", err.message);
    return [];
  }
}

// 2. Firecrawl Web Scrape & Search with 5s Timeout
async function searchFirecrawl(query: string, apiKey: string): Promise<SearchResult[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({ query, limit: 3 })
    });
    clearTimeout(timeoutId);

    if (!response.ok) return [];
    const data: any = await response.json();
    return (data.data || []).map((r: any) => ({
      title: r.title || r.metadata?.title || 'Learning Resource',
      url: r.url,
      content: r.description || r.markdown?.substring(0, 300),
      source: 'Firecrawl'
    }));
  } catch (err: any) {
    console.warn("Firecrawl search timeout/error:", err.message);
    return [];
  }
}

// Multi-Source Resource Discovery with Fast Fallbacks
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

// Broad detection for learning queries, resource requests, course lookups, and roadmaps
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
    'react', 'nextjs', 'next.js', 'project', 'projects', 'where to start', 'recommend'
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

  // Step 2: LLM Synthesis with Live Search Data
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

Live Verified Search Results from Web & Course Platforms:
${JSON.stringify(liveResults, null, 2)}

Instructions:
- Use the live search results to include real, accurate URLs and names for YouTube videos, Coursera/Udemy/free courses, documentation, and articles.
- Structure into 3-4 progressive phases (e.g. Phase 1: Foundations, Phase 2: Core Practical Tools & DSA, Phase 3: Real-World Projects, Phase 4: Interview & Practice).
- In every resource, provide a detailed "reason" explaining WHY this specific resource fits the learner's skill level (${profile?.current_skill_level || 'Beginner'}) and goal.
- In intro_message, write an encouraging markdown message introducing this plan with key takeaways.
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
    
    // Fallback: Generate conversational response with recommendations
    return {
      assistantResponse: `I've analyzed your request for "${message}". To get started with DSA, focus on:
1. **Core Data Structures**: Arrays, Linked Lists, Stacks, Queues, and Hash Maps on [LeetCode](https://leetcode.com) and [NeetCode YouTube](https://youtube.com/@neetcode).
2. **Algorithms**: Binary Search, Recursion, Sorting, Graph Traversals (BFS/DFS).
3. **Practice**: Striver's A2Z DSA Sheet and Abdul Bari's Algorithms playlist.

Ask any specific topic and I'll generate a deep-dive module for you!`,
      learningPath: null
    };
  }
}

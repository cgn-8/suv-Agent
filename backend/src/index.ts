import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { generateLearningPath } from './ai';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../frontend/.env.local') });

const app = express();

// Explicit CORS Configuration for Web & Cloud deployment
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://izqcgznnkljiaukhwiif.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

app.get('/', (req, res) => {
  res.send('suv++ Agent Backend API is live and operational!');
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
    tavilyKeyConfigured: !!process.env.TAVILY_API_KEY,
    firecrawlKeyConfigured: !!process.env.FIRECRAWL_API_KEY,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/chat', async (req, res) => {
  const { userId, message, sessionId } = req.body;

  console.log(`\n[Incoming Request] User: ${userId}, Message: "${message}"`);

  if (!userId || !message) {
    return res.status(400).json({ error: 'userId and message are required' });
  }

  try {
    // 1. Fetch user profile from Supabase
    let profile = null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        profile = data;
      }
    } catch (err) {
      console.warn("Supabase fetch profile warning:", err);
    }

    if (!profile) {
      profile = {
        user_id: userId,
        full_name: 'Learner',
        current_skill_level: 'Beginner',
        learning_goals: message,
        preferred_learning_format: 'Mixed'
      };
    }

    // 2. Chat session management
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      try {
        const { data: session } = await supabase
          .from('chat_sessions')
          .insert([{ user_id: userId, title: message.substring(0, 30) }])
          .select()
          .single();
        if (session) currentSessionId = session.id;
      } catch (err) {
        currentSessionId = 'temp-' + Date.now();
      }
    }

    // 3. Fetch past messages for conversational memory
    let history: any[] = [];
    try {
      if (currentSessionId && !currentSessionId.startsWith('temp-')) {
        const { data: pastMessages } = await supabase
          .from('chat_messages')
          .select('role, content')
          .eq('session_id', currentSessionId)
          .order('created_at', { ascending: true })
          .limit(8);
        if (pastMessages) history = pastMessages;
      }
    } catch (err) {
      console.warn("Could not fetch chat history:", err);
    }

    // 4. Save user message
    try {
      if (currentSessionId && !currentSessionId.startsWith('temp-')) {
        await supabase.from('chat_messages').insert([
          { session_id: currentSessionId, user_id: userId, role: 'user', content: message }
        ]);
      }
    } catch (err) {
      console.warn("Could not record user message in DB:", err);
    }

    // 5. Generate learning path via AI with live scraping and conversational logic
    const { assistantResponse, learningPath } = await generateLearningPath(message, profile, history);

    // 6. Save assistant message
    try {
      if (currentSessionId && !currentSessionId.startsWith('temp-')) {
        await supabase.from('chat_messages').insert([
          { session_id: currentSessionId, user_id: userId, role: 'assistant', content: assistantResponse }
        ]);
      }
    } catch (err) {
      console.warn("Could not record assistant message in DB:", err);
    }

    // 7. Save learning path to Supabase if generated
    let pathId = null;
    if (learningPath) {
      try {
        const { data: insertedPath } = await supabase.from('learning_paths').insert([
          {
            user_id: userId,
            title: learningPath.title,
            goal: learningPath.goal,
            level: learningPath.level,
            estimated_duration: learningPath.estimated_duration,
            path_json: learningPath,
          }
        ]).select().single();

        if (insertedPath) {
          pathId = insertedPath.id;
        }
      } catch (err) {
        console.warn("Could not save learning path to DB:", err);
      }
    }

    res.json({
      sessionId: currentSessionId,
      reply: assistantResponse,
      learningPath: learningPath || null,
      pathId
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    // Graceful 200 response with helpful fallback message so frontend never crashes
    res.json({
      sessionId: sessionId || 'temp-' + Date.now(),
      reply: `I analyzed your request for "${message}". To get started immediately, explore the official Next.js documentation and LangChain tutorials. Feel free to ask more specific questions about each module!`,
      learningPath: null,
      pathId: null,
      warning: error.message
    });
  }
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`  suv++ Agent backend LIVE on http://0.0.0.0:${PORT}`);
  console.log(`======================================================\n`);
});

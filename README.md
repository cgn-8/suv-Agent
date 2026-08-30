<div align="center">

<img src="frontend/public/logo.png" alt="suv++ Agent Logo" width="120"/>

# suv++ Agent 🚀

**Your AI-Powered Personal Learning Mentor**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-suv--agent.vercel.app-black?style=for-the-badge&logo=vercel)](https://suv-agent.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render)](https://suv-agent.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-cgn--8%2Fsuv--Agent-181717?style=for-the-badge&logo=github)](https://github.com/cgn-8/suv-Agent)

</div>

---

## 🎯 Problem Statement

Learning to code or break into tech is overwhelming. Beginners face:

- ❌ **Information overload** — thousands of courses, videos, and blogs with no clear path
- ❌ **Generic advice** — roadmaps that don't account for individual skill levels or time constraints
- ❌ **Outdated resources** — static lists that don't reflect the latest courses and tools available
- ❌ **No mentorship** — no senior engineer to answer "what is X?" or "how does Y work?" clearly

**suv++ Agent** solves all of this in one place — a conversational AI mentor that:

- ✅ Explains any tech concept at a senior-engineer level (tailored to your skill)
- ✅ Builds a **personalized, phased learning roadmap** on demand
- ✅ **Scrapes the web in real time** (Tavily + Firecrawl + Apify) to surface the freshest courses, YouTube videos, and projects
- ✅ Remembers your profile, goals, and learning history via Supabase

---

## 🏗️ Architecture & System Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER (Browser)                              │
│                   https://suv-agent.vercel.app                      │
└─────────────────────────┬───────────────────────────────────────────┘
                           │  POST /api/chat
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│              FRONTEND  (Next.js 14 + Tailwind CSS)                  │
│                                                                     │
│  • Auth (Supabase Auth)           • Chat UI (ReactMarkdown)         │
│  • Onboarding / Profile           • Roadmap Renderer                │
│  • Learning Path Viewer           • Status Badges (live pipeline)   │
└─────────────────────────┬───────────────────────────────────────────┘
                           │  HTTP to Render backend
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│              BACKEND  (Node.js + Express + TypeScript)              │
│                  https://suv-agent.onrender.com                     │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   INTENT CLASSIFIER                          │   │
│  │  "hello" → GREETING  |  "what is X" → CONCEPT               │   │
│  │  "I want to learn X" → RESOURCE (roadmap + scraping)         │   │
│  └────────────────────────┬─────────────────────────────────────┘   │
│                           │                                         │
│          ┌────────────────┼────────────────┐                        │
│          ▼                ▼                ▼                        │
│    GREETING         CONCEPT          RESOURCE                       │
│    (warm reply)     (deep           ┌──────────────────────┐        │
│                      explanation)   │   LIVE SCRAPER ENGINE │        │
│                                     │   ┌──────────────┐   │        │
│                                     │   │ Tavily Search│   │        │
│                                     │   │ Firecrawl    │   │        │
│                                     │   │ Apify Actor  │   │        │
│                                     │   └──────────────┘   │        │
│                                     └──────────┬───────────┘        │
│                                                │ scraped results     │
│                                                ▼                    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    AI GENERATION ENGINE                     │    │
│  │                                                             │    │
│  │  PRIMARY:  OpenRouter → meta-llama/llama-3.3-70b:free       │    │
│  │      ↓ (if fails)                                           │    │
│  │  FALLBACK: Gemini Chain                                     │    │
│  │    gemini-flash-latest → gemini-3.5-flash →                 │    │
│  │    gemini-3.5-flash-lite → gemini-3.6-flash                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                           │                                         │
│                           ▼                                         │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              SUPABASE (PostgreSQL)                          │    │
│  │  • User Profiles    • Chat Sessions   • Chat Messages       │    │
│  │  • Learning Paths   • Saved Resources                       │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
| Tool | Purpose |
|------|---------|
| **Next.js 14** (App Router) | React framework, SSR, routing |
| **Tailwind CSS** | Utility-first styling |
| **ReactMarkdown + remark-gfm** | Render rich AI markdown responses |
| **Lucide React** | Icon library |
| **Supabase JS Client** | Auth & database queries |

### Backend
| Tool | Purpose |
|------|---------|
| **Node.js + Express** | REST API server |
| **TypeScript** | Type-safe backend code |
| **tsx** | Run TypeScript directly |
| **@google/generative-ai** | Gemini API SDK |
| **Supabase JS** | Server-side DB operations |

### AI & Intelligence
| Tool | Purpose |
|------|---------|
| **OpenRouter** | Primary AI gateway (free LLM access) |
| **meta-llama/llama-3.3-70b-instruct:free** | Fast, capable default model |
| **Google Gemini** | Fallback AI (flash-latest → chain) |

### Live Scraping
| Tool | Purpose |
|------|---------|
| **Tavily** | Real-time web search engine |
| **Firecrawl** | Deep web scraping & content extraction |
| **Apify** | Web & YouTube scraper actor |

### Infrastructure
| Tool | Purpose |
|------|---------|
| **Vercel** | Frontend deployment (CDN + Edge) |
| **Render** | Backend deployment (always-on) |
| **Supabase** | Auth + PostgreSQL database |
| **GitHub** | Source control & CI/CD trigger |

---

## 🔑 Environment Variables & API Keys

### Backend — add to Render Dashboard → Environment

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `OPENROUTER_API_KEY` | Primary AI provider | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `OPENROUTER_MODEL` | Model to use (default: `meta-llama/llama-3.3-70b-instruct:free`) | [openrouter.ai/models](https://openrouter.ai/models?q=free) |
| `GEMINI_API_KEY` | Fallback AI provider | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | Gemini model (default: `gemini-flash-latest`) | Auto-detected |
| `TAVILY_API_KEY` | Live web search | [tavily.com](https://tavily.com) |
| `FIRECRAWL_API_KEY` | Web scraper | [firecrawl.dev](https://firecrawl.dev) |
| `APIFY_API_KEY` | Web & YouTube scraper | [console.apify.com](https://console.apify.com/account/integrations) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase server-side key | Supabase project settings |

### Frontend — add to Vercel Dashboard → Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `NEXT_PUBLIC_BACKEND_API_URL` | Render backend URL (`https://suv-agent.onrender.com`) |

---

## 📁 Project Structure

```
suv-agent/
├── backend/
│   ├── src/
│   │   ├── ai.ts           # 🧠 AI engine: intent router, OpenRouter, Gemini fallback,
│   │   │                   #    live scraper orchestration, roadmap synthesis
│   │   └── index.ts        # 🚀 Express server: /api/chat, /api/health, Supabase integration
│   ├── .env                # Local env vars (git-ignored)
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── public/
│   │   ├── logo.png        # Brand logo (transparent, dark variant)
│   │   └── logo_white.png  # Brand logo (white variant for dark backgrounds)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Landing page with hero section
│   │   │   ├── layout.tsx        # Root layout: navbar, favicon, metadata
│   │   │   ├── favicon.ico       # Custom SUV++ favicon
│   │   │   ├── icon.png          # PWA app icon
│   │   │   ├── apple-icon.png    # Apple touch icon
│   │   │   ├── chat/page.tsx     # 💬 Main chat UI with roadmap renderer
│   │   │   ├── auth/             # Supabase auth callback handler
│   │   │   ├── login/            # Login page
│   │   │   ├── onboarding/       # User profile setup flow
│   │   │   ├── dashboard/        # User dashboard
│   │   │   ├── profile/          # Profile management
│   │   │   └── path/             # Saved learning paths viewer
│   │   └── utils/
│   │       └── supabase/         # Supabase client helpers
│   ├── .env.local          # Local env vars (git-ignored)
│   └── package.json
│
├── .gitignore
├── start.ps1               # Local dev start script (Windows)
└── README.md
```

---

## 🤖 How the AI Intent Router Works

Every user message is classified into one of 3 intents:

```
User: "hello"              → GREETING  → Warm welcome + domain highlights
User: "what is docker?"    → CONCEPT   → Deep technical explanation (5 sections)
User: "I want to learn X"  → RESOURCE  → Live scrape + structured phased roadmap
```

**RESOURCE flow in detail:**
1. Parallel scrape via **Tavily** + **Firecrawl** + **Apify** (8–10s timeout each)
2. Collected live URLs injected into AI prompt as context
3. AI generates structured JSON roadmap: title, phases, resources with reasons, next action
4. Frontend renders roadmap as interactive cards with clickable links

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js 18+
- A Supabase project
- At least one AI API key (OpenRouter or Gemini)

### 1. Clone the repo
```bash
git clone https://github.com/cgn-8/suv-Agent.git
cd suv-Agent
```

### 2. Backend setup
```bash
cd backend
npm install
cp .env.example .env   # fill in your API keys
npx tsx src/index.ts   # starts on port 4000
```

### 3. Frontend setup
```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in Supabase keys + backend URL
npm run dev   # starts on port 3000
```

### 4. Open in browser
```
http://localhost:3000
```

---

## 🌐 Deployed URLs

| Service | URL |
|---------|-----|
| Frontend (Vercel) | [https://suv-agent.vercel.app](https://suv-agent.vercel.app) |
| Backend API (Render) | [https://suv-agent.onrender.com](https://suv-agent.onrender.com) |
| Health Check | [https://suv-agent.onrender.com/api/health](https://suv-agent.onrender.com/api/health) |

---

## 📊 Database Schema (Supabase)

| Table | Purpose |
|-------|---------|
| `profiles` | User profile: name, skill level, goals, target role |
| `chat_sessions` | Groups messages into conversations |
| `chat_messages` | Individual messages (role: user / assistant) |
| `learning_paths` | Generated roadmaps saved per user |

---

## 🔄 CI/CD Pipeline

```
git push origin main
       ↓
GitHub triggers:
  ├── Vercel (auto-deploy frontend in ~30s)
  └── Render (auto-deploy backend in ~60–90s)
```

---

## 🧑‍💻 Built By

**suv++ Agent** — Built with ❤️ for learners everywhere.

> *"Stop scrolling through 100 tutorials. Talk to your mentor."*

---

<div align="center">
  <img src="frontend/public/logo.png" alt="suv++ Agent" width="60"/>
  <br/>
  <sub>suv++ Agent © 2025 · Powered by OpenRouter, Gemini, Supabase, and Live Web Intelligence</sub>
</div>

"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Send,
  Loader2,
  Sparkles,
  ExternalLink,
  ArrowRight,
  BookOpen,
  Video,
  FileText,
  Code2,
  ArrowLeft,
  Brain,
  Search,
  Globe,
  MessageSquare,
  Compass
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  learningPath?: any;
  pathId?: string | null;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusStep, setStatusStep] = useState<string>("thinking");
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        setUserId(data.user.id);
        setMessages([
          {
            role: "assistant",
            content: "Hello! I am your AI Learning Mentor. Ask me any question, discuss a concept, or ask for a complete personalized learning path with courses and videos."
          }
        ]);
      }
    });
  }, [router, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!loading) {
      setStatusStep("thinking");
      return;
    }

    const steps = [
      "thinking",
      "musing",
      "searching",
      "scraping",
      "chatting"
    ];
    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % steps.length;
      setStatusStep(steps[currentIndex]);
    }, 1500);

    return () => clearInterval(interval);
  }, [loading]);

  const handleSend = async () => {
    if (!input.trim() || !userId) return;

    const userMessage = input;
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setLoading(true);
    setStatusStep("thinking");

    // Clean backend base URL (handle missing https:// and trailing slashes)
    let rawUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:4000";
    rawUrl = rawUrl.trim().replace(/\/+$/, "");
    if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
      rawUrl = "https://" + rawUrl;
    }
    const backendUrl = rawUrl;

    try {
      console.log(`[API Call] Sending chat to: ${backendUrl}/api/chat`);
      const response = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: userMessage, sessionId }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server returned status ${response.status}: ${errText}`);
      }

      const data = await response.json();

      if (data.sessionId) setSessionId(data.sessionId);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "Here is what I found for you:",
          learningPath: data.learningPath,
          pathId: data.pathId,
        },
      ]);
    } catch (error: any) {
      console.error("Chat communication error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I encountered an error communicating with the backend server (${backendUrl}). If the backend was sleeping on Render, please wait 30 seconds for it to wake up and try again!`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getResourceIcon = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("video") || t.includes("youtube")) return <Video className="w-4 h-4 text-rose-500 flex-shrink-0" />;
    if (t.includes("course")) return <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />;
    if (t.includes("project")) return <Code2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
    return <FileText className="w-4 h-4 text-purple-500 flex-shrink-0" />;
  };

  const renderStatusBadge = () => {
    switch (statusStep) {
      case "thinking":
        return (
          <div className="flex items-center gap-2 text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-3.5 py-1.5 rounded-full text-xs font-semibold animate-pulse">
            <Brain className="w-4 h-4 text-indigo-600 animate-spin" />
            <span>Thinking & analyzing your query...</span>
          </div>
        );
      case "musing":
        return (
          <div className="flex items-center gap-2 text-purple-700 bg-purple-50 border border-purple-200/60 px-3.5 py-1.5 rounded-full text-xs font-semibold animate-pulse">
            <Compass className="w-4 h-4 text-purple-600 animate-bounce" />
            <span>Musing over learner profile & skill level...</span>
          </div>
        );
      case "searching":
        return (
          <div className="flex items-center gap-2 text-blue-700 bg-blue-50 border border-blue-200/60 px-3.5 py-1.5 rounded-full text-xs font-semibold animate-pulse">
            <Search className="w-4 h-4 text-blue-600" />
            <span>Searching top learning resources on Tavily...</span>
          </div>
        );
      case "scraping":
        return (
          <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200/60 px-3.5 py-1.5 rounded-full text-xs font-semibold animate-pulse">
            <Globe className="w-4 h-4 text-amber-600 animate-spin" />
            <span>Scraping YouTube tutorials & course platforms...</span>
          </div>
        );
      case "chatting":
        return (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-3.5 py-1.5 rounded-full text-xs font-semibold animate-pulse">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Chatting & structuring with Gemini 3.6 Flash...</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 text-gray-700 bg-gray-100 px-3 py-1 rounded-full text-xs font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Processing...</span>
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 py-2">
      {/* Header bar with Official SUV Logo */}
      <div className="flex justify-between items-center bg-white px-6 py-3.5 rounded-2xl border border-rose-100/80 shadow-xs">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-xs font-bold text-gray-500 hover:text-rose-600 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-7 px-2 bg-white rounded-lg border border-gray-200 flex items-center shadow-xs">
            <Image
              src="/logo.png"
              alt="SUV Logo"
              width={40}
              height={20}
              className="object-contain"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-black text-gray-950">suv++ Agent Online</span>
          </div>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="h-[75vh] flex flex-col bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              {msg.role === "assistant" && (
                <div className="flex items-center gap-2 mb-1.5 pl-1">
                  <div className="w-6 h-6 rounded-md bg-white border border-rose-100 flex items-center justify-center p-0.5 shadow-xs">
                    <Image
                      src="/logo.png"
                      alt="SUV Assistant"
                      width={22}
                      height={12}
                      className="object-contain"
                    />
                  </div>
                  <span className="text-[11px] font-extrabold text-gray-700">suv++ Agent</span>
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-tr-sm shadow-sm font-medium"
                    : "bg-gray-100 text-gray-950 rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>

              {/* Render Structured Learning Path */}
              {msg.learningPath && (
                <div className="mt-4 w-full max-w-[95%] bg-white border border-rose-100 rounded-2xl p-6 shadow-md shadow-rose-500/5 space-y-6">
                  <div className="flex flex-wrap justify-between items-start gap-3 border-b border-gray-100 pb-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-full text-xs font-bold uppercase tracking-wider mb-1.5 border border-rose-100">
                        <Sparkles className="w-3 h-3" /> Personalized Roadmap
                      </div>
                      <h3 className="text-xl font-extrabold text-gray-950">{msg.learningPath.title}</h3>
                      <p className="text-gray-600 text-xs mt-1">{msg.learningPath.goal}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-rose-100">
                        {msg.learningPath.level}
                      </span>
                      {msg.pathId && (
                        <Link
                          href={`/path/${msg.pathId}`}
                          className="bg-gradient-to-r from-rose-600 to-red-600 text-white px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition shadow-xs"
                        >
                          View Full <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Phases */}
                  <div className="space-y-4">
                    {msg.learningPath.phases?.map((phase: any, idx: number) => (
                      <div key={idx} className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/70 space-y-3">
                        <h4 className="font-bold text-sm text-gray-950 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-xs flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          {phase.phase_name}
                        </h4>
                        <ul className="space-y-2">
                          {phase.resources?.map((res: any, rIdx: number) => (
                            <li key={rIdx} className="bg-white p-3 rounded-lg border border-gray-200 text-xs space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  {getResourceIcon(res.type)}
                                  <a
                                    href={res.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-rose-600 font-bold hover:underline flex items-center gap-1"
                                  >
                                    {res.title}
                                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                  </a>
                                </div>
                                <span className="text-[10px] uppercase font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded flex-shrink-0">
                                  {res.type}
                                </span>
                              </div>
                              {res.reason && (
                                <p className="text-gray-600 pl-6 leading-relaxed">
                                  <span className="font-semibold text-gray-700">Why:</span> {res.reason}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {msg.learningPath.next_action && (
                    <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs space-y-1">
                      <span className="font-bold text-rose-950">Recommended Next Action:</span>
                      <p className="text-rose-800 font-medium">{msg.learningPath.next_action}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Dynamic Visual Status Indicator */}
          {loading && (
            <div className="flex justify-start py-2">
              <div className="bg-white border border-rose-100 rounded-2xl p-4 shadow-md shadow-rose-500/5 space-y-3 max-w-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-5 px-1.5 bg-gray-50 border rounded flex items-center">
                      <Image
                        src="/logo.png"
                        alt="SUV Logo"
                        width={28}
                        height={14}
                        className="object-contain"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Agent Pipeline</span>
                  </div>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                </div>
                {renderStatusBadge()}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="p-4 border-t bg-gray-50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex space-x-3 max-w-3xl mx-auto"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a question, discuss a topic, or ask for a complete roadmap..."
              className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition shadow-xs font-medium"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-rose-600 to-red-600 text-white px-5 py-3 rounded-2xl hover:from-rose-700 hover:to-red-700 disabled:opacity-50 transition tactile-btn flex items-center justify-center font-medium shadow-md shadow-rose-500/25"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

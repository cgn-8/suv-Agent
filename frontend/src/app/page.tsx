import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Sparkles, ArrowRight, Compass, ShieldCheck, Zap, Layers } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-16 py-4">
      {/* Hero Visual Card with 3D Artwork and Top-Left SUV Logo */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-rose-200/50 bg-[#8B0000]">
        {/* Background Artwork */}
        <div className="relative w-full h-[500px] sm:h-[560px]">
          <Image
            src="/hero_crimson.jpg"
            alt="The Time is Now - suv++ Agent"
            fill
            className="object-cover object-center"
            priority
          />

          {/* Top-Left Prominent SUV Logo Badge */}
          <div className="absolute top-6 left-6 z-20">
            <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/80 shadow-lg">
              <Image
                src="/logo.png"
                alt="SUV Official Logo"
                width={65}
                height={34}
                className="object-contain"
                priority
              />
              <div className="border-l border-gray-200 pl-3">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-rose-600">Official</p>
                <p className="text-xs font-black text-gray-950">suv++ Agent</p>
              </div>
            </div>
          </div>

          {/* Overlay Gradient for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-8 sm:p-12 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold tracking-wider uppercase w-fit">
              <Sparkles className="w-4 h-4 text-rose-300" />
              AI Learning Path Recommender
            </div>

            <div className="max-w-2xl space-y-3">
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight drop-shadow-md">
                The Time is <span className="text-rose-400 underline decoration-rose-500/50">Now</span>.
              </h1>
              <p className="text-rose-100/90 text-sm sm:text-base max-w-xl leading-relaxed">
                Transform your ambitions into structured, real-time personalized learning paths with live-scraped courses, curated YouTube videos, and actionable milestones.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/login"
                className="px-8 py-3.5 bg-white text-rose-700 hover:bg-rose-50 rounded-2xl text-sm font-extrabold shadow-xl shadow-black/25 flex items-center gap-2.5 transition transform hover:-translate-y-0.5"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4 text-rose-600" />
              </Link>
              <Link
                href="/login"
                className="px-6 py-3.5 bg-white/15 hover:bg-white/25 text-white rounded-2xl text-sm font-semibold backdrop-blur-md border border-white/30 transition flex items-center gap-2"
              >
                <Compass className="w-4 h-4" />
                Explore Roadmaps
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="clay-card p-8 space-y-4 hover:border-rose-300 transition group">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-110 transition shadow-sm">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-950">Live Web Scraping</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Directly extracts real, up-to-date YouTube playlists, Coursera, Udemy, and documentation tutorials across the web via Tavily & Firecrawl.
          </p>
        </div>

        <div className="clay-card p-8 space-y-4 hover:border-rose-300 transition group">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-110 transition shadow-sm">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-950">Profile-Aware Milestones</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Tailored specifically to your skill level, target career goals, and weekly study schedule. Every recommendation explains exactly why it was chosen for you.
          </p>
        </div>

        <div className="clay-card p-8 space-y-4 hover:border-rose-300 transition group">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-110 transition shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-950">Persistent & Progress Tracking</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            All roadmaps and chat sessions are stored in your Supabase Postgres database. Return anytime to update your experience and track completions.
          </p>
        </div>
      </div>
    </div>
  );
}

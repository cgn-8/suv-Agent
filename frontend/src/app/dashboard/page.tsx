import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Sparkles, User, Map, Award, Clock, ArrowRight, Compass } from "lucide-react";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  // 2. Fetch Learning Paths
  const { data: learningPaths } = await supabase
    .from("learning_paths")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // 3. Fetch Completed Courses
  const { data: courses } = await supabase
    .from("completed_courses")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Silk Crimson Welcome Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl border border-rose-200/50 p-8 sm:p-10 text-white bg-gradient-to-r from-rose-700 via-red-600 to-rose-800">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-rose-100 border border-white/30">
              <Sparkles className="w-3.5 h-3.5" />
              The Time is Now
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight drop-shadow-sm">
              Welcome back, {profile.full_name || user.email?.split("@")[0]}!
            </h1>
            <p className="text-rose-100/90 text-sm max-w-xl leading-relaxed">
              {profile.learning_goals
                ? `Active Goal: "${profile.learning_goals}"`
                : "Ask the AI Learning Mentor to discover customized roadmaps and start mastering your target skills today."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold backdrop-blur-md transition flex items-center gap-2 border border-white/30 shadow-sm"
            >
              <User className="w-4 h-4" />
              Edit Profile
            </Link>
            <Link
              href="/chat"
              className="px-5 py-2.5 bg-white text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-extrabold shadow-lg shadow-black/15 transition flex items-center gap-2 transform hover:-translate-y-0.5"
            >
              <Compass className="w-4 h-4 text-rose-600" />
              Ask AI Mentor
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="clay-card p-6 flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-sm">
            <Map className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Active Roadmaps</p>
            <h3 className="text-2xl font-black text-gray-950 mt-0.5">{learningPaths?.length || 0}</h3>
          </div>
        </div>

        <div className="clay-card p-6 flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Completed Courses</p>
            <h3 className="text-2xl font-black text-gray-950 mt-0.5">{courses?.length || 0}</h3>
          </div>
        </div>

        <div className="clay-card p-6 flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-sm">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Weekly Commitment</p>
            <h3 className="text-xl font-black text-gray-950 mt-0.5">{profile.time_available_per_week || "5-10 hrs"}</h3>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Roadmaps List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-gray-950 flex items-center gap-2">
              <Map className="w-5 h-5 text-rose-600" />
              Your Personalized Learning Paths
            </h2>
            <Link href="/chat" className="text-xs font-bold text-rose-600 hover:text-rose-800">
              + Generate New
            </Link>
          </div>

          {learningPaths && learningPaths.length > 0 ? (
            <div className="space-y-4">
              {learningPaths.map((path) => (
                <div
                  key={path.id}
                  className="clay-card p-6 hover:border-rose-300 transition space-y-4"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="text-base font-bold text-gray-950">{path.title}</h3>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">{path.goal}</p>
                    </div>
                    <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border border-rose-100 flex-shrink-0">
                      {path.level || "Beginner"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <span>
                      {path.estimated_duration ? `Estimated: ${path.estimated_duration}` : "Structured Milestone Roadmap"}
                    </span>
                    <Link
                      href={`/path/${path.id}`}
                      className="inline-flex items-center font-bold text-rose-600 hover:text-rose-800"
                    >
                      View Full Roadmap <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="clay-card p-10 text-center space-y-4 border-dashed border-rose-200">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-gray-950 text-sm">No Roadmaps Generated Yet</h4>
                <p className="text-gray-500 text-xs">Chat with suv++ AI to discover verified courses and custom milestones.</p>
              </div>
              <Link
                href="/chat"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl tactile-btn shadow-md"
              >
                <Compass className="w-4 h-4" /> Start First Roadmap
              </Link>
            </div>
          )}
        </div>

        {/* Right 1 Column: Profile Summary & Completed Courses */}
        <div className="space-y-6">
          <div className="clay-card p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-950 text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Completed Courses
              </h3>
              <Link href="/profile" className="text-xs font-bold text-rose-600 hover:underline">
                Manage
              </Link>
            </div>

            {courses && courses.length > 0 ? (
              <div className="space-y-2.5">
                {courses.slice(0, 4).map((c) => (
                  <div key={c.id} className="p-3 bg-gray-50 rounded-xl text-xs space-y-0.5 border border-gray-100">
                    <p className="font-bold text-gray-900">{c.course_title}</p>
                    <p className="text-gray-500 text-[11px]">{c.platform || "Self-study"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No completed courses added yet. You can log them in your Profile page.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

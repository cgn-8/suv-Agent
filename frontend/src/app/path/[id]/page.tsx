import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ExternalLink, BookOpen, Video, FileText, Code2, Sparkles } from "lucide-react";

export default async function LearningPathDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: path, error } = await supabase
    .from("learning_paths")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !path) {
    notFound();
  }

  const pathJson = path.path_json || {};
  const phases = pathJson.phases || [];

  const getResourceIcon = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("video") || t.includes("youtube")) return <Video className="w-4 h-4 text-rose-500" />;
    if (t.includes("course")) return <BookOpen className="w-4 h-4 text-blue-500" />;
    if (t.includes("project")) return <Code2 className="w-4 h-4 text-emerald-500" />;
    return <FileText className="w-4 h-4 text-purple-500" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Back Link */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-xs font-bold text-gray-500 hover:text-rose-600 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Dashboard
        </Link>
      </div>

      {/* Hero Header */}
      <div className="clay-card p-8 sm:p-10 space-y-4 border-rose-100">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-rose-100">
              <Sparkles className="w-3.5 h-3.5" /> Personalized Roadmap
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight">{path.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-rose-50 text-rose-700 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-rose-100">
              {path.level || "Beginner"}
            </span>
            {path.estimated_duration && (
              <span className="bg-gray-100 text-gray-800 px-3.5 py-1 rounded-full text-xs font-bold">
                ⏱ {path.estimated_duration}
              </span>
            )}
          </div>
        </div>
        <p className="text-gray-600 text-sm sm:text-base leading-relaxed">{path.goal}</p>

        {pathJson.next_action && (
          <div className="mt-4 p-4 bg-rose-50/80 border border-rose-100 rounded-2xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wider">Recommended Next Action</h4>
              <p className="text-xs text-rose-800 mt-0.5 font-medium">{pathJson.next_action}</p>
            </div>
          </div>
        )}
      </div>

      {/* Roadmap Phases */}
      <div className="space-y-6">
        <h2 className="text-lg font-black text-gray-950">Milestone Phases & Verified Resources</h2>

        {phases.length > 0 ? (
          phases.map((phase: any, index: number) => (
            <div
              key={index}
              className="clay-card p-6 sm:p-8 space-y-4"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center text-xs font-black shadow-sm">
                  {index + 1}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-gray-950">
                  {phase.phase_name || `Phase ${index + 1}`}
                </h3>
              </div>

              {/* Resources list */}
              <div className="grid gap-3">
                {phase.resources?.map((res: any, rIdx: number) => (
                  <div
                    key={rIdx}
                    className="p-4 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-white hover:border-rose-200 transition space-y-2"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        {getResourceIcon(res.type)}
                        <span className="font-bold text-gray-950 text-sm">
                          {res.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-bold uppercase bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                          {res.type || "Resource"}
                        </span>
                        {res.url && (
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs text-rose-600 hover:text-rose-800 font-bold ml-1"
                          >
                            Open <ExternalLink className="w-3.5 h-3.5 ml-1" />
                          </a>
                        )}
                      </div>
                    </div>
                    {res.reason && (
                      <p className="text-xs text-gray-600 leading-relaxed pl-6">
                        <span className="font-semibold text-gray-700">Why recommended:</span>{" "}
                        {res.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="clay-card p-10 text-center text-gray-500">
            No detailed phases found for this roadmap.
          </div>
        )}
      </div>
    </div>
  );
}

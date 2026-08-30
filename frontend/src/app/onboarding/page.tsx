"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles, ArrowRight, Loader2, User, Target, BookOpen, Clock } from "lucide-react";

export default function Onboarding() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    interests: "",
    current_skill_level: "Beginner",
    learning_goals: "",
    preferred_learning_format: "Mixed",
    current_job_role: "",
    target_role: "",
    time_available_per_week: "5-10 hours",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.from("profiles").upsert([
      {
        id: user.id,
        user_id: user.id,
        email: user.email,
        ...formData,
      },
    ]);

    if (!error) {
      router.push("/dashboard");
      router.refresh();
    } else {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="clay-card p-8 sm:p-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-lg shadow-rose-600/30 mb-1">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
            Build Your Learner Profile
          </h1>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Help suv++ AI understand your goals, background, and available study hours to assemble the most effective personalized roadmaps.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                name="full_name"
                required
                value={formData.full_name}
                onChange={handleChange}
                placeholder="e.g. John Doe"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Current Job / Role</label>
              <input
                type="text"
                name="current_job_role"
                value={formData.current_job_role}
                onChange={handleChange}
                placeholder="e.g. Student / Junior Developer"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Target Career / Role</label>
              <input
                type="text"
                name="target_role"
                value={formData.target_role}
                onChange={handleChange}
                placeholder="e.g. AI Workflow Specialist"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Current Skill Level</label>
              <select
                name="current_skill_level"
                value={formData.current_skill_level}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 text-xs font-medium"
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
                <option>Expert</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Key Interests & Technologies</label>
            <input
              type="text"
              name="interests"
              placeholder="e.g. Python, AI Automation, Next.js, Web Scraping"
              value={formData.interests}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Primary Learning Goal</label>
            <textarea
              name="learning_goals"
              rows={3}
              placeholder="e.g. I want to build full-stack AI applications and learn how to automate real-world workflows in 6 months."
              value={formData.learning_goals}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Preferred Learning Format</label>
              <select
                name="preferred_learning_format"
                value={formData.preferred_learning_format}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 text-xs font-medium"
              >
                <option>Mixed (Videos, Articles, Courses)</option>
                <option>Video Tutorials & Playlists</option>
                <option>Documentation & Text Guides</option>
                <option>Project-based Hands-on</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Available Hours / Week</label>
              <select
                name="time_available_per_week"
                value={formData.time_available_per_week}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 text-xs font-medium"
              >
                <option>1-5 hours</option>
                <option>5-10 hours</option>
                <option>10-20 hours</option>
                <option>20+ hours (Full Time)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-xs rounded-xl tactile-btn flex items-center justify-center space-x-2 transition disabled:opacity-50 shadow-md shadow-rose-500/25 mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <span>Complete Onboarding & Launch Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Briefcase,
  GraduationCap,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  Sparkles
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Main Profile State
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    interests: "",
    current_skill_level: "Beginner",
    learning_goals: "",
    preferred_learning_format: "Mixed",
    current_job_role: "",
    target_role: "",
    time_available_per_week: "5-10 hours",
  });

  // Experiences State
  const [experiences, setExperiences] = useState<any[]>([]);
  const [newExp, setNewExp] = useState({
    title: "",
    company_or_client: "",
    type: "Work",
    description: "",
  });

  // Completed Courses State
  const [courses, setCourses] = useState<any[]>([]);
  const [newCourse, setNewCourse] = useState({
    course_title: "",
    platform: "",
    skills_learned: "",
  });

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);

      // 1. Fetch Profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (prof) {
        setProfile({
          full_name: prof.full_name || "",
          email: prof.email || user.email || "",
          interests: prof.interests || "",
          current_skill_level: prof.current_skill_level || "Beginner",
          learning_goals: prof.learning_goals || "",
          preferred_learning_format: prof.preferred_learning_format || "Mixed",
          current_job_role: prof.current_job_role || "",
          target_role: prof.target_role || "",
          time_available_per_week: prof.time_available_per_week || "5-10 hours",
        });
      } else {
        setProfile((prev) => ({ ...prev, email: user.email || "" }));
      }

      // 2. Fetch Experiences
      const { data: expList } = await supabase
        .from("experiences")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (expList) setExperiences(expList);

      // 3. Fetch Completed Courses
      const { data: courseList } = await supabase
        .from("completed_courses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (courseList) setCourses(courseList);

      setLoading(false);
    }

    loadData();
  }, [router, supabase]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setSuccessMsg(null);

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        user_id: userId,
        ...profile,
        updated_at: new Date().toISOString(),
      });

    setSaving(false);
    if (!error) {
      setSuccessMsg("Profile successfully updated!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      console.error(error);
    }
  };

  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newExp.title.trim()) return;

    const { data, error } = await supabase
      .from("experiences")
      .insert([{ user_id: userId, ...newExp }])
      .select()
      .single();

    if (data && !error) {
      setExperiences([data, ...experiences]);
      setNewExp({ title: "", company_or_client: "", type: "Work", description: "" });
    }
  };

  const handleDeleteExperience = async (id: string) => {
    const { error } = await supabase.from("experiences").delete().eq("id", id);
    if (!error) {
      setExperiences(experiences.filter((item) => item.id !== id));
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newCourse.course_title.trim()) return;

    const { data, error } = await supabase
      .from("completed_courses")
      .insert([{ user_id: userId, ...newCourse }])
      .select()
      .single();

    if (data && !error) {
      setCourses([data, ...courses]);
      setNewCourse({ course_title: "", platform: "", skills_learned: "" });
    }
  };

  const handleDeleteCourse = async (id: string) => {
    const { error } = await supabase.from("completed_courses").delete().eq("id", id);
    if (!error) {
      setCourses(courses.filter((item) => item.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="clay-card p-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-950 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <User className="w-5 h-5" />
            </div>
            Learner Profile
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Keep your skills, experience, and goals up-to-date so suv++ AI can recommend the most accurate roadmaps.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* 1. Core Profile Details Form */}
      <form onSubmit={handleSaveProfile} className="clay-card p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h2 className="text-base font-bold text-gray-950">Personal & Target Goals</h2>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition tactile-btn disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 text-xs font-medium"
              placeholder="e.g. John Doe"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
            <input
              type="text"
              disabled
              value={profile.email}
              className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Current Job / Role</label>
            <input
              type="text"
              value={profile.current_job_role}
              onChange={(e) => setProfile({ ...profile, current_job_role: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 text-xs font-medium"
              placeholder="e.g. Student / Junior Developer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Target Career / Role</label>
            <input
              type="text"
              value={profile.target_role}
              onChange={(e) => setProfile({ ...profile, target_role: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 text-xs font-medium"
              placeholder="e.g. Senior AI Engineer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Current Skill Level</label>
            <select
              value={profile.current_skill_level}
              onChange={(e) => setProfile({ ...profile, current_skill_level: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 text-xs font-medium"
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
              <option>Expert</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Available Hours / Week</label>
            <select
              value={profile.time_available_per_week}
              onChange={(e) => setProfile({ ...profile, time_available_per_week: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 text-xs font-medium"
            >
              <option>1-5 hours</option>
              <option>5-10 hours</option>
              <option>10-20 hours</option>
              <option>20+ hours (Full Time)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-700 mb-1">Key Interests & Technologies</label>
            <input
              type="text"
              value={profile.interests}
              onChange={(e) => setProfile({ ...profile, interests: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 text-xs font-medium"
              placeholder="e.g. Python, Machine Learning, Next.js, Supabase, LLMs"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-700 mb-1">Primary Learning Goal</label>
            <textarea
              rows={3}
              value={profile.learning_goals}
              onChange={(e) => setProfile({ ...profile, learning_goals: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 text-xs font-medium"
              placeholder="e.g. Master building agentic workflows and full-stack AI applications."
            />
          </div>
        </div>
      </form>

      {/* 2. Experience Section */}
      <div className="clay-card p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h2 className="text-base font-bold text-gray-950 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-rose-600" />
            Work & Freelance Experience
          </h2>
        </div>

        {/* Existing Experiences */}
        <div className="space-y-3">
          {experiences.map((exp) => (
            <div key={exp.id} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-start">
              <div>
                <h4 className="font-bold text-gray-950 text-sm">{exp.title}</h4>
                <p className="text-xs text-gray-600 font-medium">{exp.company_or_client} • <span className="text-[10px] uppercase font-bold bg-gray-200 px-2 py-0.5 rounded">{exp.type}</span></p>
                {exp.description && <p className="text-xs text-gray-500 mt-2">{exp.description}</p>}
              </div>
              <button
                onClick={() => handleDeleteExperience(exp.id)}
                className="text-gray-400 hover:text-rose-600 p-1 transition"
                title="Delete Experience"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {experiences.length === 0 && (
            <p className="text-xs text-gray-400 italic">No experience added yet.</p>
          )}
        </div>

        {/* Add Experience Form */}
        <form onSubmit={handleAddExperience} className="p-5 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-3">
          <h3 className="text-xs font-bold text-rose-950 uppercase tracking-wider">Add New Experience</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Role Title"
              value={newExp.title}
              onChange={(e) => setNewExp({ ...newExp, title: e.target.value })}
              className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium"
            />
            <input
              type="text"
              placeholder="Company / Client"
              value={newExp.company_or_client}
              onChange={(e) => setNewExp({ ...newExp, company_or_client: e.target.value })}
              className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium"
            />
            <select
              value={newExp.type}
              onChange={(e) => setNewExp({ ...newExp, type: e.target.value })}
              className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium"
            >
              <option>Work</option>
              <option>Freelance</option>
              <option>Internship</option>
              <option>Personal Project</option>
            </select>
          </div>
          <textarea
            placeholder="Brief description of responsibilities or projects built..."
            rows={2}
            value={newExp.description}
            onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-rose-600 to-red-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold tactile-btn shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add Experience
          </button>
        </form>
      </div>

      {/* 3. Completed Courses Section */}
      <div className="clay-card p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h2 className="text-base font-bold text-gray-950 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            Completed Courses & Certifications
          </h2>
        </div>

        {/* Existing Courses */}
        <div className="space-y-3">
          {courses.map((c) => (
            <div key={c.id} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-start">
              <div>
                <h4 className="font-bold text-gray-950 text-sm">{c.course_title}</h4>
                <p className="text-xs text-gray-600">{c.platform || "Self-study"}</p>
                {c.skills_learned && (
                  <p className="text-xs text-rose-600 font-bold mt-1">Skills: {c.skills_learned}</p>
                )}
              </div>
              <button
                onClick={() => handleDeleteCourse(c.id)}
                className="text-gray-400 hover:text-rose-600 p-1 transition"
                title="Delete Course"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {courses.length === 0 && (
            <p className="text-xs text-gray-400 italic">No completed courses added yet.</p>
          )}
        </div>

        {/* Add Course Form */}
        <form onSubmit={handleAddCourse} className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-3">
          <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">Add Completed Course / Certification</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Course Title"
              value={newCourse.course_title}
              onChange={(e) => setNewCourse({ ...newCourse, course_title: e.target.value })}
              className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium"
            />
            <input
              type="text"
              placeholder="Platform (Coursera, Udemy, etc.)"
              value={newCourse.platform}
              onChange={(e) => setNewCourse({ ...newCourse, platform: e.target.value })}
              className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium"
            />
            <input
              type="text"
              placeholder="Skills Learned (e.g. Python, Pandas)"
              value={newCourse.skills_learned}
              onChange={(e) => setNewCourse({ ...newCourse, skills_learned: e.target.value })}
              className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Course
          </button>
        </form>
      </div>
    </div>
  );
}

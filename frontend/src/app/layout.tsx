import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/utils/supabase/server";
import { LogOut, User, LayoutDashboard, Compass } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "suv++ Agent | The Time is Now",
  description: "AI-Powered Personalized Learning Path Recommender",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/favicon.ico" }
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="shortcut icon" href="/logo.png" type="image/png" />
      </head>
      <body className={`${inter.className} bg-[#FAF9F9] text-gray-900 min-h-screen flex flex-col antialiased selection:bg-rose-500 selection:text-white`}>
        {/* Floating Glassmorphic Top Navbar */}
        <header className="sticky top-0 z-50 w-full border-b border-rose-100/70 bg-white/85 backdrop-blur-xl shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
            {/* Brand Logo with Custom SUV Artwork */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="h-10 px-2.5 py-1 rounded-xl bg-white border border-rose-100 shadow-xs flex items-center justify-center group-hover:scale-105 transition">
                <Image
                  src="/logo.png"
                  alt="SUV Logo"
                  width={50}
                  height={26}
                  className="object-contain"
                  priority
                />
              </div>
              <span className="font-black text-xl tracking-tight text-gray-950">
                suv<span className="text-rose-600">++</span> Agent
              </span>
            </Link>

            {/* Navigation items */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="px-3.5 py-2 text-xs font-bold text-gray-700 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition flex items-center gap-1.5"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    className="px-3.5 py-2 text-xs font-bold text-gray-700 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition flex items-center gap-1.5"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </Link>
                  <Link
                    href="/chat"
                    className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-xl text-xs font-extrabold tactile-btn flex items-center gap-1.5 ml-1"
                  >
                    <Compass className="w-4 h-4" />
                    AI Mentor
                  </Link>
                  <form action="/auth/signout" method="post" className="inline ml-1">
                    <button
                      type="submit"
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-5 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl text-xs font-bold tactile-btn shadow-md shadow-rose-500/25"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}

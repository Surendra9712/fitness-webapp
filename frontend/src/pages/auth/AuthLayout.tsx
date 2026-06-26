import { useState, useEffect } from "react";
import { Dumbbell } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useSearchParams } from "react-router-dom";
import { LoginForm } from "./Login";
import { RegisterForm } from "./Register";

// ── Page ──────────────────────────────────────────────────────────────────────

const headings = {
  login: { title: "Welcome back", sub: "Sign in to your account to continue" },
  register: {
    title: "Create account",
    sub: "Join FitStore and start your fitness journey",
  },
};

export default function AuthLayout() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "register" ? "register" : "login";
  const [tab, setTab] = useState<"login" | "register">(initialTab);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "register" || t === "login") setTab(t);
  }, [searchParams]);

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel ── */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-linear-to-br from-slate-900 to-zinc-950 p-12 text-white lg:flex">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute -right-40 -top-40 h-125 w-125 rounded-full bg-emerald-500/20 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-100 w-100 rounded-full bg-cyan-500/15 blur-[100px]" />

        {/* Brand */}
        <Link to="/" className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 ring-1 ring-emerald-500/30">
            <Dumbbell className="h-5 w-5 text-emerald-400" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            SmartDiet Pro
          </span>
        </Link>

        {/* Hero copy */}
        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            Professional fitness platform
          </div>
          <h1 className="text-4xl font-black leading-tight tracking-tight lg:text-5xl">
            Train smarter,
            <br />
            <span className="bg-linear-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              go further.
            </span>
          </h1>
          <p className="max-w-sm text-base leading-relaxed text-white/55">
            Equipment, tracking, and expert trainers — everything you need to
            hit your goals in one place.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-3 pt-2">
            {[
              { emoji: "🏋️", value: "50K+", label: "Active users" },
              { emoji: "⭐", value: "4.9", label: "Rating" },
              { emoji: "🔥", value: "2M+", label: "Workouts done" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-2.5 rounded-full border border-white/8 bg-white/5 px-4 py-2 backdrop-blur-sm"
              >
                <span className="text-lg">{s.emoji}</span>
                <span className="font-bold text-white">{s.value}</span>
                <span className="text-sm text-white/45">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <p className="relative text-xs text-white/30">
          &copy; {new Date().getFullYear()} FitStore. All rights reserved.
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 flex-col justify-center bg-white px-8 py-12 sm:px-12 lg:px-16 relative">
        <div className="mx-auto w-full max-w-sm ">
          {/* Mobile brand */}
          <div className="mb-8 flex items-center gap-2 lg:hidden absolute top-8">
            <Dumbbell className="h-5 w-5 text-emerald-600" />
            <span className="text-lg font-bold">SmartDiet Pro</span>
          </div>

          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "login" | "register")}
          >
            {/* Tab switcher at the top */}
            <TabsList className="mb-8 w-[240px] absolute top-20">
              <TabsTrigger value="login" className="flex-1">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" className="flex-1">
                Register
              </TabsTrigger>
            </TabsList>

            {/* Heading — updates with active tab */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                {headings[tab].title}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {headings[tab].sub}
              </p>
            </div>

            <TabsContent value="login">
              <LoginForm />
            </TabsContent>

            <TabsContent value="register">
              <RegisterForm />
            </TabsContent>
          </Tabs>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing you agree to our{" "}
            <a
              href="#"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Terms
            </a>{" "}
            and{" "}
            <a
              href="#"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { Leaf, Flame, TrendingUp, ArrowRight, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getDashboardPath } from "@/lib/constant";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  const { user } = useAuth();

  return (
    <section className="relative flex min-h-[95vh] items-center overflow-hidden bg-primary-950">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url(https://t4.ftcdn.net/jpg/03/50/81/89/360_F_350818949_lJTfzSTDr79e9Kn55PUVZjN19ct20uGc.jpg)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary-950 via-primary-900/10 to-teal-950/90" />

      <div className="absolute -left-24 top-1/4  h-96 w-96 rounded-full bg-primary-600/10 blur-3xl float-a" />
      <div className="absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-teal-500/10  blur-3xl float-b" />
      <div className="absolute left-1/3 top-10 h-64 w-64 rounded-full bg-primary-400/5  blur-2xl float-c" />

      {/* Floating pills */}
      <div className="absolute bottom-36 left-[11%] float-b hidden lg:block">
        <div className="flex items-center gap-2 rounded-2xl border border-accent-500/30 bg-accent-500/15 px-4 py-2.5 backdrop-blur">
          <Flame className="h-5 w-5 text-accent-400" />
          <span className="text-xs font-medium text-accent-200">
            420 kcal burned
          </span>
        </div>
      </div>
      <div className="absolute left-[9%] top-1/3 float-c hidden lg:block">
        <div className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/15 px-3 py-2 backdrop-blur">
          <TrendingUp className="h-4 w-4 text-purple-400" />
          <span className="text-xs font-medium text-purple-300">
            +2.4 kg muscle
          </span>
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 py-24 text-center">
        {/* <div className="hero-tag mb-6 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-sm font-medium text-emerald-300 backdrop-blur">
            <Leaf className="h-3.5 w-3.5" /> Nepal's Smart Fitness & Nutrition
            Platform
          </span>
        </div> */}
        <h1 className="hero-h1 text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
          Transform Your Health
          <br />
          <span className="gradient-text">With Expert Dietitians</span>
        </h1>
        <p className="hero-sub mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/60">
          SmartDiet connects you with certified nutrition experts who build
          personalised exercise plans, track your workouts, and guide your
          journey — all in one beautifully simple platform.
        </p>
        <div className="hero-btns mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {user ? (
            <Button size="lg" asChild>
              <Link to={getDashboardPath(user.role)}>
                Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          ) : (
            <>
              <Button size="lg" asChild>
                <Link to="/login?tab=register">
                  Start Free Today <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="accent" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
            </>
          )}
        </div>
        <div className="hero-stats mt-14 flex flex-wrap items-center justify-center gap-10 border-t border-white/10 pt-10">
          {[
            { v: "500+", l: "Members" },
            { v: "50+", l: "Trainers" },
            { v: "10k+", l: "Workouts" },
            { v: "98%", l: "Satisfaction" },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <p className="text-3xl font-extrabold text-white">{s.v}</p>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-widest text-emerald-400/70">
                {s.l}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-emerald-400/50">
        <ChevronDown className="h-6 w-6" />
      </div>
    </section>
  );
}

import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface AuthShellProps {
  /** Omit both title and subtitle when the screen renders its own heading
   *  (the sign-in / register screen puts a tab switcher above it). */
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * The split-panel frame shared by every auth screen (sign in, register, forgot
 * password, reset password) so they all keep the same brand panel and spacing.
 */
export default function AuthShell({
  title,
  subtitle,
  children,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen">
      {/* ── Left panel ── */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-linear-to-br from-slate-900 to-zinc-950 p-12 text-white lg:flex">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute -right-40 -top-40 h-125 w-125 rounded-full bg-emerald-500/20 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-100 w-100 rounded-full bg-cyan-500/15 blur-[100px]" />

        {/* Brand */}
        <Link to="/" className="relative flex items-center gap-3">
          <img
            src="/smart-diet-pro-dark.svg"
            alt="SmartDiet Pro"
            className="h-20 w-auto"
          />
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
        </div>

        <p className="relative text-xs text-white/30" />
      </div>

      {/* ── Right panel ── */}
      <div className="relative flex flex-1 flex-col justify-center bg-white px-8 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile brand */}
          <div className="absolute top-8 mb-8 flex items-center gap-2 lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/smart-diet-pro-light.svg"
                alt="SmartDiet Pro"
                className="h-10 w-auto"
              />
            </Link>
          </div>

          {title && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {children}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing you agree to our{" "}
            <Link
              to="/terms"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              to="/privacy"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

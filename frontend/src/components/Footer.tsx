import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getDashboardPath } from "@/lib/constant";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";

const exploreLinks = [
  { to: "/products", label: "Shop" },
  { to: "/become-trainer", label: "Become a Trainer" },
  { to: "/contact", label: "Contact Us" },
];

const legalLinks = [
  { to: "/terms", label: "Terms of Service" },
  { to: "/privacy", label: "Privacy Policy" },
];

const contactItems = [
  {
    icon: Mail,
    label: SITE.supportEmail,
    href: `mailto:${SITE.supportEmail}`,
  },
  {
    icon: Phone,
    label: SITE.phone,
    href: `tel:${SITE.phoneHref}`,
  },
  {
    icon: MapPin,
    label: SITE.addressLines.join(", "),
    href: null,
  },
];

export const Footer = () => {
  const { user } = useAuth();

  return (
    <footer className="bg-emerald-950 text-emerald-100">
      {/* Accent rule instead of a flat border — reads as a deliberate edge
          against the dark panel rather than a stray line. */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-5">
            <img
              src={import.meta.env.VITE_APP_LOGO}
              alt={import.meta.env.VITE_APP_NAME}
              className="h-12 w-auto"
            />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-emerald-300/90">
              {SITE.tagline}
            </p>
          </div>

          {/* Explore */}
          <div className="lg:col-span-3">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-400">
              Explore
            </h3>
            <ul className="space-y-3 text-sm">
              {exploreLinks.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="group inline-flex items-center gap-1.5 text-emerald-200/90 transition-colors hover:text-white"
                  >
                    <span className="h-px w-0 bg-emerald-400 transition-all duration-200 group-hover:w-3" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Get in touch */}
          <div className="lg:col-span-4">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-400">
              Get in touch
            </h3>
            <ul className="space-y-3 text-sm">
              {contactItems.map((c) => {
                const content = (
                  <>
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-900/70 ring-1 ring-emerald-800">
                      <c.icon className="h-3.5 w-3.5 text-emerald-400" />
                    </span>
                    <span className="break-words pt-1 leading-snug">
                      {c.label}
                    </span>
                  </>
                );
                return (
                  <li key={c.label}>
                    {c.href ? (
                      <a
                        href={c.href}
                        className="flex items-start gap-3 text-emerald-200/90 transition-colors hover:text-white"
                      >
                        {content}
                      </a>
                    ) : (
                      <div className="flex items-start gap-3 text-emerald-300/80">
                        {content}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs text-emerald-400/70">
              {SITE.hours[0].days} · {SITE.hours[0].time} (NPT)
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col-reverse items-center justify-between gap-4 border-t border-emerald-900/80 pt-6 sm:flex-row">
          <p className="text-xs text-emerald-400/80">
            &copy; {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
            {legalLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-emerald-300/90 transition-colors hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
};

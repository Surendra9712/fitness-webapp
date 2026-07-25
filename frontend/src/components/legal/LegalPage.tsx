import { useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Mail } from "lucide-react";

import PublicLayout from "@/components/PublicLayout";
import { SITE } from "@/lib/site";
import { fadeUp, VP } from "@/components/home/animations";

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

interface LegalPageProps {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
  contactEmail: string;
}

/** Shared shell for the Terms and Privacy pages: hero, sticky contents nav,
 *  numbered sections, and a closing "still have questions" block. */
export default function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
  contactEmail,
}: LegalPageProps) {
  // These pages are usually reached from a footer link at the bottom of a long
  // page, so start them at the top rather than inheriting the previous scroll.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <PublicLayout>
      <section className="relative overflow-hidden bg-primary-950 px-6 py-16">
        <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-5xl">
          <span className="mb-4 inline-block rounded-full bg-primary-500/20 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-primary-300">
            {eyebrow}
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            {title}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60">{intro}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/40">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Last updated {SITE.legalEffectiveDate}
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              <a
                href={`mailto:${contactEmail}`}
                className="hover:text-white/70"
              >
                {contactEmail}
              </a>
            </span>
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-14">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[220px_1fr]">
          {/* Contents */}
          <nav className="hidden lg:block">
            <div className="sticky top-20">
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
                Contents
              </div>
              <ol className="space-y-2 text-sm">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="flex gap-2 text-gray-500 transition-colors hover:text-emerald-700"
                    >
                      <span className="tabular-nums text-gray-300">
                        {i + 1}.
                      </span>
                      <span>{s.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>

          {/* Body */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={VP}
            className="min-w-0"
          >
            <div className="mt-8 space-y-10">
              {sections.map((s, i) => (
                <div key={s.id} id={s.id} className="scroll-mt-20">
                  <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">
                    <span className="mr-2 text-emerald-600">{i + 1}.</span>
                    {s.title}
                  </h2>
                  <div className="space-y-3 text-sm leading-relaxed text-gray-600 [&_a]:font-medium [&_a]:text-emerald-700 [&_a:hover]:underline [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-gray-900 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
                    {s.body}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}

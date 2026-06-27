import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Star, ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fadeUp, VP } from "./animations";
import usePublic from "@/hooks/usePublic";

const INTERVAL = 4000;

const THEMES = [
  { badgeCls: "bg-emerald-100 text-emerald-700", statCls: "text-emerald-400", ringCls: "ring-emerald-400", dotCls: "bg-emerald-500" },
  { badgeCls: "bg-blue-100 text-blue-700",       statCls: "text-blue-400",    ringCls: "ring-blue-400",    dotCls: "bg-blue-500"    },
  { badgeCls: "bg-purple-100 text-purple-700",   statCls: "text-purple-400",  ringCls: "ring-purple-400",  dotCls: "bg-purple-500"  },
  { badgeCls: "bg-amber-100 text-amber-700",     statCls: "text-amber-400",   ringCls: "ring-amber-400",   dotCls: "bg-amber-500"   },
  { badgeCls: "bg-rose-100 text-rose-700",       statCls: "text-rose-400",    ringCls: "ring-rose-400",    dotCls: "bg-rose-500"    },
  { badgeCls: "bg-teal-100 text-teal-700",       statCls: "text-teal-400",    ringCls: "ring-teal-400",    dotCls: "bg-teal-500"    },
];

const FALLBACK_PHOTO =
  "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=900&auto=format&fit=crop&q=60";

export default function TrainersSection() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  const { GetTrainers } = usePublic();
  const { data: trainers = [] } = GetTrainers({ queryParams: { page_size: 5 } });

  useEffect(() => {
    if (!trainers.length) return;
    setProgress(0);
    const tick = 50;
    const step = 100 / (INTERVAL / tick);
    const prog = setInterval(() => setProgress((p) => Math.min(p + step, 100)), tick);
    const adv = setTimeout(
      () => setActive((a) => (a + 1) % trainers.length),
      INTERVAL,
    );
    return () => { clearInterval(prog); clearTimeout(adv); };
  }, [active, trainers.length]);

  // reset active index if trainers list shrinks
  useEffect(() => {
    if (trainers.length && active >= trainers.length) setActive(0);
  }, [trainers.length]);

  if (!trainers.length) return null;

  const t = trainers[active];
  const theme = THEMES[active % THEMES.length];
  const rating = Number(t.avg_rating ?? 0).toFixed(1);
  const stars = Math.round(Number(t.avg_rating ?? 0));

  return (
    <section className="bg-gray-950 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={VP}
          className="mb-12 text-center"
        >
          <span className="mb-3 inline-block rounded-full bg-emerald-900/60 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Our Trainers
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight text-white">
            Meet the experts behind your results
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/40">
            Every trainer on SmartDiet is vetted, certified, and passionate
            about helping you reach your goals.
          </p>
        </motion.div>

        {/* Showcase card */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={VP}
          className="overflow-hidden rounded-3xl bg-gray-900"
        >
          <div className="grid lg:grid-cols-5">
            {/* Left: profile info */}
            <div className="flex flex-col justify-center px-8 py-12 lg:col-span-2 lg:px-12">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  {t.specialization && (
                    <span className={`mb-4 inline-block rounded-full px-3 py-1 text-xs font-semibold ${theme.badgeCls}`}>
                      {t.specialization}
                    </span>
                  )}

                  <h3 className="mb-4 text-3xl font-extrabold text-white">{t.name}</h3>

                  {/* Stars */}
                  <div className="mb-5 flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < stars ? "fill-amber-400 text-amber-400" : "text-gray-600"}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-amber-400">
                      {Number(rating) > 0 ? rating : "New"}
                    </span>
                    {(t.review_count ?? 0) > 0 && (
                      <span className="text-xs text-gray-500">({t.review_count} reviews)</span>
                    )}
                  </div>

                  {/* Stat pills */}
                  <div className="mb-6 grid grid-cols-2 gap-3">
                    {[
                      { label: "Clients", value: String(t.customer_count ?? 0) },
                      { label: "Reviews", value: String(t.review_count ?? 0) },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl bg-gray-800 px-3 py-3 text-center">
                        <p className={`text-lg font-extrabold ${theme.statCls}`}>{s.value}</p>
                        <p className="mt-0.5 text-[10px] text-gray-500">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {t.bio && (
                    <p className="mb-8 text-sm leading-relaxed text-gray-400 line-clamp-3">{t.bio}</p>
                  )}

                  <Button asChild className="w-fit">
                    <Link to="/customer/trainer">
                      Connect with {t.name.split(" ")[0]}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right: image */}
            <div className="relative h-[400px] overflow-hidden lg:col-span-3 lg:h-auto">
              <AnimatePresence mode="wait">
                <motion.img
                  key={active}
                  src={t.profile_image_url || FALLBACK_PHOTO}
                  alt={t.name}
                  initial={{ opacity: 0, scale: 1.06 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
              </AnimatePresence>
              <div className="absolute inset-y-0 left-0 hidden w-24 bg-gradient-to-r from-gray-900 to-transparent lg:block" />
              <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-gray-900/60 to-transparent" />

              {/* Client count badge */}
              {(t.customer_count ?? 0) > 0 && (
                <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-sm">
                  <Users className="h-3.5 w-3.5 text-white/70" />
                  <span className="text-xs font-semibold text-white">{t.customer_count} clients</span>
                </div>
              )}
            </div>
          </div>

          {/* Thumbnail strip */}
          <div className="border-t border-white/5 bg-gray-900/80 px-8 py-5">
            <div className="flex items-center justify-center gap-8">
              {trainers.map((tr, i) => {
                const th = THEMES[i % THEMES.length];
                return (
                  <button
                    key={tr.id}
                    onClick={() => setActive(i)}
                    className="group flex flex-col items-center gap-2 focus:outline-none"
                  >
                    {tr.profile_image_url ? (
                      <img
                        src={tr.profile_image_url}
                        alt={tr.name}
                        className={`h-12 w-12 rounded-full object-cover transition-all duration-300 ${
                          i === active
                            ? `ring-2 ring-offset-2 ring-offset-gray-900 scale-110 ${th.ringCls}`
                            : "opacity-40 hover:opacity-70"
                        }`}
                      />
                    ) : (
                      <div
                        className={`h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white transition-all duration-300 ${
                          i === active
                            ? `ring-2 ring-offset-2 ring-offset-gray-900 scale-110 ${th.ringCls}`
                            : "opacity-40 hover:opacity-70"
                        }`}
                      >
                        {tr.name.charAt(0)}
                      </div>
                    )}
                    <span className={`text-[10px] font-medium transition-colors ${i === active ? "text-white" : "text-gray-500"}`}>
                      {tr.name.split(" ")[0]}
                    </span>
                    <div className="h-0.5 w-12 overflow-hidden rounded-full bg-gray-700">
                      <div
                        className={`h-full rounded-full transition-none ${th.dotCls}`}
                        style={{ width: i === active ? `${progress}%` : "0%" }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

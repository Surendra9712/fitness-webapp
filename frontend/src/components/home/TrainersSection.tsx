import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fadeUp, VP } from "./animations";

const INTERVAL = 4000;

const trainers = [
  {
    photo:
      "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8Z3ltJTIwdHJhaW5lcnxlbnwwfHwwfHx8MA%3D%3D",

    name: "Sita Rai",
    specialty: "Weight Loss · Nutrition",
    rating: 4.9,
    clients: 48,
    experience: "6 yrs",
    sessions: "1,200+",
    badgeCls: "bg-emerald-100 text-emerald-700",
    statCls: "text-emerald-400",
    ringCls: "ring-emerald-400",
    dotCls: "bg-emerald-500",
    bio: "Specialising in sustainable weight loss, Sita combines evidence-based nutrition with practical lifestyle coaching to deliver lasting transformations.",
  },
  {
    photo:
      "https://images.unsplash.com/photo-1579758629938-03607ccdbaba?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGd5bSUyMHRyYWluZXJ8ZW58MHx8MHx8fDA%3D",

    name: "Bikash Shrestha",
    specialty: "Strength · Muscle Gain",
    rating: 4.8,
    clients: 35,
    experience: "8 yrs",
    sessions: "980+",
    badgeCls: "bg-secondary-100 text-secondary-700",
    statCls: "text-secondary-400",
    ringCls: "ring-secondary-400",
    dotCls: "bg-secondary-500",
    bio: "A competitive powerlifter turned coach, Bikash brings elite-level strength programming to everyday athletes aiming to build serious muscle.",
  },
  {
    photo:
      "https://images.unsplash.com/photo-1604480133435-25b86862d276?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fGd5bSUyMHRyYWluZXJ8ZW58MHx8MHx8fDA%3D",

    name: "Alex Rai",
    specialty: "Yoga · Holistic Wellness",
    rating: 5.0,
    clients: 62,
    experience: "10 yrs",
    sessions: "2,400+",
    badgeCls: "bg-purple-100 text-purple-700",
    statCls: "text-purple-400",
    ringCls: "ring-purple-400",
    dotCls: "bg-purple-500",
    bio: "A certified yoga instructor and wellness coach, Nisha guides clients toward balance — blending mindfulness, flexibility, and breathwork.",
  },
  {
    photo:
      "https://images.unsplash.com/photo-1611672585731-fa10603fb9e0?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    name: "Rajan Gurung",
    specialty: "Sports · Athletic Performance",
    rating: 4.7,
    clients: 29,
    experience: "5 yrs",
    sessions: "750+",
    badgeCls: "bg-accent-100 text-accent-700",
    statCls: "text-accent-400",
    ringCls: "ring-accent-400",
    dotCls: "bg-accent-500",
    bio: "Former national-level athlete, Rajan specialises in sports conditioning and peak performance training for competitive and recreational athletes alike.",
  },
];

export default function TrainersSection() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const tick = 50;
    const step = 100 / (INTERVAL / tick);
    const prog = setInterval(
      () => setProgress((p) => Math.min(p + step, 100)),
      tick,
    );
    const adv = setTimeout(
      () => setActive((a) => (a + 1) % trainers.length),
      INTERVAL,
    );
    return () => {
      clearInterval(prog);
      clearTimeout(adv);
    };
  }, [active]);

  const t = trainers[active];

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
                  <span
                    className={`mb-4 inline-block rounded-full px-3 py-1 text-xs font-semibold ${t.badgeCls}`}
                  >
                    {t.specialty}
                  </span>

                  <h3 className="mb-4 text-3xl font-extrabold text-white">
                    {t.name}
                  </h3>

                  {/* Stars */}
                  <div className="mb-5 flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(t.rating)
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-600"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-amber-400">
                      {t.rating}
                    </span>
                  </div>

                  {/* Stat pills */}
                  <div className="mb-6 grid grid-cols-3 gap-3">
                    {[
                      { label: "Clients", value: String(t.clients) },
                      { label: "Experience", value: t.experience },
                      { label: "Sessions", value: t.sessions },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="rounded-xl bg-gray-800 px-3 py-3 text-center"
                      >
                        <p className={`text-lg font-extrabold ${t.statCls}`}>
                          {s.value}
                        </p>
                        <p className="mt-0.5 text-[10px] text-gray-500">
                          {s.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="mb-8 text-sm leading-relaxed text-gray-400">
                    {t.bio}
                  </p>

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
                  src={t.photo}
                  alt={t.name}
                  initial={{ opacity: 0, scale: 1.06 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
              </AnimatePresence>
              {/* Left-side gradient bleed into profile panel */}
              <div className="absolute inset-y-0 left-0 hidden w-24 bg-gradient-to-r from-gray-900 to-transparent lg:block" />
              {/* Bottom fade */}
              <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-gray-900/60 to-transparent" />
            </div>
          </div>

          {/* Thumbnail strip */}
          <div className="border-t border-white/5 bg-gray-900/80 px-8 py-5">
            <div className="flex items-center justify-center gap-8">
              {trainers.map((tr, i) => (
                <button
                  key={tr.name}
                  onClick={() => setActive(i)}
                  className="group flex flex-col items-center gap-2 focus:outline-none"
                >
                  <img
                    src={tr.photo}
                    alt={tr.name}
                    className={`h-12 w-12 rounded-full object-cover transition-all duration-300 ${
                      i === active
                        ? `ring-2 ring-offset-2 ring-offset-gray-900 scale-110 ${tr.ringCls}`
                        : "opacity-40 hover:opacity-70"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-medium transition-colors ${
                      i === active ? "text-white" : "text-gray-500"
                    }`}
                  >
                    {tr.name.split(" ")[0]}
                  </span>

                  {/* Progress bar only under active */}
                  <div className="h-0.5 w-12 overflow-hidden rounded-full bg-gray-700">
                    <div
                      className={`h-full rounded-full transition-none ${tr.dotCls}`}
                      style={{ width: i === active ? `${progress}%` : "0%" }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

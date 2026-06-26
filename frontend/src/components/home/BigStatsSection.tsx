import { motion } from "framer-motion";
import { Users, Award, Flame, Heart } from "lucide-react";
import { fadeUp, scaleIn, stagger, VP } from "./animations";

const bigStats = [
  { icon: <Users className="h-8 w-8" />, value: "500+", label: "Active Members" },
  { icon: <Award className="h-8 w-8" />, value: "50+", label: "Certified Trainers" },
  { icon: <Flame className="h-8 w-8" />, value: "10k+", label: "Workouts Logged" },
  { icon: <Heart className="h-8 w-8" />, value: "98%", label: "Satisfaction Rate" },
];

export default function BigStatsSection() {
  return (
    <section className="relative overflow-hidden py-24">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&q=80')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-900/85 to-emerald-950/95" />
      <div className="relative z-10 mx-auto max-w-5xl px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={VP}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Results that speak for themselves
          </h2>
          <p className="mt-3 text-white/50">
            Thousands of Nepalis are already living healthier with SmartDiet.
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={VP}
          className="grid grid-cols-2 gap-6 sm:grid-cols-4"
        >
          {bigStats.map((s) => (
            <motion.div
              key={s.label}
              variants={scaleIn}
              className="rounded-2xl border border-white/10 bg-white/5 p-7 text-center backdrop-blur"
            >
              <div className="mb-3 flex justify-center text-emerald-400">
                {s.icon}
              </div>
              <p className="text-4xl font-extrabold text-white">{s.value}</p>
              <p className="mt-1 text-sm text-white/50">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

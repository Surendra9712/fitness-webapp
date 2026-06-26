import { motion } from "framer-motion";
import { Dumbbell, Bike, Zap, Heart, Flame, CheckCircle2 } from "lucide-react";
import { fadeLeft, fadeRight, VP } from "./animations";

const exercisePerks = [
  {
    icon: <CheckCircle2 className="h-5 w-5 text-secondary-500" />,
    text: "Library of 200+ exercises across cardio, strength & flexibility",
  },
  {
    icon: <CheckCircle2 className="h-5 w-5 text-secondary-500" />,
    text: "Log duration & auto-calculate calories burned",
  },
  {
    icon: <CheckCircle2 className="h-5 w-5 text-secondary-500" />,
    text: "Weekly activity summaries & streak tracking",
  },
  {
    icon: <CheckCircle2 className="h-5 w-5 text-secondary-500" />,
    text: "Net calorie balance: nutrition vs. exercise at a glance",
  },
];

export default function ExerciseSection() {
  return (
    <section className="overflow-hidden bg-gray-50 px-6 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
        {/* Text */}
        <motion.div
          variants={fadeLeft}
          initial="hidden"
          whileInView="show"
          viewport={VP}
          className="order-2 lg:order-1"
        >
          <span className="mb-3 inline-block rounded-full bg-secondary-100 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-secondary-700">
            Exercise
          </span>
          <h2 className="mb-5 text-4xl font-extrabold leading-tight tracking-tight text-gray-900">
            Track every workout,{" "}
            <span className="text-secondary-600">crush every goal</span>
          </h2>
          <p className="mb-7 text-base leading-relaxed text-gray-500">
            From morning runs to heavy lifts — log it all, see calories burned,
            and watch your fitness level climb week over week.
          </p>
          <ul className="space-y-3">
            {exercisePerks.map((p) => (
              <li
                key={p.text}
                className="flex items-start gap-3 text-sm text-gray-600"
              >
                {p.icon} {p.text}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              { icon: <Dumbbell className="h-4 w-4" />, label: "Strength" },
              { icon: <Bike className="h-4 w-4" />, label: "Cardio" },
              { icon: <Zap className="h-4 w-4" />, label: "HIIT" },
              { icon: <Heart className="h-4 w-4" />, label: "Flexibility" },
            ].map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary-100 px-3 py-1.5 text-xs font-semibold text-secondary-700"
              >
                {c.icon} {c.label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Image with overlay card */}
        <motion.div
          variants={fadeRight}
          initial="hidden"
          whileInView="show"
          viewport={VP}
          className="order-1 lg:order-2 relative"
        >
          <div className="img-zoom overflow-hidden rounded-2xl">
            <img
              src="https://images.unsplash.com/photo-1581009137042-c552e485697a?w=800&h=560&fit=crop&q=80"
              alt="Gym workout"
              className="h-[420px] w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-5 -left-5 rounded-2xl border border-white/20 bg-white px-5 py-4 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Today's burn
            </p>
            <p className="text-3xl font-extrabold text-accent-500">
              648{" "}
              <span className="text-base font-medium text-gray-400">kcal</span>
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-accent-400" />
              <span className="text-xs text-gray-500">
                45 min · Strength + Cardio
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

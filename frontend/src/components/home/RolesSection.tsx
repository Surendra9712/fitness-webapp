import { motion } from "framer-motion";
import { Target, Dumbbell, Shield, CheckCircle2 } from "lucide-react";
import { fadeUp, stagger, VP } from "./animations";

const roles = [
  {
    icon: <Target className="h-7 w-7 text-emerald-600" />,
    gradient: "from-emerald-500/10 to-teal-500/10",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
    title: "Customer",
    perks: [
      "Receive a personalised fitness plan",
      "Track daily workouts and calories",
      "Monitor BMI, weight & fitness goals",
      "Browse and shop fitness products",
    ],
  },
  {
    icon: <Dumbbell className="h-7 w-7 text-secondary-600" />,
    gradient: "from-secondary-500/10 to-secondary-700/10",
    border: "border-secondary-200",
    badge: "bg-secondary-100 text-secondary-700",
    title: "Trainer / Dietitian",
    perks: [
      "Manage a roster of assigned clients",
      "Build and assign custom exercise plans",
      "Review client progress in real-time",
      "Public profile to attract new clients",
    ],
  },
  {
    icon: <Shield className="h-7 w-7 text-purple-600" />,
    gradient: "from-purple-500/10 to-pink-500/10",
    border: "border-purple-200",
    badge: "bg-purple-100 text-purple-700",
    title: "Administrator",
    perks: [
      "Full user and trainer management",
      "Approve trainer–client assignments",
      "Manage product and exercise library",
      "Platform-wide analytics dashboard",
    ],
  },
];

export default function RolesSection() {
  return (
    <section className="bg-gray-50 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={VP}
          className="mb-14 text-center"
        >
          <span className="mb-3 inline-block rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">
            For Everyone
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight text-gray-900">
            Built for every role
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-gray-500">
            One platform with a tailored experience — whether you're a member,
            trainer, or administrator.
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={VP}
          className="grid gap-6 md:grid-cols-3"
        >
          {roles.map((r) => (
            <motion.div
              key={r.title}
              variants={fadeUp}
              className={`hover-lift rounded-2xl border ${r.border} bg-gradient-to-br ${r.gradient} p-7`}
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                {r.icon}
              </div>
              <span
                className={`mb-3 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${r.badge}`}
              >
                {r.title}
              </span>
              <ul className="mt-3 space-y-2">
                {r.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

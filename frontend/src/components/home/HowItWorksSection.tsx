import { motion } from "framer-motion";
import { Users, ClipboardList, Flame } from "lucide-react";
import { fadeUp, scaleIn, stagger, VP } from "./animations";

const steps = [
  {
    num: "01",
    icon: <Users className="h-7 w-7 text-emerald-600" />,
    title: "Create Your Account",
    description:
      "Sign up in seconds. Tell us your goals and we'll match you with the right trainer.",
  },
  {
    num: "02",
    icon: <ClipboardList className="h-7 w-7 text-emerald-600" />,
    title: "Get Your Custom Plan",
    description:
      "Your trainer designs a personalised exercise plan built around your lifestyle.",
  },
  {
    num: "03",
    icon: <Flame className="h-7 w-7 text-emerald-600" />,
    title: "Track & Transform",
    description:
      "Log workouts daily. Watch your dashboard fill with real, measurable progress.",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="bg-white px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={VP}
          className="mb-14 text-center"
        >
          <span className="mb-3 inline-block rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">
            How It Works
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight text-gray-900">
            Three steps to a healthier you
          </h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={VP}
          className="relative grid gap-8 md:grid-cols-3"
        >
          <div className="absolute left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] top-8 hidden h-0.5 bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-300 md:block" />
          {steps.map((s) => (
            <motion.div
              key={s.num}
              variants={scaleIn}
              className="relative flex flex-col items-center text-center"
            >
              <div className="relative z-10 mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-emerald-200 bg-white shadow-lg">
                {s.icon}
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                  {s.num}
                </span>
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">{s.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{s.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

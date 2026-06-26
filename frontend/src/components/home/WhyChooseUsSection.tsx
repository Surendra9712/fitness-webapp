import { motion } from "framer-motion";
import { Dumbbell, Target, TrendingUp, Users } from "lucide-react";
import { fadeLeft, fadeRight, stagger, fadeUp, VP } from "./animations";

const features = [
  {
    icon: <Dumbbell className="h-6 w-6 text-emerald-600" />,
    bg: "bg-emerald-50",
    title: "Expert Certified Trainers",
    desc: "Work with vetted fitness professionals who design plans built specifically around your goals.",
  },
  {
    icon: <Target className="h-6 w-6 text-secondary-600" />,
    bg: "bg-secondary-50",
    title: "Fully Personalised Programs",
    desc: "Every programme is tailored to your unique body metrics, lifestyle, and objectives.",
  },
  {
    icon: <TrendingUp className="h-6 w-6 text-emerald-600" />,
    bg: "bg-emerald-50",
    title: "Real-time Progress Tracking",
    desc: "Monitor your journey with live analytics, weekly streaks, and detailed progress reports.",
  },
  {
    icon: <Users className="h-6 w-6 text-secondary-600" />,
    bg: "bg-secondary-50",
    title: "Supportive Community",
    desc: "Join hundreds of members pushing each other toward healthier, stronger lives every day.",
  },
];

const float = (y: [number, number], duration: number, delay = 0) => ({
  animate: { y },
  transition: {
    repeat: Infinity,
    repeatType: "reverse" as const,
    duration,
    ease: "easeInOut",
    delay,
  },
});

export default function WhyChooseUsSection() {
  return (
    <section className="overflow-hidden bg-white px-6 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">

        {/* ── LEFT: Animating image ── */}
        <motion.div
          variants={fadeLeft}
          initial="hidden"
          whileInView="show"
          viewport={VP}
          className="relative flex justify-center"
        >
          {/* Decorative blurred blob */}
          <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-100 blur-3xl" />

          {/* Second image card — static, slightly offset behind */}
          <div className="absolute -right-4 top-8 h-56 w-40 overflow-hidden rounded-2xl shadow-lg">
            <img
              src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=320&h=480&fit=crop&q=80"
              alt="Trainer"
              className="h-full w-full object-cover"
            />
          </div>

          {/* Main floating image */}
          <motion.div
            {...float([-14, 14], 4)}
            className="relative z-10"
          >
            <div className="overflow-hidden rounded-2xl shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=560&h=660&fit=crop&q=80"
                alt="Fitness journey"
                className="h-[440px] w-[320px] object-cover"
              />
            </div>

            {/* Floating stat — top right */}
            <motion.div
              {...float([10, -10], 3, 0.4)}
              className="absolute -right-10 top-10 rounded-2xl bg-white px-4 py-3 shadow-xl"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Members
              </p>
              <p className="text-2xl font-extrabold text-gray-900">500+</p>
              <p className="mt-0.5 text-[11px] font-medium text-emerald-500">
                ↑ Growing daily
              </p>
            </motion.div>

            {/* Floating stat — bottom left */}
            <motion.div
              {...float([-8, 8], 3.5, 0.8)}
              className="absolute -left-10 bottom-12 rounded-2xl bg-white px-4 py-3 shadow-xl"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Satisfaction
              </p>
              <p className="text-2xl font-extrabold text-emerald-600">98%</p>
              <p className="mt-0.5 text-[11px] text-gray-400">Client rated</p>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* ── RIGHT: Content ── */}
        <motion.div
          variants={fadeRight}
          initial="hidden"
          whileInView="show"
          viewport={VP}
        >
          <span className="mb-3 inline-block rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">
            Why Choose Us
          </span>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight text-gray-900">
            The smartest way to reach{" "}
            <span className="text-emerald-600">your fitness goals</span>
          </h2>
          <p className="mb-10 text-base leading-relaxed text-gray-500">
            SmartDiet combines expert human guidance with smart tracking tools —
            so you stay motivated, on-plan, and seeing real results every week.
          </p>

          <motion.ul
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={VP}
            className="space-y-5"
          >
            {features.map((f) => (
              <motion.li
                key={f.title}
                variants={fadeUp}
                className="flex items-start gap-4"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${f.bg}`}
                >
                  {f.icon}
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-bold text-gray-900">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-500">{f.desc}</p>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </div>
    </section>
  );
}

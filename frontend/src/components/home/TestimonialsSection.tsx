import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ArrowLeft, ArrowRight } from "lucide-react";
import { fadeUp, VP } from "./animations";

const testimonials = [
  {
    name: "Priya Sharma",
    result: "Lost 12 kg in 3 months",
    img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&q=80",
    quote:
      "SmartDiet completely changed how I think about fitness. My trainer's plan was so easy to follow and the app kept me accountable every single day.",
    stars: 5,
  },
  {
    name: "Rohan KC",
    result: "Gained 8 kg of muscle",
    img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&q=80",
    quote:
      "The exercise tracking combined with a proper plan gave me results I never thought possible. Highly recommend to anyone serious about fitness.",
    stars: 5,
  },
  {
    name: "Anita Thapa",
    result: "Maintained healthy weight",
    img: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=300&h=300&fit=crop&q=80",
    quote:
      "As a busy professional I needed something simple. SmartDiet gives me structure without the stress. My energy levels have never been better.",
    stars: 5,
  },
];

export default function TestimonialsSection() {
  const [active, setActive] = useState(0);

  const len = testimonials.length;
  const idx = (offset: number) => (active + offset + len) % len;

  const prev = () => setActive(idx(-1));
  const next = () => setActive(idx(1));
  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % len);
    }, 3000);

    return () => clearInterval(interval);
  }, []);
  const current = testimonials[active];

  return (
    <section className="relative overflow-hidden bg-gray-950 px-6 py-24">
      {/* ── Scattered outer dots ── */}
      <span className="absolute left-[8%]  top-[12%]  h-3   w-3   rounded-full bg-primary-500" />
      <span className="absolute left-[20%] top-[18%]  h-5   w-5   rounded-full bg-primary-500" />
      <span className="absolute left-[5%]  top-[48%]  h-2.5 w-2.5 rounded-full bg-primary-500" />
      <span className="absolute left-[6%]  bottom-[18%] h-24  w-24  rounded-full bg-primary-500" />
      <span className="absolute left-[14%] bottom-[10%] h-3   w-3   rounded-full bg-primary-500" />
      <span className="absolute right-[7%] top-[8%]   h-20  w-20  rounded-full bg-primary-500/30" />
      <span className="absolute right-[4%] top-[48%]  h-3   w-3   rounded-full bg-primary-500" />
      <span className="absolute right-[14%] bottom-[12%] h-4  w-4   rounded-full bg-primary-500" />
      <span className="absolute right-[10%] bottom-[28%] h-2  w-2   rounded-full bg-primary-500" />

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={VP}
        className="mx-auto max-w-4xl"
      >
        {/* Offset card */}
        <div className="relative">
          <div className="absolute inset-0 translate-x-3 translate-y-3 -rotate-5 rounded-3xl bg-primary-500" />

          {/* Main white card */}
          <div className="relative overflow-hidden rounded-3xl bg-white px-8 py-16 sm:px-20">
            {/* Inner card dots */}
            <span className="absolute left-[10%]  top-[14%]  h-3   w-3   rounded-full bg-primary-500/60" />
            <span className="absolute left-[22%]  top-[22%]  h-2   w-2   rounded-full bg-primary-400/50" />
            <span className="absolute right-[12%] top-[10%]  h-2.5 w-2.5 rounded-full bg-primary-500/60" />
            <span className="absolute right-[7%]  top-[40%]  h-2   w-2   rounded-full bg-primary-400/50" />
            <span className="absolute left-[12%]  bottom-[14%] h-2  w-2   rounded-full bg-primary-500/60" />
            <span className="absolute right-[45%] bottom-[8%]  h-2  w-2   rounded-full bg-primary-400/50" />

            {/* Heading */}
            <div className="relative mb-14 text-center">
              <div className="mx-auto mb-5 h-0.5 w-8 bg-gray-800" />
              <h2 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">
                What our members are saying
                <br />
                about SmartDiet.
              </h2>
            </div>

            {/* Avatar row: prev · current · next */}
            <div className="relative mb-8 flex items-end justify-center gap-8">
              <button
                onClick={prev}
                className="mb-4 shrink-0 transition-transform duration-200 hover:scale-110 focus:outline-none"
                aria-label="Previous"
              >
                <img
                  src={testimonials[idx(-1)].img}
                  alt={testimonials[idx(-1)].name}
                  className="h-16 w-16 rounded-full object-cover opacity-50 shadow-md ring-2 ring-gray-200"
                />
              </button>

              <div className="shrink-0">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={active}
                    src={current.img}
                    alt={current.name}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="h-28 w-28 rounded-full object-cover shadow-2xl ring-4 ring-primary-200"
                  />
                </AnimatePresence>
              </div>

              <button
                onClick={next}
                className="mb-4 shrink-0 transition-transform duration-200 hover:scale-110 focus:outline-none"
                aria-label="Next"
              >
                <img
                  src={testimonials[idx(1)].img}
                  alt={testimonials[idx(1)].name}
                  className="h-16 w-16 rounded-full object-cover opacity-50 shadow-md ring-2 ring-gray-200"
                />
              </button>
            </div>

            {/* Name + stars */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`meta-${active}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="text-center"
              >
                <p className="text-xl font-bold text-gray-900">
                  {current.name}
                </p>
                <div className="mt-2 flex justify-center gap-1">
                  {Array.from({ length: current.stars }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 fill-primary-500 text-primary-500"
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Quote + nav arrows */}
            <div className="mt-8 flex items-center gap-6">
              <button
                onClick={prev}
                className="shrink-0 text-gray-400 transition-colors hover:text-gray-700 focus:outline-none"
                aria-label="Previous testimonial"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <AnimatePresence mode="wait">
                <motion.p
                  key={`quote-${active}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="text-center text-sm leading-relaxed text-gray-500"
                >
                  {current.quote}
                </motion.p>
              </AnimatePresence>

              <button
                onClick={next}
                className="shrink-0 text-gray-400 transition-colors hover:text-gray-700 focus:outline-none"
                aria-label="Next testimonial"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>

            {/* Dot indicators */}
            <div className="mt-8 flex justify-center gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-2 rounded-full transition-all duration-300 focus:outline-none ${
                    i === active
                      ? "w-6 bg-primary-500"
                      : "w-2 bg-gray-300 hover:bg-gray-400"
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

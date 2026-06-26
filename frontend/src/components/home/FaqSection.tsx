import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { fadeUp, VP } from "./animations";

const faqs = [
  {
    q: "How do I get matched with a trainer?",
    a: "After creating your account you can browse our trainer directory, view their specializations and ratings, and send a request. Your trainer reviews it and your admin confirms the match — usually within 24 hours.",
  },
  {
    q: "Is the fitness plan really personalised?",
    a: "Yes. Your trainer builds your plan based on your body metrics (weight, height, age), goals, activity level, and any preferences you share during onboarding.",
  },
  {
    q: "Can I track exercises if I work out at home?",
    a: "Absolutely. Our exercise library includes 200+ movements across cardio, strength, flexibility, and sports. You log the exercise and duration, and we calculate the calories burned automatically.",
  },
  {
    q: "What fitness products can I buy on SmartDiet?",
    a: "We stock a curated range of equipment, supplements, and recovery gear. You can browse, add to cart, and pay via Cash on Delivery, eSewa, or Khalti.",
  },
  {
    q: "Is my data safe?",
    a: "All data is encrypted in transit and at rest. We never sell your personal information. Only your assigned trainer and admin can see your profile metrics.",
  },
];

export default function FaqSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section className="bg-gray-50 px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={VP}
          className="mb-12 text-center"
        >
          <span className="mb-3 inline-block rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">
            FAQ
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight text-gray-900">
            Common questions
          </h2>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={VP}
          className="space-y-3"
        >
          {faqs.map((f, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-5 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
              >
                {f.q}
                {openFaq === i ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                )}
              </button>
              <div className={`faq-answer ${openFaq === i ? "open" : "closed"}`}>
                <p className="px-6 pb-5 text-sm leading-relaxed text-gray-500">
                  {f.a}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

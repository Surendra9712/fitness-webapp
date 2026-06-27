import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Leaf, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getDashboardPath } from "@/lib/constant";
import { Button } from "@/components/ui/button";
import { fadeUp, VP } from "./animations";

export default function CtaSection() {
  const { user } = useAuth();

  return (
    <section className="relative overflow-hidden bg-primary-950 px-6 py-24">
      <div
        className="absolute inset-0 bg-cover bg-center "
        style={{
          backgroundImage:
            "url('https://img.magnific.com/free-photo/strong-man-training-gym_1303-23478.jpg?semt=ais_hybrid&w=740&q=80')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary-950 via-primary-900/90 to-teal-950" />
      <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-primary-500/10 blur-3xl" />
      <div className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={VP}
        >
          <div className="mb-6 flex justify-center">
            <div className="pulse-ring relative flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/20">
              <Leaf className="h-8 w-8 text-primary-400" />
            </div>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Ready to start your
            <br />
            <span className="gradient-text">transformation?</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-base text-white/50">
            Join hundreds of members already moving more and hitting their goals
            — starting today.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {user ? (
              <Button
                size="lg"
                className="bg-primary px-10 text-base font-semibold text-white hover:bg-primary-400 shadow-lg"
                asChild
              >
                <Link to={getDashboardPath(user.role)}>
                  Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  className="bg-emerald-500 px-10 text-base font-semibold text-white hover:bg-emerald-400 shadow-lg"
                  asChild
                >
                  <Link to="/login?tab=register">
                    Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="accent" asChild>
                  <Link to="/products">Browse Products</Link>
                </Button>
              </>
            )}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-white/30">
            {[
              "No credit card required",
              "Cancel anytime",
              "Secure & private",
            ].map((l) => (
              <span key={l} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary-500/60" /> {l}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

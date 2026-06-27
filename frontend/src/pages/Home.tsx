import { useAuth } from "@/context/AuthContext";
import PublicLayout from "@/components/PublicLayout";
import HeroSection from "@/components/home/HeroSection";
import BigStatsSection from "@/components/home/BigStatsSection";
import WhyChooseUsSection from "@/components/home/WhyChooseUsSection";
import ExerciseSection from "@/components/home/ExerciseSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import TrainersSection from "@/components/home/TrainersSection";
import ProductsSection from "@/components/home/ProductsSection";
import RolesSection from "@/components/home/RolesSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import FaqSection from "@/components/home/FaqSection";
import CtaSection from "@/components/home/CtaSection";

export default function Home() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <PublicLayout>
      <HeroSection />
      <BigStatsSection />
      <WhyChooseUsSection />
      <ExerciseSection />
      <HowItWorksSection />
      <TrainersSection />
      <ProductsSection />
      <RolesSection />
      <TestimonialsSection />
      <FaqSection />
      <CtaSection />
    </PublicLayout>
  );
}

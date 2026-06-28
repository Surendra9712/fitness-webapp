import { Sparkles, Dumbbell, Utensils, Moon, TrendingUp, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MOCK_RECOMMENDATIONS = [
  {
    icon: <Dumbbell className="h-5 w-5 text-emerald-500" />,
    title: "Workout Plan",
    description: "Based on your goal and activity level, a 4-day strength training split is recommended.",
    tag: "Fitness",
  },
  {
    icon: <Utensils className="h-5 w-5 text-orange-500" />,
    title: "Nutrition Tips",
    description: "Your BMR suggests a daily intake of ~2,100 kcal with 40% carbs, 30% protein, 30% fat.",
    tag: "Nutrition",
  },
  {
    icon: <Moon className="h-5 w-5 text-indigo-500" />,
    title: "Recovery",
    description: "Aim for 7–8 hours of sleep and include 2 rest days per week for optimal recovery.",
    tag: "Recovery",
  },
  {
    icon: <TrendingUp className="h-5 w-5 text-primary" />,
    title: "Progress Insight",
    description: "You're on track! Consistency over 3 weeks improves muscle retention by up to 15%.",
    tag: "Insight",
  },
];

export default function AiRecommendation() {
  const { user } = useAuth();

  const isPro = user?.subscription_plan === "pro" && user?.subscription_status === "active";

  if (!isPro) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center max-w-md mx-auto">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Pro Feature</h2>
        <p className="text-sm text-muted-foreground">
          AI Recommendations are available exclusively on the Pro plan.
          Upgrade to unlock personalised workout, nutrition, and recovery guidance.
        </p>
        <Button asChild className="mt-2">
          <Link to="/customer/subscription">Upgrade to Pro</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Recommendations</h1>
          <p className="text-sm text-muted-foreground">Personalised guidance based on your profile and goals.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {MOCK_RECOMMENDATIONS.map((rec) => (
          <Card key={rec.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 flex-row items-start gap-3 space-y-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                {rec.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{rec.title}</CardTitle>
                  <Badge variant="secondary" className="text-xs">{rec.tag}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{rec.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-center text-muted-foreground pt-2">
        Recommendations are generated based on your profile data. Update your profile for better suggestions.
      </p>
    </div>
  );
}

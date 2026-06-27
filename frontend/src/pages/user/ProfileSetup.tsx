import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

import {
  profileSchema,
  STEP_REQUIRED,
  type ProfileValues,
} from "./profile/schema";
import { STEPS } from "./profile/constants";
import { parseJsonField, type Macros } from "./profile/utils";
import { Step1Personal } from "./profile/Step1Personal";
import { Step2Goals } from "./profile/Step2Goals";
import { Step3Diet } from "./profile/Step3Diet";
import { Step4Habits } from "./profile/Step4Habits";
import { Step5Health } from "./profile/Step5Health";
import { Dialog } from "@radix-ui/react-dialog";
import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";

export default function ProfileSetup({
  isOpen = false,
  onDone,
  onClose,
  inline = false,
}: {
  isOpen?: boolean;
  onDone?: () => void;
  onClose?: (val: boolean) => void;
  inline?: boolean;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const { user } = useAuth();

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema) as Resolver<ProfileValues>,
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      full_name: user?.name || "",
      date_of_birth: "",
      gender: "male",
      phone_number: "",
      city: "",
      country: "Nepal",
      height_cm: "",
      current_weight_kg: "",
      activity_level: "moderate",
      occupation: "",
      primary_goal: "lose_weight",
      fitness_level: "beginner",
      target_water_ml: 2000,
      diet_type: "none",
      dietary_restrictions: [],
      other_restrictions: "",
      allergens: [],
      cuisine_preferences: [],
      breakfast_time: "07:30",
      lunch_time: "12:30",
      dinner_time: "19:00",
      avg_sleep_hours: "7",
      meals_per_day: 3,
      snacks_between_meals: false,
      cooking_frequency: "daily",
      eating_out_frequency: 2,
      track_hydration: true,
      emotional_eater: false,
      stress_level: "moderate",
      health_conditions: [],
      notes: "",
    },
  });

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = user as any;
    if (!data?.full_name) return;
    setIsEdit(true);
    form.reset({
      full_name: (data.full_name as string) ?? user?.name ?? "",
      date_of_birth: data.date_of_birth
        ? String(data.date_of_birth).slice(0, 10)
        : "",
      gender: (data.gender as ProfileValues["gender"]) ?? "male",
      phone_number: (data.phone_number as string) ?? "",
      city: (data.city as string) ?? "",
      country: (data.country as string) ?? "Nepal",
      height_cm: data.height_cm ? String(data.height_cm) : "",
      current_weight_kg: data.current_weight_kg
        ? String(data.current_weight_kg)
        : "",
      activity_level:
        (data.activity_level as ProfileValues["activity_level"]) ??
        "moderate",
      occupation: (data.occupation as string) ?? "",
      primary_goal:
        (data.primary_goal as ProfileValues["primary_goal"]) ??
        "lose_weight",
      fitness_level:
        (data.fitness_level as ProfileValues["fitness_level"]) ??
        "beginner",
      target_water_ml: (data.target_water_ml as number) ?? 2000,
      diet_type: (data.diet_type as ProfileValues["diet_type"]) ?? "none",
      dietary_restrictions: parseJsonField<string[]>(
        data.dietary_restrictions,
        [],
      ),
      other_restrictions: (data.other_restrictions as string) ?? "",
      allergens: parseJsonField<string[]>(data.allergens, []),
      cuisine_preferences: parseJsonField<string[]>(
        data.cuisine_preferences,
        [],
      ),
      breakfast_time: data.breakfast_time
        ? String(data.breakfast_time).slice(0, 5)
        : "07:30",
      lunch_time: data.lunch_time
        ? String(data.lunch_time).slice(0, 5)
        : "12:30",
      dinner_time: data.dinner_time
        ? String(data.dinner_time).slice(0, 5)
        : "19:00",
      avg_sleep_hours: data.avg_sleep_hours
        ? String(data.avg_sleep_hours)
        : "7",
      meals_per_day: (data.meals_per_day as number) ?? 3,
      snacks_between_meals: Boolean(data.snacks_between_meals),
      cooking_frequency:
        (data.cooking_frequency as ProfileValues["cooking_frequency"]) ??
        "daily",
      eating_out_frequency: (data.eating_out_frequency as number) ?? 2,
      track_hydration: Boolean(data.track_hydration ?? true),
      emotional_eater: Boolean(data.emotional_eater),
      stress_level:
        (data.stress_level as ProfileValues["stress_level"]) ?? "moderate",
      health_conditions: parseJsonField<ProfileValues["health_conditions"]>(
        data.health_conditions,
        [],
      ),
      notes: (data.notes as string) ?? "",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = async () => {
    const required = STEP_REQUIRED[step] ?? [];
    if (required.length > 0 && !(await form.trigger(required))) return;
    if (step < 5) {
      setStep((s) => s + 1);
      return;
    }

    setLoading(true);
    try {
      const v = form.getValues();
      const payload = {
        full_name: v.full_name,
        date_of_birth: v.date_of_birth,
        gender: v.gender,
        phone_number: v.phone_number,
        city: v.city,
        country: v.country,
        height_cm: parseFloat(v.height_cm as string),
        current_weight_kg: parseFloat(v.current_weight_kg as string),
        activity_level: v.activity_level,
        occupation: v.occupation,
        primary_goal: v.primary_goal,
        fitness_level: v.fitness_level,
        target_water_ml: v.target_water_ml,
        diet_type: v.diet_type,
        dietary_restrictions: v.dietary_restrictions,
        other_restrictions: v.other_restrictions,
        allergens: v.allergens,
        cuisine_preferences: v.cuisine_preferences,
        breakfast_time: v.breakfast_time,
        lunch_time: v.lunch_time,
        dinner_time: v.dinner_time,
        avg_sleep_hours: parseFloat(v.avg_sleep_hours as string) || 7,
        meals_per_day: v.meals_per_day,
        snacks_between_meals: v.snacks_between_meals,
        cooking_frequency: v.cooking_frequency,
        eating_out_frequency: v.eating_out_frequency,
        track_hydration: v.track_hydration,
        emotional_eater: v.emotional_eater,
        stress_level: v.stress_level,
        health_conditions: v.health_conditions,
        notes: v.notes,
      };

      if (isEdit) {
        await api.put<{ message: string; daily_targets?: Macros }>(
          "/onboarding/profile",
          payload,
        );
      } else {
        await api.post<{ daily_targets: Macros }>(
          "/onboarding/complete",
          payload,
        );
      }
      setStep(6);
    } catch {
      /* add toast if desired */
    } finally {
      setLoading(false);
    }
  };

  const pct = ((step - 1) / 5) * 100;

  const StepIndicator = () =>
    step <= 5 ? (
      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
          <span className="font-semibold text-gray-700">
            Step {step} of 5 — {STEPS[step - 1]}
          </span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-4 flex items-center">
          {STEPS.map((label, i) => (
            <div
              key={i}
              className={cn("flex items-center", i < STEPS.length - 1 && "flex-1")}
            >
              <div
                title={label}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold border-2 transition-colors",
                  step > i + 1 || step === i + 1
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-gray-200 bg-white text-gray-400",
                )}
              >
                {step > i + 1 ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-1 transition-colors",
                    step > i + 1 ? "bg-emerald-500" : "bg-gray-200",
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    ) : null;

  const DoneScreen = () => (
    <div className="flex flex-col items-center py-8 text-center gap-2">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
        <Check className="h-8 w-8 text-primary-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900">You're all set! 🎉</h2>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        Your personalised fitness profile is ready. Head to your dashboard to
        start tracking.
      </p>
      <Button onClick={() => (onDone ? onDone() : navigate("/dashboard"))}>
        {onDone ? "Done" : "Go to Dashboard"}
      </Button>
    </div>
  );

  const NavButtons = () =>
    step <= 5 ? (
      <div className="flex justify-between">
        <div>
          {step > 1 && (
            <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
              ← Previous
            </Button>
          )}
        </div>
        <Button type="button" onClick={next} disabled={loading}>
          {loading ? "Saving…" : step === 5 ? "Finish Setup" : "Continue →"}
        </Button>
      </div>
    ) : null;

  if (inline) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Complete Your Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set up your fitness profile to unlock personalised metrics and recommendations.
          </p>
        </div>
        <StepIndicator />
        <Form {...form}>
          <Card>
            <CardContent className="pt-6 space-y-5">
              {step === 1 && <Step1Personal />}
              {step === 2 && <Step2Goals />}
              {step === 3 && <Step3Diet />}
              {step === 4 && <Step4Habits />}
              {step === 5 && <Step5Health />}
              {step === 6 && <DoneScreen />}
            </CardContent>
            {step <= 5 && (
              <CardFooter className="w-full">
                <div className="w-full">
                  <NavButtons />
                </div>
              </CardFooter>
            )}
          </Card>
        </Form>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <StepIndicator />
        </DialogHeader>
        <Form {...form}>
          <DialogBody>
            <div className="space-y-5">
              {step === 1 && <Step1Personal />}
              {step === 2 && <Step2Goals />}
              {step === 3 && <Step3Diet />}
              {step === 4 && <Step4Habits />}
              {step === 5 && <Step5Health />}
              {step === 6 && <DoneScreen />}
            </div>
          </DialogBody>
          {step <= 5 && (
            <DialogFooter className="justify-between!">
              <NavButtons />
            </DialogFooter>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}

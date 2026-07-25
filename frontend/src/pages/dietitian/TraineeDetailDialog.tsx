import {
  Activity,
  AlertTriangle,
  Apple,
  CalendarDays,
  Droplets,
  Flame,
  HeartPulse,
  Mail,
  MapPin,
  Phone,
  Ruler,
  Scale,
  StickyNote,
  Target,
  Utensils,
} from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import useAdmin from "@/hooks/useAdmin";
import { avatarInitial, GENDER } from "@/lib/constant";
import type { Gender, TraineeDetail, TrainerAssignment } from "@/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const GOAL_LABEL: Record<string, string> = {
  lose_weight: "Lose weight",
  gain_muscle: "Gain muscle",
  maintain: "Maintain weight",
  improve_health: "Improve health",
  athletic_performance: "Athletic performance",
};

const ACTIVITY_LABEL: Record<string, string> = {
  sedentary: "Sedentary",
  light: "Lightly active",
  moderate: "Moderately active",
  active: "Active",
  very_active: "Very active",
};

const DIET_LABEL: Record<string, string> = {
  none: "No specific diet",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  keto: "Keto",
  paleo: "Paleo",
  diabetic: "Diabetic",
  low_carb: "Low carb",
  intermittent_fasting: "Intermittent fasting",
};

const STATUS_BADGE: Record<string, string> = {
  pending_trainer: "bg-yellow-100 text-yellow-800 border-yellow-200",
  pending_admin: "bg-blue-100 text-blue-800 border-blue-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_LABEL: Record<string, string> = {
  pending_trainer: "Awaiting You",
  pending_admin: "Awaiting Admin",
  approved: "Approved",
  rejected: "Rejected",
};

/** Turns a snake_case enum value into a readable label. */
function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Mail;
  label: string;
  value?: string | number | null;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        {label}
      </span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Mail;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </p>
      <div className="divide-y rounded-lg border bg-card px-3">{children}</div>
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1 py-2">
      {items.map((item) => (
        <Badge key={item} variant="secondary" className="text-xs font-normal">
          {humanize(item)}
        </Badge>
      ))}
    </div>
  );
}

/**
 * Trainee profile for a trainer, opened from an assignment row.
 *
 * Mount this only while a row is selected — the shared user-detail query has no
 * id-guard, so an undefined id would fall back to the users *list* endpoint.
 * Assignment context (status, their note, request date) comes from the row
 * that was clicked; only the profile itself is fetched.
 */
export function TraineeDetailDialog({
  assignment,
  onClose,
}: {
  assignment: TrainerAssignment;
  onClose: () => void;
}) {
  const { GetUserDetail } = useAdmin();
  const { data, isLoading, isError, error } = GetUserDetail({
    id: assignment.customer_id,
  });
  const trainee = data as TraineeDetail | undefined;

  const name =
    trainee?.full_name ||
    trainee?.name ||
    assignment.customer_name ||
    "Trainee";
  const metrics = trainee?.metrics;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Trainee Profile</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {isLoading && !trainee ? (
            <>
              <div className="flex items-center gap-3">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-52" />
                </div>
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                </div>
              ))}
            </>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {(error as Error)?.message ?? "Could not load this profile."}
            </p>
          ) : trainee ? (
            <>
              {/* Identity */}
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback>{avatarInitial(name)}</AvatarFallback>
                  <AvatarImage src={trainee?.profile_image_url} />
                </Avatar>
                {/* {trainee.profile_image_url ? (
                  <img
                    src={trainee.profile_image_url}
                    alt={name}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
                    {}
                  </div>
                )} */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {trainee.email}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <Badge className={STATUS_BADGE[assignment.status] ?? ""}>
                      {STATUS_LABEL[assignment.status] ?? assignment.status}
                    </Badge>
                    {trainee.subscription_plan === "pro" && (
                      <Badge variant="secondary" className="text-xs">
                        Pro
                      </Badge>
                    )}
                    {trainee.age != null && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {trainee.age} yrs
                      </Badge>
                    )}
                    {trainee.gender && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {GENDER[trainee.gender as Gender] ??
                          humanize(trainee.gender)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {assignment.customer_note && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="mb-0.5 text-xs font-semibold text-primary">
                    Their message to you
                  </p>
                  <p className="text-sm">{assignment.customer_note}</p>
                </div>
              )}

              {/* Calculated targets */}
              {metrics && (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      {
                        label: "BMI",
                        value: metrics.bmi,
                        sub: metrics.bmi_category,
                      },
                      { label: "BMR", value: metrics.bmr, sub: "kcal at rest" },
                      { label: "TDEE", value: metrics.tdee, sub: "kcal/day" },
                      {
                        label: "Target",
                        value: metrics.daily_calories,
                        sub: "kcal goal",
                      },
                    ].map((m) => (
                      <div
                        key={m.label}
                        className="rounded-lg border bg-card p-2 text-center"
                      >
                        <p className="text-lg font-bold text-primary">
                          {m.value}
                        </p>
                        <p className="text-xs font-medium">{m.label}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {m.sub}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    Macro split — P {metrics.macros.protein}g · C{" "}
                    {metrics.macros.carbs}g · F {metrics.macros.fat}g
                  </p>
                </>
              )}

              <Separator />

              <Section icon={Target} title="Body & Goals">
                <Row
                  icon={Scale}
                  label="Current weight"
                  value={
                    trainee.current_weight_kg
                      ? `${trainee.current_weight_kg} kg`
                      : null
                  }
                />
                <Row
                  icon={Ruler}
                  label="Height"
                  value={trainee.height_cm ? `${trainee.height_cm} cm` : null}
                />
                <Row
                  icon={Flame}
                  label="Primary goal"
                  value={
                    trainee.primary_goal
                      ? (GOAL_LABEL[trainee.primary_goal] ??
                        humanize(trainee.primary_goal))
                      : null
                  }
                />
                <Row
                  icon={Activity}
                  label="Activity level"
                  value={
                    trainee.activity_level
                      ? (ACTIVITY_LABEL[trainee.activity_level] ??
                        humanize(trainee.activity_level))
                      : null
                  }
                />
                <Row
                  label="Fitness level"
                  value={
                    trainee.fitness_level
                      ? humanize(trainee.fitness_level)
                      : null
                  }
                />
                <Row
                  icon={Droplets}
                  label="Water goal"
                  value={
                    trainee.target_water_ml
                      ? `${trainee.target_water_ml} ml/day`
                      : null
                  }
                />
              </Section>

              <Section icon={Utensils} title="Diet">
                <Row
                  label="Diet type"
                  value={
                    trainee.diet_type
                      ? (DIET_LABEL[trainee.diet_type] ??
                        humanize(trainee.diet_type))
                      : null
                  }
                />
                <Row label="Meals per day" value={trainee.meals_per_day} />
                {trainee.dietary_restrictions?.length > 0 && (
                  <div>
                    <p className="pt-2 text-sm text-muted-foreground">
                      Restrictions
                    </p>
                    <Chips items={trainee.dietary_restrictions} />
                  </div>
                )}
                <Row
                  label="Other restrictions"
                  value={trainee.other_restrictions}
                />
                {trainee.allergens?.length > 0 && (
                  <div>
                    <p className="flex items-center gap-1.5 pt-2 text-sm text-muted-foreground">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      Allergens
                    </p>
                    <Chips items={trainee.allergens} />
                  </div>
                )}
                {trainee.cuisine_preferences?.length > 0 && (
                  <div>
                    <p className="flex items-center gap-1.5 pt-2 text-sm text-muted-foreground">
                      <Apple className="h-3.5 w-3.5 shrink-0" />
                      Preferred cuisines
                    </p>
                    <Chips items={trainee.cuisine_preferences} />
                  </div>
                )}
              </Section>

              {trainee.health_conditions?.length > 0 && (
                <Section icon={HeartPulse} title="Health Conditions">
                  {trainee.health_conditions.map((c, i) => (
                    <Row
                      key={i}
                      label={c.name ?? c.condition ?? `Condition ${i + 1}`}
                      value={c.notes ?? "—"}
                    />
                  ))}
                </Section>
              )}

              <Section icon={Mail} title="Contact">
                <Row icon={Mail} label="Email" value={trainee.email} />
                <Row icon={Phone} label="Phone" value={trainee.phone_number} />
                <Row
                  icon={MapPin}
                  label="Location"
                  value={
                    [trainee.city, trainee.country]
                      .filter(Boolean)
                      .join(", ") || null
                  }
                />
                <Row label="Occupation" value={trainee.occupation} />
                <Row
                  icon={CalendarDays}
                  label="Date of birth"
                  value={
                    trainee.date_of_birth
                      ? new Date(trainee.date_of_birth).toLocaleDateString()
                      : null
                  }
                />
                <Row
                  icon={CalendarDays}
                  label="Requested on"
                  value={new Date(assignment.created_at).toLocaleDateString()}
                />
              </Section>

              {trainee.notes && (
                <Section icon={StickyNote} title="Their Notes">
                  <p className="py-2 text-sm leading-relaxed">
                    {trainee.notes}
                  </p>
                </Section>
              )}
            </>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

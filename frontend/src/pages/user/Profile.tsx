import { useState } from "react";
import {
  Camera,
  Pencil,
  User2,
  Ruler,
  Dumbbell,
  CalendarDays,
  BarChart2,
  Target,
  Utensils,
  Clock,
  Heart,
  MapPin,
  Activity,
  User,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  GOALS,
  DIETS,
  ACTIVITIES,
  FITNESS,
  COOKING,
  STRESS,
} from "./profile/constants";
import ProfileSetup from "./ProfileSetup";
import { AvatarModal } from "./profile/AvatarModal";
import { useAuth } from "@/context/AuthContext";

function asArr(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return [];
    }
  }
  return [];
}

function parseConditions(v: unknown): HealthCondition[] {
  if (Array.isArray(v)) return v as HealthCondition[];
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return [];
    }
  }
  return [];
}

interface HealthCondition {
  name: string;
  type: string;
  affects_diet: boolean;
}

const GOAL_MAP = Object.fromEntries(
  GOALS.map((g) => [g.key, `${g.icon} ${g.title}`]),
);
const DIET_MAP = Object.fromEntries(DIETS);
const ACTIVITY_MAP = Object.fromEntries(ACTIVITIES);
const FITNESS_MAP = Object.fromEntries(FITNESS);
const COOKING_MAP = Object.fromEntries(COOKING);
const STRESS_MAP = Object.fromEntries(STRESS);

function calcAge(dob: string): number | null {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (
    today.getMonth() < d.getMonth() ||
    (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())
  )
    age--;
  return age;
}

function calcBMI(weight?: number, height?: number): number | null {
  if (!weight || !height) return null;
  return weight / (height / 100) ** 2;
}

function bmiMeta(bmi: number): {
  label: string;
  textColor: string;
  bgColor: string;
} {
  if (bmi < 18.5)
    return {
      label: "Underweight",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
    };
  if (bmi < 25)
    return {
      label: "Normal",
      textColor: "text-emerald-600",
      bgColor: "bg-emerald-50",
    };
  if (bmi < 30)
    return {
      label: "Overweight",
      textColor: "text-amber-600",
      bgColor: "bg-amber-50",
    };
  return { label: "Obese", textColor: "text-red-600", bgColor: "bg-red-50" };
}

function StatCard({
  icon,
  label,
  value,
  sub,
  subColor,
  iconBg,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3">
      <div
        className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center",
          iconBg,
        )}
      >
        <span className={iconColor}>{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && (
          <p className={cn("text-xs font-semibold mt-0.5", subColor)}>
            {sub}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  iconBg,
  iconColor,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  iconBg: string;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 flex items-center gap-3 border-b border-gray-50">
        <div
          className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
            iconBg,
          )}
        >
          <span className={iconColor}>{icon}</span>
        </div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="bg-gray-50 rounded-xl px-4 py-3">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-800">{value ?? "—"}</p>
    </div>
  );
}

function TagList({ items }: { items?: string[] }) {
  if (!items?.length)
    return <span className="text-sm text-gray-400 italic">None</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium capitalize"
        >
          {item.replace(/_/g, " ")}
        </span>
      ))}
    </div>
  );
}

function TagSection({
  label,
  items,
}: {
  label: string;
  items?: string[];
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
        {label}
      </p>
      <TagList items={items} />
    </div>
  );
}

export default function Profile() {
  const [modalOpen, setModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const { user, loading: isLoading, refreshUser } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = user as any;

  const handleDone = () => {
    setModalOpen(false);
    refreshUser();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const hasProfile = Boolean(data?.full_name);
  const displayName = data?.full_name || data?.name || "";
  const initials = displayName
    .split(" ")
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const age = data?.date_of_birth ? calcAge(data.date_of_birth) : null;
  const bmi = calcBMI(data?.current_weight_kg, data?.height_cm);
  const bmiInfo = bmi ? bmiMeta(bmi) : null;

  const genderLabel = data?.gender
    ? data.gender
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase())
    : undefined;

  return (
    <div className="space-y-4">
      {/* ── Hero card ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        {/* Cover */}
        <div className="h-32 bg-linear-to-br from-emerald-400 via-green-500 to-teal-500 relative">
          {/* subtle mesh pattern */}
          <svg
            className="absolute inset-0 w-full h-full opacity-10"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="grid"
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 24 0 L 0 0 0 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          <Button
            onClick={() => setModalOpen(true)}
            variant="ghost"
            className="absolute top-4 right-4 gap-2 bg-white/20 hover:bg-white/30 text-white border border-white/25 backdrop-blur-sm h-9 px-4 text-sm font-medium"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Profile
          </Button>
        </div>

        {/* Avatar + info */}
        <div className="px-6 pb-6">
          <div className="-mt-11 mb-4">
            <button
              type="button"
              onClick={() => setAvatarModalOpen(true)}
              className="relative group rounded-full ring-4 ring-white focus:outline-none focus-visible:ring-emerald-400 inline-block"
              title="Change profile photo"
            >
              {data?.profile_image_url ? (
                <img
                  src={data.profile_image_url}
                  alt={displayName}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-2xl font-bold text-white select-none">
                  {initials || <User2 className="h-8 w-8 text-white" />}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </button>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {displayName || "—"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.email}</p>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold capitalize">
              {data?.role}
            </span>
            {data?.city && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <MapPin className="h-3.5 w-3.5" />
                {[data.city, data.country].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Empty state ──────────────────────────────────── */}
      {!hasProfile ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-14 text-center">
          <div className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200">
            <User2 className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">
            Profile not set up yet
          </h2>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
            Complete your fitness profile to get personalised meal plans,
            calorie targets, and recommendations.
          </p>
          <Button
            className="mt-6 bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-200 gap-2"
            onClick={() => setModalOpen(true)}
          >
            <Zap className="h-4 w-4" />
            Set Up Profile
          </Button>
        </div>
      ) : (
        <>
          {/* ── Quick stats ───────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={<Ruler className="h-5 w-5" />}
              label="Height"
              value={data?.height_cm ? `${data.height_cm} cm` : "—"}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />
            <StatCard
              icon={<Dumbbell className="h-5 w-5" />}
              label="Weight"
              value={
                data?.current_weight_kg ? `${data.current_weight_kg} kg` : "—"
              }
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
            />
            <StatCard
              icon={<CalendarDays className="h-5 w-5" />}
              label="Age"
              value={age != null ? `${age} yrs` : "—"}
              iconBg="bg-orange-50"
              iconColor="text-orange-500"
            />
            <StatCard
              icon={<BarChart2 className="h-5 w-5" />}
              label="BMI"
              value={bmi ? bmi.toFixed(1) : "—"}
              sub={bmiInfo?.label}
              subColor={bmiInfo?.textColor}
              iconBg={bmiInfo?.bgColor ?? "bg-gray-50"}
              iconColor={bmiInfo?.textColor ?? "text-gray-400"}
            />
          </div>

          {/* ── Personal Details ──────────────────────────── */}
          <SectionCard
            icon={<User className="h-4 w-4" />}
            title="Personal Details"
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoItem label="Gender" value={genderLabel} />
              <InfoItem label="Phone" value={data?.phone_number} />
              <InfoItem label="City" value={data?.city} />
              <InfoItem label="Country" value={data?.country} />
              <InfoItem label="Occupation" value={data?.occupation} />
              <InfoItem label="Date of Birth" value={data?.date_of_birth} />
            </div>
          </SectionCard>

          {/* ── Fitness Goals ─────────────────────────────── */}
          <SectionCard
            icon={<Target className="h-4 w-4" />}
            title="Fitness Goals"
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <InfoItem
                label="Primary Goal"
                value={
                  data?.primary_goal ? GOAL_MAP[data.primary_goal] : undefined
                }
              />
              <InfoItem
                label="Fitness Level"
                value={
                  data?.fitness_level
                    ? FITNESS_MAP[data.fitness_level]
                    : undefined
                }
              />
              <InfoItem
                label="Activity Level"
                value={
                  data?.activity_level
                    ? ACTIVITY_MAP[data.activity_level]
                    : undefined
                }
              />
              <InfoItem
                label="Daily Water"
                value={
                  data?.target_water_ml
                    ? `${data.target_water_ml} ml`
                    : undefined
                }
              />
            </div>
          </SectionCard>

          {/* ── Diet & Nutrition ──────────────────────────── */}
          <SectionCard
            icon={<Utensils className="h-4 w-4" />}
            title="Diet & Nutrition"
            iconBg="bg-orange-50"
            iconColor="text-orange-500"
          >
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <InfoItem
                  label="Diet Type"
                  value={
                    data?.diet_type ? DIET_MAP[data.diet_type] : undefined
                  }
                />
                <TagSection
                  label="Dietary Restrictions"
                  items={asArr(data?.dietary_restrictions)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TagSection
                  label="Allergens"
                  items={asArr(data?.allergens)}
                />
                <TagSection
                  label="Cuisine Preferences"
                  items={asArr(data?.cuisine_preferences)}
                />
              </div>
            </div>
          </SectionCard>

          {/* ── Daily Habits ──────────────────────────────── */}
          <SectionCard
            icon={<Clock className="h-4 w-4" />}
            title="Daily Habits"
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoItem label="Breakfast" value={data?.breakfast_time} />
              <InfoItem label="Lunch" value={data?.lunch_time} />
              <InfoItem label="Dinner" value={data?.dinner_time} />
              <InfoItem
                label="Sleep"
                value={
                  data?.avg_sleep_hours != null
                    ? `${data.avg_sleep_hours} hrs`
                    : undefined
                }
              />
              <InfoItem label="Meals / Day" value={data?.meals_per_day} />
              <InfoItem
                label="Cooking Frequency"
                value={
                  data?.cooking_frequency
                    ? COOKING_MAP[data.cooking_frequency]
                    : undefined
                }
              />
              <InfoItem
                label="Eating Out / Week"
                value={
                  data?.eating_out_frequency != null
                    ? `${data.eating_out_frequency}×`
                    : undefined
                }
              />
              <InfoItem
                label="Stress Level"
                value={
                  data?.stress_level
                    ? STRESS_MAP[data.stress_level]
                    : undefined
                }
              />
              <InfoItem
                label="Snacks Between Meals"
                value={data?.snacks_between_meals ? "Yes" : "No"}
              />
            </div>
          </SectionCard>

          {/* ── Health ────────────────────────────────────── */}
          <SectionCard
            icon={<Heart className="h-4 w-4" />}
            title="Health"
            iconBg="bg-red-50"
            iconColor="text-red-500"
          >
            <div className="space-y-4">
              {parseConditions(data?.health_conditions).length ? (
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Health Conditions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {parseConditions(data?.health_conditions).map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50"
                      >
                        <span className="text-xs font-semibold text-amber-800">
                          {c.name}
                        </span>
                        {c.affects_diet && (
                          <span className="text-[10px] font-medium text-amber-500 bg-amber-100 px-1.5 py-0.5 rounded-full">
                            affects diet
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  No health conditions reported
                </div>
              )}
              {data?.notes && (
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {data.notes}
                  </p>
                </div>
              )}
            </div>
          </SectionCard>
        </>
      )}

      <ProfileSetup
        isOpen={modalOpen}
        onDone={handleDone}
        onClose={setModalOpen}
      />

      <AvatarModal
        open={avatarModalOpen}
        onOpenChange={setAvatarModalOpen}
        initials={initials}
        currentImageUrl={data?.profile_image_url}
        onSuccess={refreshUser}
      />
    </div>
  );
}

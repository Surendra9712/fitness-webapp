import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Pill, Stepper } from "./ui";
import { GOALS, FITNESS } from "./constants";
import type { ProfileValues } from "./schema";

export function Step2Goals() {
  const { control } = useFormContext<ProfileValues>();

  return (
    <>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Your Health Goal</h2>
        <p className="mt-1 text-sm text-gray-500">
          What are you working toward? Your entire plan is built around this.
        </p>
      </div>

      <FormField
        control={control}
        name="primary_goal"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {GOALS.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => field.onChange(g.key)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 text-center transition-all cursor-pointer",
                      field.value === g.key
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-gray-100 bg-gray-50 hover:border-emerald-200",
                    )}
                  >
                    <span className="text-2xl">{g.icon}</span>
                    <span className="text-sm font-semibold text-gray-800">{g.title}</span>
                    <span className="text-xs text-gray-500">{g.desc}</span>
                  </button>
                ))}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="fitness_level"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Fitness Level</FormLabel>
            <FormControl>
              <div className="flex flex-wrap gap-2">
                {FITNESS.map(([k, l]) => (
                  <Pill key={k} active={field.value === k} onClick={() => field.onChange(k)}>
                    {l}
                  </Pill>
                ))}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="target_water_ml"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Daily Water Goal</FormLabel>
            <FormControl>
              <Stepper
                value={Number(field.value)}
                min={500}
                max={6000}
                step={250}
                fmt={(v) => `${(v / 1000).toFixed(1)} L/day`}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

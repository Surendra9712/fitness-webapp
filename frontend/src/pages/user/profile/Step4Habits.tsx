import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Pill, Stepper } from "./ui";
import { COOKING, STRESS } from "./constants";
import type { ProfileValues } from "./schema";

const BOOL_FIELDS: [keyof ProfileValues, string][] = [
  ["snacks_between_meals", "Snacks between meals"],
  ["track_hydration",      "Track hydration"],
  ["emotional_eater",      "Emotional eater"],
];

export function Step4Habits() {
  const { control } = useFormContext<ProfileValues>();

  return (
    <>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Eating Habits</h2>
        <p className="mt-1 text-sm text-gray-500">Help us understand your daily routine</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="breakfast_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Breakfast</FormLabel>
              <FormControl><Input type="time" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="lunch_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lunch</FormLabel>
              <FormControl><Input type="time" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="dinner_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dinner</FormLabel>
              <FormControl><Input type="time" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="avg_sleep_hours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Avg Sleep (hours)</FormLabel>
              <FormControl>
                <Input type="number" min="3" max="12" step="0.5" placeholder="7" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <FormField
          control={control}
          name="meals_per_day"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meals per Day</FormLabel>
              <FormControl>
                <Stepper value={Number(field.value)} min={1} max={8} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="eating_out_frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Eating Out (days/week)</FormLabel>
              <FormControl>
                <Stepper value={Number(field.value)} min={0} max={7} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="cooking_frequency"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Cooking Frequency</FormLabel>
            <FormControl>
              <div className="flex flex-wrap gap-2">
                {COOKING.map(([k, l]) => (
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
        name="stress_level"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Stress Level</FormLabel>
            <FormControl>
              <div className="flex flex-wrap gap-2">
                {STRESS.map(([k, l]) => (
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

      <div className="flex flex-wrap gap-5">
        {BOOL_FIELDS.map(([k, l]) => (
          <FormField
            key={k}
            control={control}
            name={k}
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2 space-y-0">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 accent-emerald-600"
                  />
                </FormControl>
                <FormLabel className="font-normal cursor-pointer">{l}</FormLabel>
              </FormItem>
            )}
          />
        ))}
      </div>
    </>
  );
}

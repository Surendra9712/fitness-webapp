import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import useAdmin from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Exercise, ExerciseCategory } from "@/types";

const CATEGORIES: ExerciseCategory[] = [
  "cardio",
  "strength",
  "flexibility",
  "sports",
  "other",
];

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["cardio", "strength", "flexibility", "sports", "other"]),
  calories_burned_per_hour: z
    .number({
      error: (issue) => {
        console.log({ issue });
        const isValid = Number.isNaN(issue.input);
        return "Calories / hr is required";
      },
    })
    .positive("Must be greater than 0"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ExerciseModalProps {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  exercise?: Exercise | null;
}

export function ExerciseModal({
  open,
  onOpenChange,
  exercise,
}: ExerciseModalProps) {
  const isEdit = !!exercise;
  const queryClient = useQueryClient();
  const { CreateExercise, UpdateExercise } = useAdmin();
  const createExercise = CreateExercise();
  const updateExercise = UpdateExercise();
  const isPending = isEdit
    ? updateExercise.isPending
    : createExercise.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      category: "cardio",
      calories_burned_per_hour: NaN,
      description: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      exercise
        ? {
            name: exercise.name,
            category: exercise.category,
            calories_burned_per_hour: exercise.calories_burned_per_hour,
            description: exercise.description ?? "",
          }
        : {
            name: "",
            category: "cardio",
            calories_burned_per_hour: NaN,
            description: "",
          },
    );
  }, [open, exercise]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await updateExercise.mutateAsync({
          id: exercise!.id,
          ...values,
        } as any);
        toast.success("Exercise updated");
      } else {
        await createExercise.mutateAsync(values as any);
        toast.success("Exercise added");
      }
      queryClient.invalidateQueries({ queryKey: ["adminExercises"] });
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Exercise" : "New Exercise"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogBody className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Running" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="capitalize">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c} className="capitalize">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="calories_burned_per_hour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calories / hr</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="e.g. 500"
                        value={Number.isNaN(field.value) ? "" : field.value}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        onBlur={field.onBlur}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>
                      Description{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of the exercise…"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? "Save Changes" : "Add Exercise"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

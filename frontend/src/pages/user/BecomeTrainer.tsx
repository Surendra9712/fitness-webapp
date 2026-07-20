import { useEffect, useRef, useState, useId } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  Save,
  Loader2,
  Plus,
  X,
  Upload,
  Clock,
  Award,
  FileBadge,
  Briefcase,
} from "lucide-react";
import useDietitian from "@/hooks/useDietitian";
import useUser from "@/hooks/useUser";
import { useAuth } from "@/context/AuthContext";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import ProfileSetup from "@/pages/user/profile/ProfileSetup";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const certificationSchema = z.object({
  name: z.string().min(1, "Certificate name is required"),
  file_url: z.string().min(1, "Certificate file is required"),
  file_type: z.enum(["image", "pdf", "url"]),
});

const slotSchema = z.object({
  day: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
});

const becomeTrainerSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  date_of_birth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((v) => !isNaN(Date.parse(v)), "Invalid date")
    .refine(
      (v) => new Date(v) <= new Date(),
      "Date of birth cannot be in the future",
    )
    .refine((v) => {
      const dob = new Date(v);
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const m = now.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
      return age >= 25;
    }, "Trainer must be at least 25 years old"),
  bio: z.string().optional(),
  specialization: z.string().optional(),
  experience_years: z
    .string()
    .min(1, "Experience years is required")
    .refine((v) => !isNaN(Number(v)), "Must be a number"),
  phone_number: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  profile_image_url: z.string().optional(),
  available_time: z
    .array(slotSchema)
    .min(1, "Add at least one availability time slot"),
  certifications: z
    .array(certificationSchema)
    .min(1, "Add at least one certification"),
});
type BecomeTrainerValues = z.infer<typeof becomeTrainerSchema>;

function arrayError(err: unknown): string | undefined {
  const e = err as
    | { root?: { message?: string }; message?: string }
    | undefined;
  return e?.root?.message ?? e?.message;
}

function makeSlot() {
  return { day: "Monday", from: "08:00", to: "17:00" };
}
function makeCert() {
  return { name: "", file_url: "", file_type: "url" as const };
}

export default function BecomeTrainer() {
  const navigate = useNavigate();
  const fileInputId = useId();
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { user, refreshUser } = useAuth();
  const [profileConfirmed, setProfileConfirmed] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = user as any;
  const hasProfile = Boolean(profile?.full_name);
  const [certUploads, setCertUploads] = useState<
    Record<string, { uploading: boolean; error: string }>
  >({});

  const form = useForm<BecomeTrainerValues>({
    resolver: zodResolver(becomeTrainerSchema),
    defaultValues: {
      full_name: "",
      date_of_birth: "",
      bio: "",
      specialization: "",
      experience_years: "",
      phone_number: "",
      city: "",
      country: "Nepal",
      profile_image_url: "",
      available_time: [makeSlot()],
      certifications: [],
    },
  });
  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { isSubmitting, errors },
  } = form;

  const slotArray = useFieldArray({ control, name: "available_time" });
  const certArray = useFieldArray({ control, name: "certifications" });
  const slotArrayError = arrayError(errors?.available_time);
  const certArrayError = arrayError(errors?.certifications);

  const { UploadImage, UploadCert } = useDietitian();
  const upload = UploadImage();
  const uploadCert = UploadCert();
  const { BecomeTrainer: SubmitBecomeTrainer } = useUser();
  const becomeTrainer = SubmitBecomeTrainer();

  useEffect(() => {
    if (!profile) return;
    reset((prev) => ({
      ...prev,
      full_name: profile.full_name ?? "",
      date_of_birth: profile.date_of_birth
        ? String(profile.date_of_birth).slice(0, 10)
        : "",
      phone_number: profile.phone_number ?? "",
      city: profile.city ?? "",
      country: profile.country ?? "Nepal",
      profile_image_url: profile.profile_image_url ?? "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.full_name]);

  async function handleUpload(file: File): Promise<string> {
    const result = await upload.mutateAsync(file);
    return result.url;
  }

  async function handleCertFileChange(
    fieldId: string,
    index: number,
    file: File,
  ) {
    setCertUploads((prev) => ({
      ...prev,
      [fieldId]: { uploading: true, error: "" },
    }));
    try {
      const res = await uploadCert.mutateAsync(file);
      setValue(`certifications.${index}.file_url`, res.url, {
        shouldValidate: true,
      });
      setValue(`certifications.${index}.file_type`, res.file_type, {
        shouldValidate: true,
      });
      setCertUploads((prev) => ({
        ...prev,
        [fieldId]: { uploading: false, error: "" },
      }));
    } catch {
      setCertUploads((prev) => ({
        ...prev,
        [fieldId]: { uploading: false, error: "Upload failed. Try again." },
      }));
    }
  }

  async function onSubmit(values: BecomeTrainerValues) {
    try {
      const result = await becomeTrainer.mutateAsync({
        full_name: values.full_name.trim() || undefined,
        date_of_birth: values.date_of_birth || undefined,
        bio: values.bio || undefined,
        specialization: values.specialization?.trim() || undefined,
        experience_years: Number(values.experience_years),
        phone_number: values.phone_number || undefined,
        city: values.city || undefined,
        country: values.country || undefined,
        profile_image_url: values.profile_image_url || undefined,
        available_time: values.available_time,
        certifications: values.certifications.map((c) => ({
          ...c,
          name: c.name.trim(),
        })),
      });

      localStorage.setItem("token", result.token);
      await refreshUser();
      toast.success("Trainer request submitted — pending admin verification");
      navigate("/trainer");
    } catch (e: any) {
      toast.error(
        e?.response?.data?.error ?? e?.message ?? "Submission failed",
      );
    }
  }

  if (!hasProfile && !profileConfirmed) {
    return (
      <ProfileSetup
        inline
        onDone={async () => {
          await refreshUser();
          setProfileConfirmed(true);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Become a Trainer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill out your trainer profile to request approval. This information
          will be visible to customers once an admin verifies your account.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" /> Profile Photo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={control}
                name="profile_image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        onChange={field.onChange}
                        onUpload={handleUpload}
                        className="max-w-xs"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Full Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="date_of_birth"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        Date of Birth{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <DatePicker
                          error={fieldState?.error && true}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Pick a date"
                          disabledDates={(d) => d > new Date()}
                          startYear={1940}
                          endYear={new Date().getFullYear()}
                          defaultMonth={new Date(1990, 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+977 98XXXXXXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Kathmandu" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Nepal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> Professional Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialization</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Weight Loss, Strength Training"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="experience_years"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Experience (years){" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={60}
                          placeholder="5"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Tell customers about your experience, certifications and approach…"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Availability{" "}
                <span className="text-destructive text-sm font-normal">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {slotArray.fields.map((slotField, index) => (
                <div
                  key={slotField.id}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                  <FormField
                    control={control}
                    name={`available_time.${index}.day`}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-36 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />

                  <span className="text-xs text-gray-400 shrink-0">from</span>
                  <FormField
                    control={control}
                    name={`available_time.${index}.from`}
                    render={({ field }) => (
                      <Input type="time" className="w-32 bg-white" {...field} />
                    )}
                  />
                  <span className="text-xs text-gray-400 shrink-0">to</span>
                  <FormField
                    control={control}
                    name={`available_time.${index}.to`}
                    render={({ field }) => (
                      <Input type="time" className="w-32 bg-white" {...field} />
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => slotArray.remove(index)}
                    className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {slotArrayError && (
                <p className="text-sm font-medium text-destructive">
                  {slotArrayError}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => slotArray.append(makeSlot())}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add Time Slot
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4" /> Certifications{" "}
                <span className="text-destructive text-sm font-normal">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {certArray.fields.map((certField, index) => {
                const uploadState = certUploads[certField.id];
                const certValue = form.watch(`certifications.${index}`);
                return (
                  <div
                    key={certField.id}
                    className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3"
                  >
                    <div className="flex-1 space-y-2">
                      <FormField
                        control={control}
                        name={`certifications.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="Certificate Name *"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`certifications.${index}.file_url`}
                        render={() => (
                          <FormItem>
                            <FormControl>
                              <div className="flex items-center gap-3">
                                <input
                                  ref={(el) => {
                                    fileRefs.current[certField.id] = el;
                                  }}
                                  id={`${fileInputId}-${certField.id}`}
                                  type="file"
                                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file)
                                      handleCertFileChange(
                                        certField.id,
                                        index,
                                        file,
                                      );
                                  }}
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={uploadState?.uploading}
                                  onClick={() =>
                                    fileRefs.current[certField.id]?.click()
                                  }
                                  className="gap-1.5 text-xs"
                                >
                                  {uploadState?.uploading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Upload className="h-3.5 w-3.5" />
                                  )}
                                  {uploadState?.uploading
                                    ? "Uploading…"
                                    : "Choose File"}
                                </Button>
                                {certValue?.file_url &&
                                  !uploadState?.uploading && (
                                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                      <FileBadge className="h-3.5 w-3.5" />
                                      {certValue.file_type === "pdf"
                                        ? "PDF ready"
                                        : "Image ready"}
                                    </span>
                                  )}
                                {uploadState?.error && (
                                  <span className="text-xs text-destructive">
                                    {uploadState.error}
                                  </span>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => certArray.remove(index)}
                      className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}

              {certArray.fields.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No certifications added yet.
                </p>
              )}
              {certArrayError && (
                <p className="text-sm font-medium text-destructive">
                  {certArrayError}
                </p>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => certArray.append(makeCert())}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add Certification
              </Button>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={isSubmitting || becomeTrainer.isPending}
            className="w-full sm:w-auto"
          >
            {isSubmitting || becomeTrainer.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Submit Trainer Request
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}

import { useEffect, useRef, useState, useId } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Save, Loader2, Plus, X, Upload,
  Clock, Award, FileBadge, Briefcase,
} from "lucide-react";
import useDietitian from "@/hooks/useDietitian";
import useUser from "@/hooks/useUser";
import { useAuth } from "@/context/AuthContext";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import ProfileSetup from "@/pages/user/profile/ProfileSetup";

interface ProfileForm {
  full_name: string;
  date_of_birth: string;
  bio: string;
  specialization: string;
  experience_years: string;
  phone_number: string;
  city: string;
  country: string;
  profile_image_url: string;
}

interface Slot {
  _id: string;
  day: string;
  from: string;
  to: string;
}

interface NewCert {
  _id: string;
  name: string;
  file_url: string;
  file_type: "image" | "pdf" | "url";
  _uploading: boolean;
  _uploadError: string;
}

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function makeSlot(): Slot {
  return { _id: Math.random().toString(36).slice(2), day: "Monday", from: "08:00", to: "17:00" };
}
function makeNewCert(): NewCert {
  return { _id: Math.random().toString(36).slice(2), name: "", file_url: "", file_type: "url", _uploading: false, _uploadError: "" };
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

  const [form, setForm] = useState<ProfileForm>({
    full_name: "", date_of_birth: "", bio: "",
    specialization: "", experience_years: "",
    phone_number: "", city: "", country: "Nepal", profile_image_url: "",
  });
  const [slots, setSlots] = useState<Slot[]>([makeSlot()]);
  const [newCerts, setNewCerts] = useState<NewCert[]>([]);

  const { UploadImage, UploadCert } = useDietitian();
  const upload = UploadImage();
  const uploadCert = UploadCert();
  const { BecomeTrainer: SubmitBecomeTrainer } = useUser();
  const becomeTrainer = SubmitBecomeTrainer();

  useEffect(() => {
    if (!profile) return;
    setForm((f) => ({
      ...f,
      full_name: profile.full_name ?? "",
      date_of_birth: profile.date_of_birth ? String(profile.date_of_birth).slice(0, 10) : "",
      phone_number: profile.phone_number ?? "",
      city: profile.city ?? "",
      country: profile.country ?? "Nepal",
      profile_image_url: profile.profile_image_url ?? "",
    }));
  }, [profile?.full_name]);

  function set<K extends keyof ProfileForm>(field: K, value: ProfileForm[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleUpload(file: File): Promise<string> {
    const result = await upload.mutateAsync(file);
    return result.url;
  }

  async function handleCertFileChange(certId: string, file: File) {
    setNewCerts((prev) => prev.map((c) =>
      c._id === certId ? { ...c, _uploading: true, _uploadError: "" } : c,
    ));
    try {
      const res = await uploadCert.mutateAsync(file);
      setNewCerts((prev) => prev.map((c) =>
        c._id === certId ? { ...c, file_url: res.url, file_type: res.file_type, _uploading: false } : c,
      ));
    } catch {
      setNewCerts((prev) => prev.map((c) =>
        c._id === certId ? { ...c, _uploading: false, _uploadError: "Upload failed. Try again." } : c,
      ));
    }
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.date_of_birth) { toast.error("Date of birth is required."); return; }
    if (!form.experience_years || isNaN(Number(form.experience_years))) {
      toast.error("Experience years is required."); return;
    }
    if (slots.length === 0) { toast.error("Add at least one availability time slot."); return; }
    if (slots.some((s) => !s.day || !s.from || !s.to)) {
      toast.error("Fill in day, from, and to for every availability slot."); return;
    }
    if (newCerts.length === 0) { toast.error("Add at least one certification."); return; }
    const incompleteCert = newCerts.find((c) => !c.name.trim() || !c.file_url);
    if (incompleteCert) {
      toast.error("Each certification needs a name and a file."); return;
    }

    try {
      const result = await becomeTrainer.mutateAsync({
        full_name:        form.full_name || undefined,
        date_of_birth:    form.date_of_birth || undefined,
        bio:              form.bio || undefined,
        specialization:   form.specialization || undefined,
        experience_years: Number(form.experience_years),
        phone_number:     form.phone_number || undefined,
        city:             form.city || undefined,
        country:          form.country || undefined,
        profile_image_url: form.profile_image_url || undefined,
        available_time:   slots.map(({ day, from, to }) => ({ day, from, to })),
        certifications:   newCerts.map((c) => ({ name: c.name.trim(), file_url: c.file_url, file_type: c.file_type })),
      });

      localStorage.setItem("token", result.token);
      await refreshUser();
      toast.success("Trainer request submitted — pending admin verification");
      navigate("/trainer");
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? e?.message ?? "Submission failed");
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

      <form onSubmit={handleSubmit} className="space-y-6">

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Profile Photo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUpload
              value={form.profile_image_url}
              onChange={(url) => set("profile_image_url", url)}
              onUpload={handleUpload}
              className="max-w-xs"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full Name <span className="text-destructive">*</span></Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth <span className="text-destructive">*</span></Label>
                <DatePicker
                  value={form.date_of_birth}
                  onChange={(v) => set("date_of_birth", v)}
                  placeholder="Pick a date"
                  disabledDates={(d) => d > new Date()}
                  startYear={1940}
                  endYear={new Date().getFullYear() - 18}
                  defaultMonth={new Date(1990, 0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone_number">Phone</Label>
                <Input
                  id="phone_number"
                  value={form.phone_number}
                  onChange={(e) => set("phone_number", e.target.value)}
                  placeholder="+977 98XXXXXXXX"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="Kathmandu"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                placeholder="Nepal"
              />
            </div>
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
              <div className="space-y-1.5">
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  value={form.specialization}
                  onChange={(e) => set("specialization", e.target.value)}
                  placeholder="e.g. Weight Loss, Strength Training"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="experience_years">
                  Experience (years) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="experience_years"
                  type="number"
                  min={0}
                  max={60}
                  value={form.experience_years}
                  onChange={(e) => set("experience_years", e.target.value)}
                  placeholder="5"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={4}
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
                placeholder="Tell customers about your experience, certifications and approach…"
                className="resize-none"
              />
            </div>
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
            {slots.map((slot) => (
              <div
                key={slot._id}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3"
              >
                <Select
                  value={slot.day}
                  onValueChange={(v) =>
                    setSlots((prev) => prev.map((s) => s._id === slot._id ? { ...s, day: v } : s))
                  }
                >
                  <SelectTrigger className="w-36 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>

                <span className="text-xs text-gray-400 shrink-0">from</span>
                <Input
                  type="time"
                  value={slot.from}
                  onChange={(e) =>
                    setSlots((prev) => prev.map((s) => s._id === slot._id ? { ...s, from: e.target.value } : s))
                  }
                  className="w-32 bg-white"
                />
                <span className="text-xs text-gray-400 shrink-0">to</span>
                <Input
                  type="time"
                  value={slot.to}
                  onChange={(e) =>
                    setSlots((prev) => prev.map((s) => s._id === slot._id ? { ...s, to: e.target.value } : s))
                  }
                  className="w-32 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setSlots((prev) => prev.filter((s) => s._id !== slot._id))}
                  className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSlots((prev) => [...prev, makeSlot()])}
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
            {newCerts.map((cert) => (
              <div
                key={cert._id}
                className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3"
              >
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Certificate Name *"
                    value={cert.name}
                    onChange={(e) =>
                      setNewCerts((prev) =>
                        prev.map((c) => c._id === cert._id ? { ...c, name: e.target.value } : c)
                      )
                    }
                  />
                  <div className="flex items-center gap-3">
                    <input
                      ref={(el) => { fileRefs.current[cert._id] = el; }}
                      id={`${fileInputId}-${cert._id}`}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCertFileChange(cert._id, file);
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={cert._uploading}
                      onClick={() => fileRefs.current[cert._id]?.click()}
                      className="gap-1.5 text-xs"
                    >
                      {cert._uploading
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Upload className="h-3.5 w-3.5" />}
                      {cert._uploading ? "Uploading…" : "Choose File"}
                    </Button>
                    {cert.file_url && !cert._uploading && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <FileBadge className="h-3.5 w-3.5" />
                        {cert.file_type === "pdf" ? "PDF ready" : "Image ready"}
                      </span>
                    )}
                    {cert._uploadError && (
                      <span className="text-xs text-destructive">{cert._uploadError}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNewCerts((prev) => prev.filter((c) => c._id !== cert._id))}
                  className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}

            {newCerts.length === 0 && (
              <p className="text-sm text-muted-foreground">No certifications added yet.</p>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNewCerts((prev) => [...prev, makeNewCert()])}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Certification
            </Button>
          </CardContent>
        </Card>

        <Button type="submit" disabled={becomeTrainer.isPending} className="w-full sm:w-auto">
          {becomeTrainer.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
          ) : (
            <><Save className="mr-2 h-4 w-4" /> Submit Trainer Request</>
          )}
        </Button>

      </form>
    </div>
  );
}

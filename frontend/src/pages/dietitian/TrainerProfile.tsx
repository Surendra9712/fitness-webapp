import { useEffect, useState } from "react";
import { User, Save, Loader2 } from "lucide-react";
import useDietitian from "@/hooks/useDietitian";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface ProfileForm {
  name: string;
  bio: string;
  specialization: string;
  phone_number: string;
  city: string;
  country: string;
  profile_image_url: string;
}

const EMPTY: ProfileForm = {
  name: "",
  bio: "",
  specialization: "",
  phone_number: "",
  city: "",
  country: "Nepal",
  profile_image_url: "",
};

export default function TrainerProfile() {
  const [form, setForm] = useState<ProfileForm>(EMPTY);

  const { GetProfile, UpdateProfile, UploadImage } = useDietitian();
  const { data: profile, isLoading } = GetProfile();
  const update = UpdateProfile();
  const upload = UploadImage();

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name ?? "",
      bio: profile.bio ?? "",
      specialization: profile.specialization ?? "",
      phone_number: profile.phone_number ?? "",
      city: profile.city ?? "",
      country: profile.country ?? "Nepal",
      profile_image_url: profile.profile_image_url ?? "",
    });
  }, [profile]);

  function set(field: keyof ProfileForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleUpload(file: File): Promise<string> {
    const result = await upload.mutateAsync(file);
    return result.url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: Partial<ProfileForm> = {};
      for (const [k, v] of Object.entries(form)) {
        if (v !== (profile?.[k as keyof typeof profile] ?? "")) {
          payload[k as keyof ProfileForm] = v;
        }
      }
      if (!Object.keys(payload).length) {
        toast.info("No changes to save.");
        return;
      }
      await update.mutateAsync(payload);
      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Update failed");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className=" space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This information is visible to customers browsing trainers.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Profile photo ── */}
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

        {/* ── Basic info ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                value={form.specialization}
                onChange={(e) => set("specialization", e.target.value)}
                placeholder="e.g. Weight Loss, Strength Training, Nutrition"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={4}
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
                placeholder="Tell customers about your experience, certifications and approach…"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Contact ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact & Location</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
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
            <div className="col-span-2 space-y-1.5">
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

        <Separator />

        {/* ── Read-only account info ── */}
        <Card className="bg-muted/30">
          <CardContent className="pt-4 space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Email:</span>{" "}
              {profile?.email}
            </p>
            <p>
              <span className="font-medium text-foreground">Role:</span> Trainer
              / Dietitian
            </p>
            <p>
              <span className="font-medium text-foreground">
                Account status:
              </span>{" "}
              <span
                className={
                  profile?.is_active ? "text-emerald-600" : "text-destructive"
                }
              >
                {profile?.is_active ? "Active" : "Disabled"}
              </span>
            </p>
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={update.isPending}
          className="w-full sm:w-auto"
        >
          {update.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

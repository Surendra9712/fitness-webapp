import { useState, useEffect } from "react";
import { User2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ui/ImageUpload";
import http from "@/api/client";
import useUser from "@/hooks/useUser";

interface AvatarModalProps {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  initials: string;
  currentImageUrl?: string;
  onSuccess: () => void;
}

export function AvatarModal({
  open,
  onOpenChange,
  initials,
  currentImageUrl,
  onSuccess,
}: AvatarModalProps) {
  const [preview, setPreview] = useState(currentImageUrl ?? "");
  const [saving, setSaving] = useState(false);

  const { UpdateAvatar } = useUser();
  const updateAvatar = UpdateAvatar();

  useEffect(() => {
    if (open) setPreview(currentImageUrl ?? "");
  }, [open, currentImageUrl]);

  const handleUpload = async (file: File): Promise<string> => {
    const form = new FormData();
    form.append("image", file);
    const res = await http.post<{ url: string }>("/upload/image", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.url;
  };

  const save = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      await updateAvatar.mutateAsync(preview);
      onSuccess();
      onOpenChange(false);
    } catch {
      /* silently ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Profile Photo</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="flex justify-center mb-5">
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="h-24 w-24 rounded-full object-cover border-2 border-emerald-200"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-emerald-100 flex items-center justify-center text-3xl font-bold text-emerald-700 select-none">
                {initials || <User2 className="h-10 w-10 text-emerald-600" />}
              </div>
            )}
          </div>
          <ImageUpload
            value={preview}
            onChange={setPreview}
            onUpload={handleUpload}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!preview || saving}
            onClick={save}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? "Saving…" : "Save Photo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

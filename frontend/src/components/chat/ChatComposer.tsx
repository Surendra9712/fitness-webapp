import { useRef } from "react";
import { Send, Image as ImageIcon, Paperclip, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024;
const IMAGE_ACCEPT = "image/png,image/jpeg,image/gif,image/webp";
const FILE_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip";

interface Props {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: (e: React.FormEvent) => void;
  onAttach: (file: File) => void;
  uploading: boolean;
}

export default function ChatComposer({ draft, onDraftChange, onSend, onAttach, uploading }: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_SIZE) {
      alert("File too large. Maximum size is 15 MB.");
      return;
    }
    onAttach(file);
  }

  return (
    <form onSubmit={onSend} className="flex items-center gap-2 border-t p-3">
      <input
        ref={imageInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={handleFilePicked}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={FILE_ACCEPT}
        className="hidden"
        onChange={handleFilePicked}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={uploading}
        onClick={() => imageInputRef.current?.click()}
        aria-label="Send image"
      >
        <ImageIcon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        aria-label="Send file"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
      <Input
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        placeholder="Type a message…"
        className="flex-1"
      />
      <Button type="submit" size="icon" disabled={!draft.trim() || uploading}>
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </form>
  );
}

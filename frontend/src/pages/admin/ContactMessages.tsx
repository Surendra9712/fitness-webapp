import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  MailOpen,
  CheckCircle2,
  RotateCcw,
  Trash2,
  Phone,
  User as UserIcon,
  Inbox,
  MoreHorizontal,
  Reply,
} from "lucide-react";
import { toast } from "sonner";

import useAdmin from "@/hooks/useAdmin";
import { usePagination } from "@/hooks/usePagination";
import { AppPagination } from "@/components/ui/app-pagination";
import { SearchInput } from "@/components/ui/search-input";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableBodySkeleton } from "@/components/TableSkeleton";
import type { ContactMessage, ContactMessageStatus } from "@/types";

const STATUS_TABS = [
  { label: "New", value: "new" },
  { label: "Read", value: "read" },
  { label: "Resolved", value: "resolved" },
  { label: "All", value: "all" },
] as const;

const statusVariant: Record<ContactMessageStatus, "info" | "warning" | "success"> =
  {
    new: "info",
    read: "warning",
    resolved: "success",
  };

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ContactMessages() {
  const [tab, setTab] = useState<string>("new");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [note, setNote] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);

  const queryClient = useQueryClient();
  const { page, pageSize, goToPage, setPageSize, resetPage } = usePagination({
    initialPageSize: 20,
  });

  const { GetContactMessages, UpdateContactMessageStatus, DeleteContactMessage } =
    useAdmin();
  const { data, isFetching, isPlaceholderData } = GetContactMessages({
    queryParams: { status: tab, q: search, page, page_size: pageSize },
  });
  const messages = data?.items ?? [];
  const counts = data?.counts;

  const updateStatus = UpdateContactMessageStatus();
  const deleteMessage = DeleteContactMessage();

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["adminContactMessages"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  useEffect(() => {
    setNote(selected?.admin_note ?? "");
  }, [selected?.id]);

  async function setStatus(
    msg: ContactMessage,
    status: ContactMessageStatus,
    admin_note?: string | null,
    successText?: string,
  ) {
    try {
      await updateStatus.mutateAsync({
        id: msg.id,
        status,
        admin_note: admin_note ?? msg.admin_note ?? null,
      });
      refresh();
      if (successText) toast.success(successText);
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  }

  // Opening a message is what marks it read — same as any inbox.
  function openMessage(msg: ContactMessage) {
    setSelected(msg);
    if (msg.status === "new") setStatus(msg, "read");
  }

  async function resolveSelected() {
    if (!selected) return;
    const ok = await setStatus(
      selected,
      "resolved",
      note.trim() || null,
      "Message marked resolved",
    );
    if (ok) setSelected(null);
  }

  async function saveNote() {
    if (!selected) return;
    const ok = await setStatus(
      selected,
      selected.status === "new" ? "read" : selected.status,
      note.trim() || null,
      "Note saved",
    );
    if (ok) setSelected(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteMessage.mutateAsync(target.id);
      refresh();
      if (selected?.id === target.id) setSelected(null);
      toast.success("Message deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function mailtoHref(msg: ContactMessage) {
    const subject = encodeURIComponent(`Re: ${msg.subject}`);
    const body = encodeURIComponent(
      `\n\n———\nOn ${formatDateTime(msg.created_at)} you wrote:\n${msg.message}`,
    );
    return `mailto:${msg.email}?subject=${subject}&body=${body}`;
  }

  function handleTabChange(value: string) {
    setTab(value);
    resetPage();
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((t) => {
            const count =
              t.value === "all"
                ? undefined
                : counts?.[t.value as ContactMessageStatus];
            return (
              <Button
                key={t.value}
                size="sm"
                variant={tab === t.value ? "default" : "outline"}
                onClick={() => handleTabChange(t.value)}
              >
                {t.label}
                {!!count && (
                  <span className="ml-1.5 rounded-full bg-background/20 px-1.5 text-[10px] font-bold">
                    {count}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
        <SearchInput
          className="w-full sm:w-72"
          placeholder="Search name, email, subject or body…"
          onSearch={(v) => {
            setSearch(v);
            resetPage();
          }}
        />
      </div>

      <Card className={isPlaceholderData ? "opacity-70" : ""}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            {isFetching ? (
              <TableBodySkeleton />
            ) : (
              <TableBody>
                {messages.map((m) => (
                  <TableRow
                    key={m.id}
                    onClick={() => openMessage(m)}
                    className={`cursor-pointer ${m.status === "new" ? "font-medium" : ""}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {m.status === "new" ? (
                          <Mail className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                        ) : (
                          <MailOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-sm">{m.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {m.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate text-sm">{m.subject}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {m.message}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(m.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusVariant[m.status]}
                        className="capitalize"
                      >
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openMessage(m)}>
                            <MailOpen className="mr-1 h-3.5 w-3.5" /> Open
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={mailtoHref(m)}>
                              <Reply className="mr-1 h-3.5 w-3.5" /> Reply by
                              email
                            </a>
                          </DropdownMenuItem>
                          {m.status !== "resolved" ? (
                            <DropdownMenuItem
                              onClick={() =>
                                setStatus(
                                  m,
                                  "resolved",
                                  undefined,
                                  "Message marked resolved",
                                )
                              }
                            >
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark
                              resolved
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                setStatus(m, "new", undefined, "Message reopened")
                              }
                            >
                              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reopen
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(m)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!messages.length && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-12 text-center text-muted-foreground"
                    >
                      <Inbox className="mx-auto mb-2 h-10 w-10 opacity-30" />
                      {search
                        ? "No messages match your search"
                        : `No ${tab === "all" ? "" : tab} messages`}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            )}
          </Table>
        </CardContent>
      </Card>

      <AppPagination
        page={page}
        total={data?.total ?? 0}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onPageChange={goToPage}
      />

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="pr-6">{selected?.subject}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {selected && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <UserIcon className="h-3.5 w-3.5" />
                    {selected.name}
                    {selected.user_id ? " (registered user)" : ""}
                  </span>
                  <a
                    href={`mailto:${selected.email}`}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {selected.email}
                  </a>
                  {selected.phone && (
                    <a
                      href={`tel:${selected.phone}`}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {selected.phone}
                    </a>
                  )}
                </div>

                <div className="rounded-lg bg-muted/50 p-4 text-sm whitespace-pre-wrap">
                  {selected.message}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge
                    variant={statusVariant[selected.status]}
                    className="capitalize"
                  >
                    {selected.status}
                  </Badge>
                  <span>Received {formatDateTime(selected.created_at)}</span>
                  {selected.handled_by_name && selected.handled_at && (
                    <span>
                      · Handled by {selected.handled_by_name} on{" "}
                      {formatDateTime(selected.handled_at)}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Internal note (not sent to the sender)
                  </label>
                  <Textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Replied by email, refund issued"
                  />
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter className="flex-wrap gap-2">
            {selected && (
              <>
                <Button variant="outline" asChild>
                  <a href={mailtoHref(selected)}>
                    <Reply className="mr-1 h-4 w-4" /> Reply by email
                  </a>
                </Button>
                <Button
                  variant="outline"
                  onClick={saveNote}
                  disabled={updateStatus.isPending}
                >
                  Save note
                </Button>
                {selected.status === "resolved" ? (
                  <Button
                    onClick={async () => {
                      const ok = await setStatus(
                        selected,
                        "new",
                        note.trim() || null,
                        "Message reopened",
                      );
                      if (ok) setSelected(null);
                    }}
                    disabled={updateStatus.isPending}
                  >
                    <RotateCcw className="mr-1 h-4 w-4" /> Reopen
                  </Button>
                ) : (
                  <Button
                    onClick={resolveSelected}
                    disabled={updateStatus.isPending}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" /> Mark resolved
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this message?"
        description={`"${deleteTarget?.subject}" from ${deleteTarget?.name} will be removed from the inbox.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}

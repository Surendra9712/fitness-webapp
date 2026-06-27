import { useState } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import useAdmin from "@/hooks/useAdmin";
import { usePagination } from "@/hooks/usePagination";
import { AppPagination } from "@/components/ui/app-pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/ConfirmDialog";
import { ExerciseModal } from "./ExerciseModal";
import { toast } from "sonner";
import type { Exercise, ExerciseCategory } from "@/types";

const catVariant: Record<
  ExerciseCategory,
  "warning" | "destructive" | "success" | "info" | "secondary"
> = {
  cardio: "warning",
  strength: "destructive",
  flexibility: "success",
  sports: "info",
  other: "secondary",
};

export default function ExerciseLibrary() {
  const [modal, setModal] = useState<{ open: boolean; exercise?: Exercise }>({
    open: false,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const { page, pageSize, goToPage, setPageSize } = usePagination({
    initialPageSize: 20,
  });

  const { GetExercises, DeleteExercise } = useAdmin();
  const { data, isPlaceholderData } = GetExercises({
    queryParams: { page, page_size: pageSize },
  });
  const exercises = data?.items ?? [];
  const total = data?.total ?? 0;
  const deleteExercise = DeleteExercise();

  function handleEditClick(exercise: Exercise) {
    setModal({ open: true, exercise });
  }

  function handleDeleteClick(id: number) {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    try {
      await deleteExercise.mutateAsync(pendingDeleteId);
      toast.success("Exercise deleted");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setConfirmOpen(false);
      setPendingDeleteId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Exercise Library</h1>
        <Button onClick={() => setModal({ open: true })}>
          <Plus className="h-4 w-4" />
          Add Exercise
        </Button>
      </div>

      <Card className={isPlaceholderData ? "opacity-70" : ""}>
        <CardHeader>
          <CardTitle>Exercises ({total})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Cal / hr</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exercises.map((ex) => (
                <TableRow key={ex.id}>
                  <TableCell className="font-medium">{ex.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={catVariant[ex.category]}
                      className="capitalize"
                    >
                      {ex.category}
                    </Badge>
                  </TableCell>
                  <TableCell>{ex.calories_burned_per_hour}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {ex.description || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditClick(ex)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteClick(ex.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!exercises.length && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No exercises found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AppPagination
        page={page}
        total={total}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onPageChange={goToPage}
      />

      <ExerciseModal
        open={modal.open}
        onOpenChange={(o) => setModal((m) => ({ ...m, open: o }))}
        exercise={modal.exercise}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete exercise?"
        description="This will permanently remove the exercise from the library."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}

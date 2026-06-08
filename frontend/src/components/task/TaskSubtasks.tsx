import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CheckSquare, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useAddSubtaskMutation, useToggleSubtaskMutation, useDeleteSubtaskMutation } from '@/services/task/task.queries';

const subtaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
});

interface TaskSubtasksProps {
  taskId: string;
  slug: string;
  subtasks: any[];
  canEditTasks?: boolean;
}

export function TaskSubtasks({ taskId, slug, subtasks, canEditTasks = true }: TaskSubtasksProps) {
  const form = useForm({
    resolver: zodResolver(subtaskSchema),
    defaultValues: { title: '' },
  });

  const subtaskMutation = useAddSubtaskMutation(slug, taskId);
  const toggleSubtaskMutation = useToggleSubtaskMutation(slug, taskId);
  const deleteSubtaskMutation = useDeleteSubtaskMutation(slug, taskId);

  const completedSubtasksCount = subtasks.filter((s: any) => s.isCompleted).length;
  const totalSubtasksCount = subtasks.length;
  const progressPercent = totalSubtasksCount > 0 ? (completedSubtasksCount / totalSubtasksCount) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <CheckSquare className="w-4 h-4 text-primary" /> Subtasks
        </h4>
        <span className="text-xs font-semibold text-muted-foreground">
          {completedSubtasksCount}/{totalSubtasksCount}
        </span>
      </div>

      {totalSubtasksCount > 0 && (
        <div className="space-y-2">
          <Progress value={progressPercent} className="h-1.5 bg-secondary" />
        </div>
      )}

      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
        {subtasks.map((sub: any) => (
          <div
            key={sub.id}
            className="flex items-center justify-between p-2 rounded-lg border border-border/20 bg-card/10 hover:bg-card/30 transition-all duration-200"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <input
                type="checkbox"
                checked={sub.isCompleted}
                disabled={!canEditTasks}
                onChange={(e) => toggleSubtaskMutation.mutate({ subtaskId: sub.id, isCompleted: e.target.checked })}
                className="rounded border-border bg-background text-primary focus:ring-0 cursor-pointer w-4 h-4 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className={`text-xs truncate ${sub.isCompleted ? 'line-through text-muted-foreground/70' : 'text-foreground font-medium'}`}>
                {sub.title}
              </span>
            </div>
            {canEditTasks && (
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md shrink-0"
                onClick={() => deleteSubtaskMutation.mutate(sub.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {canEditTasks && (
        <form
          onSubmit={form.handleSubmit((v) => { subtaskMutation.mutate(v); form.reset(); })}
          className="flex gap-2"
        >
          <Input
            placeholder="Add subtask..."
            {...form.register('title')}
            className="h-8 text-xs bg-background/50 border-border/50"
            disabled={subtaskMutation.isPending}
          />
          <Button type="submit" size="sm" className="h-8 bg-secondary hover:bg-secondary/80 border border-border/50 text-foreground" disabled={subtaskMutation.isPending}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </form>
      )}
    </div>
  );
}

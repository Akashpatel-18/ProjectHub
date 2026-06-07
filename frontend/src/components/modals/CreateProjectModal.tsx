import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';

import { useCreateProjectMutation } from '@/services/project/project.queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';


const projectSchema = z.object({
  name: z.string().min(2, { message: 'Project name must be at least 2 characters' }),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'PAUSED', 'COMPLETED']),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface CreateProjectModalProps {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectModal({ slug, open, onOpenChange }: CreateProjectModalProps) {
  const createMutation = useCreateProjectMutation(slug);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'PLANNING',
    },
  });

  const onSubmit = (values: ProjectFormValues) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Initialize a new project board in your workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Project Name</label>
            <Input placeholder="e.g., Q3 Marketing Campaign" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-[10px] font-medium text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input placeholder="Brief overview of the project goals" {...form.register('description')} />
            {form.formState.errors.description && (
              <p className="text-[10px] font-medium text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

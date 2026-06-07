import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from './task.service';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth.store';

export const useTasksQuery = (slug?: string, projectId?: string) => {
  return useQuery({
    queryKey: projectId ? ['tasks', slug, projectId] : ['tasks', slug],
    queryFn: () => taskService.getTasks(slug!, projectId),
    enabled: !!slug,
  });
};

export const useCreateTaskMutation = (slug?: string, projectId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: any) => taskService.createTask(slug!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectId ? ['tasks', slug, projectId] : ['tasks', slug] });
      toast({ title: 'Task Created', description: 'Task added successfully.' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Task Error', description: error.response?.data?.message });
    },
  });
};

export const useUpdateTaskMutation = (slug?: string, projectId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: any }) => taskService.updateTask(slug!, taskId, data),
    onSuccess: (_, variables) => {
      // Instead of invalidating, we let the socket event or optimistic update handle the cache
      // This prevents the duplicate network GET requests for the task list
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.response?.data?.message });
    },
  });
};

export const useDeleteTaskMutation = (slug?: string, projectId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (taskId: string) => taskService.deleteTask(slug!, taskId),
    onSuccess: () => {
      queryClient.setQueryData(projectId ? ['tasks', slug, projectId] : ['tasks', slug], (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.filter((t: any) => t.id !== taskId);
      });
      toast({ title: 'Task Deleted', description: 'Task removed successfully.' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Deletion Failed', description: error.response?.data?.message });
    },
  });
};

export const useTaskQuery = (slug: string, taskId: string | null) => {
  return useQuery({
    queryKey: ['task', taskId, slug],
    queryFn: () => taskService.getTask(slug, taskId!),
    enabled: !!taskId && !!slug,
  });
};

export const useAddSubtaskMutation = (slug: string, taskId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { title: string }) => taskService.addSubtask(slug, taskId, data),
    onSuccess: (res) => {
      const newSubtask = res;
      queryClient.setQueryData(['task', taskId, slug], (old: any) => {
        if (!old) return old;
        if (old.subtasks?.some((st: any) => st.id === newSubtask.id)) return old;
        return { ...old, subtasks: [...(old.subtasks || []), newSubtask] };
      });
      toast({ title: 'Subtask Added', description: 'Subtask added successfully.' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Failed to add subtask', description: error.response?.data?.message || 'Access denied or server error.' });
    },
  });
};

export const useToggleSubtaskMutation = (slug: string, taskId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ subtaskId, isCompleted }: { subtaskId: string; isCompleted: boolean }) => 
      taskService.toggleSubtask(slug, taskId, subtaskId, isCompleted),
    onSuccess: (res) => {
      const updatedSubtask = res;
      queryClient.setQueryData(['task', taskId, slug], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          subtasks: (old.subtasks || []).map((st: any) => st.id === updatedSubtask.id ? updatedSubtask : st)
        };
      });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Action Failed', description: error.response?.data?.message || 'Access denied or server error.' });
    },
  });
};

export const useDeleteSubtaskMutation = (slug: string, taskId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (subtaskId: string) => taskService.deleteSubtask(slug, taskId, subtaskId),
    onSuccess: (_, subtaskId) => {
      queryClient.setQueryData(['task', taskId, slug], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          subtasks: (old.subtasks || []).filter((st: any) => st.id !== subtaskId)
        };
      });
      toast({ title: 'Subtask Deleted' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Deletion Failed', description: error.response?.data?.message || 'Access denied or server error.' });
    },
  });
};

export const useAddCommentMutation = (slug: string, taskId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (data: { content: string }) => taskService.addComment(slug, taskId, data),
    onSuccess: (res) => {
      const newComment = res;
      queryClient.setQueryData(['task', taskId, slug], (old: any) => {
        if (!old) return old;
        if (old.comments?.some((c: any) => c.id === newComment.id)) return old;
        return { ...old, comments: [...(old.comments || []), newComment] };
      });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Failed to add comment', description: error.response?.data?.message || 'Access denied or server error.' });
    },
  });
};

export const useToggleWatchMutation = (slug: string, taskId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => taskService.toggleWatch(slug, taskId),
    onSuccess: (res) => {
      const data = res; // Assuming backend returns { watching: boolean }
      
      queryClient.setQueryData(['task', taskId, slug], (old: any) => {
        if (!old) return old;
        
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) return old;
        
        let newWatchers = old.watchers || [];
        if (data?.watching) {
          if (!newWatchers.some((w: any) => w.userId === currentUser.id)) {
            newWatchers = [...newWatchers, { userId: currentUser.id, user: { name: currentUser.name } }];
          }
        } else {
          newWatchers = newWatchers.filter((w: any) => w.userId !== currentUser.id);
        }
        
        return { ...old, watchers: newWatchers };
      });

      toast({
        title: data?.watching ? 'Watching Task' : 'Unwatched Task',
        description: data?.watching ? 'You will now receive alerts for this task.' : 'You have unwatched this task.',
      });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Action Failed', description: error.response?.data?.message || 'Access denied or server error.' });
    },
  });
};

export const useUploadAttachmentMutation = (slug: string, taskId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return taskService.uploadAttachment(slug, taskId, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId, slug] });
      queryClient.invalidateQueries({ queryKey: ['tasks', slug] });
      toast({ title: 'File Uploaded', description: 'Attachment saved successfully.' });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.response?.data?.message || 'File must be under 10MB.',
      });
    },
  });
};

export const useDeleteAttachmentMutation = (slug: string, taskId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (attachmentId: string) => taskService.deleteAttachment(slug, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId, slug] });
      queryClient.invalidateQueries({ queryKey: ['tasks', slug] });
      toast({ title: 'Attachment Deleted' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Deletion Failed', description: error.response?.data?.message || 'Access denied or server error.' });
    },
  });
};

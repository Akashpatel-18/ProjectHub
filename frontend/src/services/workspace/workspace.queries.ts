import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceService } from './workspace.service';
import { useToast } from '@/hooks/use-toast';

export const useWorkspacesQuery = () => {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceService.getWorkspaces,
  });
};

export const useWorkspaceDetailsQuery = (slug?: string) => {
  return useQuery({
    queryKey: ['workspace', slug],
    queryFn: () => workspaceService.getWorkspaceDetails(slug!),
    enabled: !!slug,
  });
};

export const useWorkspaceRolesQuery = (slug?: string) => {
  return useQuery({
    queryKey: ['roles', slug],
    queryFn: () => workspaceService.getRoles(slug!),
    enabled: !!slug,
  });
};

export const useCreateWorkspaceMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: workspaceService.createWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast({
        title: 'Workspace Created',
        description: 'Your new workspace has been successfully initialized.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: error.response?.data?.message || 'Failed to create workspace.',
      });
    },
  });
};

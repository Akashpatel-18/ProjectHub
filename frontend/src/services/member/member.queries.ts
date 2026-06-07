import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memberService } from './member.service';
import { useToast } from '@/hooks/use-toast';

export const useWorkspaceMembersQuery = (slug?: string) => {
  return useQuery({
    queryKey: ['members', slug],
    queryFn: () => memberService.getWorkspaceMembers(slug!),
    enabled: !!slug,
  });
};

export const useProjectMembersQuery = (slug?: string, projectId?: string) => {
  return useQuery({
    queryKey: ['projectMembers', slug, projectId],
    queryFn: () => memberService.getProjectMembers(slug!, projectId!),
    enabled: !!slug && !!projectId,
  });
};

export const useInviteWorkspaceMemberMutation = (slug?: string) => {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { email: string; roleId: string }) => memberService.inviteWorkspaceMember(slug!, data),
    onSuccess: () => {
      toast({ title: 'Invitation Sent', description: 'An email invitation has been sent.' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Invitation Failed', description: error.response?.data?.message });
    },
  });
};

export const useAddProjectMemberMutation = (slug?: string, projectId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { userId: string; roleId: string }) => memberService.addProjectMember(slug!, projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMembers', slug, projectId] });
      toast({ title: 'Member Added', description: 'User added to the project.' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Action Failed', description: error.response?.data?.message });
    },
  });
};

export const useUpdateWorkspaceRoleMutation = (slug?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: { roleId: string } }) => memberService.updateWorkspaceRole(slug!, userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', slug] });
      toast({ title: 'Role Updated', description: 'Member access level changed.' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.response?.data?.message });
    },
  });
};

export const useUpdateProjectRoleMutation = (slug?: string, projectId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: { roleId: string } }) => memberService.updateProjectRole(slug!, projectId!, userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMembers', slug, projectId] });
      toast({ title: 'Role Updated', description: 'Project role updated successfully.' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.response?.data?.message });
    },
  });
};

export const useRemoveWorkspaceMemberMutation = (slug?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (userId: string) => memberService.removeWorkspaceMember(slug!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', slug] });
      toast({ title: 'Member Removed', description: 'User has been removed from workspace.' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Removal Failed', description: error.response?.data?.message });
    },
  });
};

export const useRemoveProjectMemberMutation = (slug?: string, projectId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (userId: string) => memberService.removeProjectMember(slug!, projectId!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMembers', slug, projectId] });
      toast({ title: 'Member Removed', description: 'User has been removed from project.' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Removal Failed', description: error.response?.data?.message });
    },
  });
};

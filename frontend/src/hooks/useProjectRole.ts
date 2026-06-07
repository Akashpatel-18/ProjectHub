import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import api from '../lib/axios';
import { useAuthStore } from '../store/auth.store';
import { useWorkspaceRole } from './useWorkspaceRole';

export interface ProjectRoleContext {
  /** The user's project-level role name: "Admin" | "Member" | "Guest" | null */
  projectRoleName: string | null;
  /** True if user has project-level Admin role */
  isProjectAdmin: boolean;
  /** True if user has project-level Member role */
  isProjectMember: boolean;
  /** True if user has project-level Guest role */
  isProjectGuest: boolean;
  /** Member/Admin can create tasks; Guest cannot. Workspace Owner bypasses. */
  canCreateTasks: boolean;
  /** Member/Admin can edit tasks; Guest cannot. Workspace Owner bypasses. */
  canEditTasks: boolean;
  /** Admin can delete any task; Member can delete own only; Guest cannot. Workspace Owner bypasses. */
  canDeleteAnyTask: boolean;
  /** Member can delete only own tasks. */
  canDeleteOwnTasks: boolean;
  /** Project Admin or Workspace Owner can add/remove/change project members. */
  canManageProjectMembers: boolean;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Resolves the current user's PROJECT-LEVEL role from ProjectMember data.
 *
 * This is completely independent from the workspace role.
 * Workspace Owner always bypasses all project-level restrictions.
 *
 * @param projectId - The project to check roles for
 */
export function useProjectRole(projectId?: string): ProjectRoleContext {
  const { slug } = useParams();
  const { user } = useAuthStore();
  const { isOwner: isWorkspaceOwner } = useWorkspaceRole();

  const { data: projectMembers, isLoading } = useQuery({
    queryKey: ['projectMembers', slug, projectId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${slug}/projects/${projectId}/members`);
      return res.data.data;
    },
    enabled: !!slug && !!projectId && !!user,
    staleTime: 60_000,
  });

  const myMembership = projectMembers?.find((pm: any) => pm.userId === user?.id);
  const projectRoleName: string | null = myMembership?.role?.name ?? null;

  const isProjectAdmin = projectRoleName === 'Admin';
  const isProjectMember = projectRoleName === 'Member';
  const isProjectGuest = projectRoleName === 'Guest';

  const hasExplicitRole = !!projectRoleName;
  const isOwnerWithoutExplicitRole = isWorkspaceOwner && !hasExplicitRole;

  return {
    projectRoleName,
    isProjectAdmin,
    isProjectMember,
    isProjectGuest,
    // If the user has an explicit project role, use that.
    // Otherwise, fallback to workspace owner privileges.
    canCreateTasks: isOwnerWithoutExplicitRole || isProjectAdmin || isProjectMember,
    canEditTasks: isOwnerWithoutExplicitRole || isProjectAdmin || isProjectMember,
    canDeleteAnyTask: isOwnerWithoutExplicitRole || isProjectAdmin,
    canDeleteOwnTasks: isProjectMember,
    canManageProjectMembers: isOwnerWithoutExplicitRole || isProjectAdmin,
    isLoading,
  };
}

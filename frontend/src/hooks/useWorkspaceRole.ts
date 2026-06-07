import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import api from '../lib/axios';
import { useAuthStore } from '../store/auth.store';

export interface WorkspaceRoleContext {
  roleName: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isGuest: boolean;
  /** True if user can create/manage projects (workspace-level action) */
  canManageProjects: boolean;
  /** True if user can invite workspace members */
  canInviteMembers: boolean;
  /** True if user can manage workspace-level members (OWNER only) */
  canManageWorkspaceMembers: boolean;
  /** Returns allowed invite roles based on the inviter's role */
  allowedInviteRoleNames: string[];
  isLoading: boolean;
}

/**
 * Resolves the current user's workspace-level role from membership data.
 * This hook is ONLY for workspace-level permission checks.
 * For project/task-level permissions, use useProjectRole instead.
 */
export function useWorkspaceRole(): WorkspaceRoleContext {
  const { slug } = useParams();
  const { user } = useAuthStore();

  const { data: members, isLoading } = useQuery({
    queryKey: ['members', slug],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${slug}/members`);
      return res.data.data;
    },
    enabled: !!slug && !!user,
    staleTime: 60_000,
  });

  const myMembership = members?.find((m: any) => m.userId === user?.id);
  const roleName: string | null = myMembership?.role?.name ?? null;

  const isOwner = roleName === 'Owner';
  const isAdmin = roleName === 'Admin';
  const isMember = roleName === 'Member';
  const isGuest = roleName === 'Guest';

  return {
    roleName,
    isOwner,
    isAdmin,
    isMember,
    isGuest,
    canManageProjects: isOwner || isAdmin,
    canInviteMembers: isOwner,
    canManageWorkspaceMembers: isOwner,
    // OWNER can invite Admin, Member, Guest
    allowedInviteRoleNames: isOwner
      ? ['Admin', 'Member', 'Guest']
      : [],
    isLoading,
  };
}


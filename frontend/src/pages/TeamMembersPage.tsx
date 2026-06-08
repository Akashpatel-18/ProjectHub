import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Users, UserPlus, Search, Loader2 } from 'lucide-react';

import { useWorkspaceMembersQuery, useRemoveWorkspaceMemberMutation, usePendingInvitesQuery } from '@/services/member/member.queries';
import { useWorkspaceRolesQuery } from '@/services/workspace/workspace.queries';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { TeamMemberTable } from '@/components/team/TeamMemberTable';
import { InviteMemberModal } from '@/components/modals/InviteMemberModal';
import { UpdateRoleModal } from '@/components/modals/UpdateRoleModal';

export default function TeamMembersPage() {
  const { slug } = useParams();
  const { user: currentUser } = useAuthStore();

  const { isOwner, canInviteMembers, allowedInviteRoleNames, isLoading: roleLoading } = useWorkspaceRole();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [changeRoleTarget, setChangeRoleTarget] = useState<{ userId: string; name: string; roleId: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: members, isLoading: loadingMembers } = useWorkspaceMembersQuery(slug!);
  const { data: invites } = usePendingInvitesQuery(slug!);
  const { data: roles } = useWorkspaceRolesQuery(slug!);

  const removeMutation = useRemoveWorkspaceMemberMutation(slug!);

  // Filter roles based on what the current user is allowed to invite as
  const invitableRoles = roles?.filter((r: any) => allowedInviteRoleNames.includes(r.name)) ?? [];
  // Roles that can be assigned when changing an existing member's workspace role (OWNER only)
  const changeableRoles = roles?.filter((r: any) => r.name !== 'Owner') ?? [];

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const filteredMembers = members?.filter((m: any) => {
    const q = searchQuery.toLowerCase();
    return (
      m.user?.name?.toLowerCase().includes(q) ||
      m.user?.email?.toLowerCase().includes(q) ||
      m.role?.name?.toLowerCase().includes(q)
    );
  }) ?? [];

  const filteredInvites = invites?.filter((i: any) => {
    const q = searchQuery.toLowerCase();
    return (
      i.email?.toLowerCase().includes(q) ||
      i.role?.name?.toLowerCase().includes(q)
    );
  }) ?? [];

  const handleRemove = (userId: string, name: string) => {
    if (confirm(`Remove "${name}" from this workspace?\n\nThis will also remove them from all projects and unassign their tasks.`)) {
      removeMutation.mutate(userId);
    }
  };

  if (loadingMembers || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            Team Members
          </h2>
          <p className="text-muted-foreground text-sm mt-2 ml-1">
            {members?.length ?? 0} member{(members?.length ?? 0) !== 1 ? 's' : ''} in this workspace
          </p>
        </div>

        {/* Invite button — visible to OWNER and ADMIN */}
        {canInviteMembers && (
          <Button onClick={() => setInviteOpen(true)} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2">
            <UserPlus className="w-4 h-4" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Search bar */}
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email or role..."
          className="pl-9 bg-card/30 border-border/50"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Members Table */}
      <TeamMemberTable
        members={filteredMembers}
        invites={filteredInvites}
        currentUser={currentUser}
        isOwner={isOwner}
        onRemove={handleRemove}
        onChangeRole={(userId, name, currentRoleId) => setChangeRoleTarget({ userId, name, roleId: currentRoleId })}
      />

      {/* INVITE MODAL */}
      <InviteMemberModal
        slug={slug!}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        isOwner={isOwner}
        invitableRoles={invitableRoles}
      />

      {/* CHANGE ROLE MODAL */}
      <UpdateRoleModal
        slug={slug!}
        target={changeRoleTarget}
        onClose={() => setChangeRoleTarget(null)}
        changeableRoles={changeableRoles}
      />
    </div>
  );
}

import { useParams } from 'react-router-dom';
import {
  Users,
  UserPlus,
  ShieldAlert,
  Trash2,
  Shield,
  Mail,
  Loader2,
  Settings
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { useAuthStore } from '../store/auth.store';
import {
  useWorkspaceMembersQuery,
  useInviteWorkspaceMemberMutation,
  useRemoveWorkspaceMemberMutation,
  useUpdateWorkspaceRoleMutation,
  usePendingInvitesQuery
} from '@/services/member/member.queries';
import { useWorkspaceRolesQuery } from '@/services/workspace/workspace.queries'
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const inviteSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  roleId: z.string().min(1, { message: 'Please select a role' }),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

export default function WorkspaceSettingsPage() {
  const { slug } = useParams();
  const { user: currentUser } = useAuthStore();

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      roleId: '',
    },
  });

  // Queries
  const { data: members, isLoading: loadingMembers } = useWorkspaceMembersQuery(slug!);
  const { data: invites } = usePendingInvitesQuery(slug!);
  const { data: roles, isLoading: loadingRoles } = useWorkspaceRolesQuery(slug);

  // Mutations
  const inviteMutation = useInviteWorkspaceMemberMutation(slug);
  const removeMemberMutation = useRemoveWorkspaceMemberMutation(slug);
  const updateRoleMutation = useUpdateWorkspaceRoleMutation(slug);

  const handleInviteSubmit = (values: InviteFormValues) => {
    inviteMutation.mutate(values, {
      onSuccess: () => {
        form.reset();
      }
    });
  };

  const handleRoleChange = (userId: string, roleId: string) => {
    updateRoleMutation.mutate({ userId, data: { roleId } });
  };

  const handleRemoveMember = (userId: string) => {
    if (confirm('Are you sure you want to remove this member from the workspace?')) {
      removeMemberMutation.mutate(userId);
    }
  };

  const getRoleBadgeStyle = (roleName: string) => {
    switch (roleName) {
      case 'Owner':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'Admin':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Member':
        return 'bg-primary/10 text-primary border-primary/25';
      case 'Guest':
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
      default:
        return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  const isLoading = loadingMembers || loadingRoles;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Find if current user is Owner or Admin to show controls
  const currentUserMembership = members?.find((m: any) => m.userId === currentUser?.id);
  const isOwnerOrAdmin = currentUserMembership?.role?.name === 'Owner' || currentUserMembership?.role?.name === 'Admin';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Banner */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="w-8 h-8 text-primary" /> Workspace Settings
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage member directory, customize roles, and invite new collaborators.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Invitation Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border/50 bg-card/30 backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg font-bold">Invite Collaborator</CardTitle>
              </div>
              <CardDescription>
                Send a secure, tokenized invitation link via Resend.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isOwnerOrAdmin ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleInviteSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                              <Input placeholder="collaborator@company.com" {...field} className="pl-9 bg-background/50 border-border/50" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="roleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Access Role</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger className="w-full h-10 bg-background/50 border-border/50">
                                <SelectValue placeholder="Select a role..." />
                              </SelectTrigger>
                              <SelectContent>
                                {roles && roles.map((role: any) => (
                                  <SelectItem key={role.id} value={role.id}>
                                    {role.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 pt-2 pb-2"
                      disabled={inviteMutation.isPending}
                    >
                      {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
                    </Button>
                  </form>
                </Form>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-border/50 rounded-lg bg-card/10 text-muted-foreground text-xs font-semibold gap-2">
                  <ShieldAlert className="w-8 h-8 text-amber-400" />
                  <span>Only Owners and Admins can invite new members to this workspace.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Directory Panel */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-card/30 backdrop-blur-xl h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg font-bold">Collaborators Directory</CardTitle>
              </div>
              <CardDescription>
                A directory of users who have access to this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members && members.map((member: any) => {
                  const isSelf = member.userId === currentUser?.id;
                  const isOwner = member.role?.name === 'Owner';

                  return (
                    <div
                      key={member.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-border/30 bg-card/25 hover:border-border transition-colors duration-200 gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="w-10 h-10 border border-border">
                          <AvatarImage src={member.user?.avatarUrl} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {member.user?.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                            {member.user?.name}
                            {isSelf && (
                              <Badge variant="outline" className="text-[9px] bg-secondary border-border font-bold">
                                You
                              </Badge>
                            )}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">{member.user?.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold uppercase tracking-wider border ${getRoleBadgeStyle(member.role?.name)}`}
                        >
                          {member.role?.name}
                        </Badge>

                        {/* Member management actions (Owners/Admins only) */}
                        {isOwnerOrAdmin && !isSelf && !isOwner && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                                <Shield className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="border-border/50 bg-card/95 backdrop-blur-xl">
                              <DropdownMenuLabel>Permissions</DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-border/50" />

                              {roles && roles.map((role: any) => {
                                if (role.name === 'Owner') return null; // Cannot elevate to owner directly this way
                                return (
                                  <DropdownMenuItem
                                    key={role.id}
                                    className="text-xs font-semibold cursor-pointer"
                                    onClick={() => handleRoleChange(member.userId, role.id)}
                                    disabled={member.roleId === role.id}
                                  >
                                    Assign {role.name}
                                  </DropdownMenuItem>
                                );
                              })}

                              <DropdownMenuSeparator className="bg-border/50" />
                              <DropdownMenuItem
                                className="text-xs font-semibold text-red-500 hover:text-red-400 focus:text-red-400 focus:bg-destructive/10 cursor-pointer"
                                onClick={() => handleRemoveMember(member.userId)}
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove Member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  );
                })}

                {invites && invites.map((invite: any) => (
                  <div
                    key={invite.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-border/30 bg-card/10 hover:border-border transition-colors duration-200 gap-3 opacity-80"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-10 h-10 border border-border">
                        <AvatarFallback className="bg-secondary text-muted-foreground">
                          <Mail className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                          <span className="text-muted-foreground italic">Pending Invite</span>
                          <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold">
                            PENDING
                          </Badge>
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">{invite.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold uppercase tracking-wider border ${getRoleBadgeStyle(invite.role?.name)}`}
                      >
                        {invite.role?.name}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

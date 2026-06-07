import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, formatDistanceToNow } from 'date-fns';
import { Users, UserPlus, ShieldAlert, Trash2, Mail, Shield, UserCog, Crown, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAddProjectMemberMutation, useUpdateProjectRoleMutation, useRemoveProjectMemberMutation } from '@/services/member/member.queries';

const addMemberSchema = z.object({
  userId: z.string().min(1, 'Select a user'),
  roleId: z.string().min(1, 'Select a role'),
});
type AddMemberValues = z.infer<typeof addMemberSchema>;

const changeRoleSchema = z.object({
  roleId: z.string().min(1, 'Select a role'),
});
type ChangeRoleValues = z.infer<typeof changeRoleSchema>;

interface ProjectMembersTabProps {
  slug: string;
  projectId: string;
  projectMembers: any[];
  workspaceMembers: any[];
  projectRoles: any[];
  currentUser: any;
  isWorkspaceOwner: boolean;
  canManageProjectMembers: boolean;
  isProjectAdmin: boolean;
}

export function ProjectMembersTab({
  slug,
  projectId,
  projectMembers,
  workspaceMembers,
  projectRoles,
  currentUser,
  isWorkspaceOwner,
  canManageProjectMembers,
  isProjectAdmin
}: ProjectMembersTabProps) {
  const [addMemberOpen, setAddMemberOpen] = React.useState(false);
  const [changeRoleTarget, setChangeRoleTarget] = React.useState<{ userId: string; name: string; currentRoleId: string } | null>(null);

  const addMemberMutation = useAddProjectMemberMutation(slug, projectId);
  const updateRoleMutation = useUpdateProjectRoleMutation(slug, projectId);
  const removeMutation = useRemoveProjectMemberMutation(slug, projectId);

  const addMemberForm = useForm<AddMemberValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { userId: '', roleId: '' },
  });

  const changeRoleForm = useForm<ChangeRoleValues>({
    resolver: zodResolver(changeRoleSchema),
    defaultValues: { roleId: '' },
  });

  const onAddMember = (values: AddMemberValues) => {
    addMemberMutation.mutate(values, {
      onSuccess: () => {
        setAddMemberOpen(false);
        addMemberForm.reset();
      }
    });
  };

  const onChangeRole = (values: ChangeRoleValues) => {
    if (changeRoleTarget) {
      updateRoleMutation.mutate({ userId: changeRoleTarget.userId, data: values }, {
        onSuccess: () => {
          setChangeRoleTarget(null);
        }
      });
    }
  };

  const handleRemove = (userId: string, name: string) => {
    if (confirm(`Remove "${name}" from this project?\n\nThey will lose access to this board but remain in the workspace.`)) {
      removeMutation.mutate(userId);
    }
  };

  const getRoleBadgeStyle = (roleName: string) => {
    switch (roleName) {
      case 'Owner': return 'bg-amber-500/10 text-amber-400 border-amber-500/25';
      case 'Admin': return 'bg-purple-500/10 text-purple-400 border-purple-500/25';
      case 'Member': return 'bg-primary/10 text-primary border-primary/25';
      case 'Guest': return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/25';
      default: return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'Owner': return <Crown className="w-3 h-3" />;
      case 'Admin': return <Shield className="w-3 h-3" />;
      default: return null;
    }
  };

  // Available users to add (in workspace, not yet in project)
  const availableWorkspaceUsers = workspaceMembers?.filter((wm: any) =>
    !projectMembers?.some((pm: any) => pm.userId === wm.userId)
  ) ?? [];

  return (
    <div className="flex flex-col h-full bg-card/10 backdrop-blur-xl rounded-2xl border border-border/50 p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h3 className="text-lg font-bold text-foreground">Project Members</h3>
          <p className="text-sm text-muted-foreground mt-1">
            People with access to this specific project board.
          </p>
        </div>
        {canManageProjectMembers && (
          <Button onClick={() => setAddMemberOpen(true)} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
            <UserPlus className="w-4 h-4 mr-2" /> Add Member
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-border/50 bg-card/30">
        <Table>
          <TableHeader>
            <TableRow className="border-border/40 hover:bg-transparent">
              <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider w-[300px]">Member</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Project Role</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Added</TableHead>
              {(canManageProjectMembers) && (
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right w-[80px]">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {projectMembers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-muted-foreground text-sm">
                  <Users className="w-8 h-8 mx-auto mb-3 text-muted-foreground/30" />
                  No members added to this project yet.
                </TableCell>
              </TableRow>
            ) : (
              projectMembers?.map((member: any) => {
                const isSelf = member.userId === currentUser?.id;
                // Workspace owners cannot be removed or downgraded in project by anyone, including admins
                // const isMemberWorkspaceOwner = workspaceMembers?.find((wm: any) => wm.userId === member.userId)?.role?.name === 'Owner';
                const canModifyThisMember = canManageProjectMembers && !isSelf;

                return (
                  <TableRow key={member.id} className="border-border/30 hover:bg-secondary/20 transition-colors duration-150">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 border border-border/50 shrink-0">
                          <AvatarImage src={member.user?.avatarUrl} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {member.user?.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                            {member.user?.name}
                            {isSelf && <Badge variant="outline" className="text-[9px] bg-secondary border-border font-bold px-1.5 py-0">You</Badge>}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        {member.user?.email}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className={`text-[10px] font-semibold uppercase tracking-wider border flex items-center gap-1 w-fit ${getRoleBadgeStyle(member.role?.name)}`}>
                        {getRoleIcon(member.role?.name)}
                        {member.role?.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-xs text-muted-foreground font-medium">
                        {format(new Date(member.createdAt), 'MMM d, yyyy')}
                      </span>
                    </TableCell>
                    {(canManageProjectMembers) && (
                      <TableCell className="py-4 text-right">
                        {canModifyThisMember ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:bg-secondary hover:text-foreground">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="border-border/50 bg-card/95 backdrop-blur-xl w-44">
                              <DropdownMenuItem className="text-xs font-semibold cursor-pointer flex items-center gap-2" onClick={() => {
                                setChangeRoleTarget({ userId: member.userId, name: member.user?.name, currentRoleId: member.roleId });
                                changeRoleForm.setValue('roleId', member.roleId);
                              }}>
                                <UserCog className="w-3.5 h-3.5" /> Change Role
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-border/50" />
                              <DropdownMenuItem className="text-xs font-semibold text-red-500 hover:text-red-400 focus:text-red-400 focus:bg-destructive/10 cursor-pointer flex items-center gap-2" onClick={() => handleRemove(member.userId, member.user?.name)}>
                                <Trash2 className="w-3.5 h-3.5" /> Remove from Project
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-xs text-muted-foreground/40 font-medium pr-2">—</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Member Modal */}
      <Dialog open={addMemberOpen} onOpenChange={(val) => { setAddMemberOpen(val); if (!val) addMemberForm.reset(); }}>
        <DialogContent className="border-border/50 bg-card/95 backdrop-blur-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Add Project Member
            </DialogTitle>
            <DialogDescription>Grant a workspace member access to this project.</DialogDescription>
          </DialogHeader>

          {availableWorkspaceUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-border/50 rounded-xl bg-card/10 text-muted-foreground text-xs gap-3">
              <ShieldAlert className="w-8 h-8 text-amber-400" />
              <span>All workspace members are already in this project.</span>
            </div>
          ) : (
            <Form {...addMemberForm}>
              <form onSubmit={addMemberForm.handleSubmit(onAddMember)} className="space-y-4 pt-2">
                <FormField control={addMemberForm.control} name="userId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select User</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="w-full h-10 bg-background/50 border-border/50">
                          <SelectValue placeholder="Select a workspace member..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableWorkspaceUsers.map((m: any) => (
                            <SelectItem key={m.userId} value={m.userId}>
                              {m.user?.name} ({m.user?.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={addMemberForm.control} name="roleId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Role</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="w-full h-10 bg-background/50 border-border/50">
                          <SelectValue placeholder="Select a role..." />
                        </SelectTrigger>
                        <SelectContent>
                          {projectRoles.map((role: any) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <DialogFooter className="pt-2">
                  <Button type="button" variant="ghost" onClick={() => setAddMemberOpen(false)} disabled={addMemberMutation.isPending}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25" disabled={addMemberMutation.isPending}>
                    {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Role Modal */}
      <Dialog open={!!changeRoleTarget} onOpenChange={(open) => { if (!open) setChangeRoleTarget(null); }}>
        <DialogContent className="border-border/50 bg-card/95 backdrop-blur-xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-primary" />
              Change Project Role
            </DialogTitle>
            <DialogDescription>Update project role for <strong>{changeRoleTarget?.name}</strong>.</DialogDescription>
          </DialogHeader>

          <Form {...changeRoleForm}>
            <form onSubmit={changeRoleForm.handleSubmit(onChangeRole)} className="space-y-4 pt-2">
              <FormField control={changeRoleForm.control} name="roleId" render={({ field }) => (
                <FormItem>
                  <FormLabel>New Role</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="w-full h-10 bg-background/50 border-border/50">
                        <SelectValue placeholder="Select a role..." />
                      </SelectTrigger>
                      <SelectContent>
                        {projectRoles.map((role: any) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setChangeRoleTarget(null)} disabled={updateRoleMutation.isPending}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25" disabled={updateRoleMutation.isPending}>
                  {updateRoleMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

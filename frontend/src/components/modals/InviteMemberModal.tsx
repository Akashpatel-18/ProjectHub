import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, UserPlus, ShieldAlert } from 'lucide-react';
import { useInviteWorkspaceMemberMutation } from '@/services/member/member.queries';
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

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const inviteSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  roleId: z.string().min(1, { message: 'Please select a role' }),
});
type InviteFormValues = z.infer<typeof inviteSchema>;

interface InviteMemberModalProps {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOwner: boolean;
  invitableRoles: any[];
}

export function InviteMemberModal({ slug, open, onOpenChange, isOwner, invitableRoles }: InviteMemberModalProps) {
  const inviteMutation = useInviteWorkspaceMemberMutation(slug);

  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', roleId: '' },
  });

  const onSubmit = (values: InviteFormValues) => {
    inviteMutation.mutate(values, {
      onSuccess: () => {
        inviteForm.reset();
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) inviteForm.reset();
    }}>
      <DialogContent className="border-border/50 bg-card/95 backdrop-blur-xl max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            {isOwner
              ? 'As Owner, you can invite Admin, Member, or Guest.'
              : 'As Admin, you can invite Member or Guest only.'}
          </DialogDescription>
        </DialogHeader>

        {invitableRoles.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-border/50 rounded-xl bg-card/10 text-muted-foreground text-xs gap-3">
            <ShieldAlert className="w-8 h-8 text-amber-400" />
            <span>You don't have permission to invite members.</span>
          </div>
        ) : (
          <form onSubmit={inviteForm.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="collaborator@company.com" {...inviteForm.register('email')} className="pl-9 bg-background/50 border-border/50" />
              </div>
              {inviteForm.formState.errors.email && (
                <p className="text-[10px] font-medium text-destructive">{inviteForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Access Role</label>
              <Controller
                name="roleId"
                control={inviteForm.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <SelectTrigger className="w-full h-10 bg-background/50 border-border/50">
                      <SelectValue placeholder="Select a role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {invitableRoles.map((role: any) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                          {role.name === 'Admin' && ' — Full project management'}
                          {role.name === 'Member' && ' — Can create & edit tasks'}
                          {role.name === 'Guest' && ' — Read-only access'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {inviteForm.formState.errors.roleId && (
                <p className="text-[10px] font-medium text-destructive">{inviteForm.formState.errors.roleId.message}</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={inviteMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

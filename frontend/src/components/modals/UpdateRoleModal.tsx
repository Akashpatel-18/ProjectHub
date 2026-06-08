import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UserCog } from 'lucide-react';
import { useUpdateWorkspaceRoleMutation } from '@/services/member/member.queries';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const changeRoleSchema = z.object({
  roleId: z.string().min(1, 'Select a role'),
});
type ChangeRoleValues = z.infer<typeof changeRoleSchema>;

interface UpdateRoleModalProps {
  slug: string;
  target: { userId: string; name: string; roleId: string } | null;
  onClose: () => void;
  changeableRoles: any[];
}

export function UpdateRoleModal({ slug, target, onClose, changeableRoles }: UpdateRoleModalProps) {
  const updateRoleMutation = useUpdateWorkspaceRoleMutation(slug);

  const changeRoleForm = useForm<ChangeRoleValues>({
    resolver: zodResolver(changeRoleSchema),
    defaultValues: { roleId: target?.roleId || '' },
  });

  React.useEffect(() => {
    if (target) {
      changeRoleForm.setValue('roleId', target.roleId);
    }
  }, [target, changeRoleForm]);

  const onSubmit = (values: ChangeRoleValues) => {
    if (target) {
      updateRoleMutation.mutate({ userId: target.userId, data: values }, {
        onSuccess: () => {
          onClose();
        }
      });
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="border-border/50 bg-card/95 backdrop-blur-xl max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-primary" />
            Change Role
          </DialogTitle>
          <DialogDescription>
            Update workspace role for <strong>{target?.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={changeRoleForm.handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">New Role</label>
            <Controller
              name="roleId"
              control={changeRoleForm.control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                  <SelectTrigger className="w-full h-10 bg-background/50 border-border/50">
                    <SelectValue placeholder="Select a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {changeableRoles.map((role: any) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {changeRoleForm.formState.errors.roleId && (
              <p className="text-xs font-medium text-destructive">{changeRoleForm.formState.errors.roleId.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={updateRoleMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25" disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

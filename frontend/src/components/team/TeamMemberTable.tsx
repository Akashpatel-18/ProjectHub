import React from 'react';
import { format } from 'date-fns';
import { Mail, MoreHorizontal, UserCog, Trash2, Shield, Crown, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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

interface TeamMemberTableProps {
  members: any[];
  invites?: any[];
  currentUser: any;
  isOwner: boolean;
  onRemove: (userId: string, name: string) => void;
  onChangeRole: (userId: string, name: string, currentRoleId: string) => void;
}

const getRoleBadgeStyle = (roleName: string) => {
  switch (roleName) {
    case 'Owner':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/25';
    case 'Admin':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/25';
    case 'Member':
      return 'bg-primary/10 text-primary border-primary/25';
    case 'Guest':
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/25';
    default:
      return 'bg-secondary text-secondary-foreground border-border';
  }
};

const getRoleIcon = (roleName: string) => {
  switch (roleName) {
    case 'Owner': return <Crown className="w-3 h-3" />;
    case 'Admin': return <Shield className="w-3 h-3" />;
    default: return null;
  }
};

export function TeamMemberTable({ members, invites = [], currentUser, isOwner, onRemove, onChangeRole }: TeamMemberTableProps) {

  // ── Mobile card layout ──────────────────────────────────────────
  const MobileCards = () => (
    <div className="md:hidden space-y-3">
      {members.length === 0 && invites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm">
          <Users className="w-8 h-8 mx-auto mb-3 text-muted-foreground/30" />
          No members found.
        </div>
      ) : (
        <>
        {members.map((member: any) => {
          const isSelf = member.userId === currentUser?.id;
          const isMemberOwner = member.role?.name === 'Owner';

          return (
            <div
              key={member.id}
              className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-9 h-9 border border-border/50 shrink-0">
                    <AvatarImage src={member.user?.avatarUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {member.user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="truncate">{member.user?.name}</span>
                      {isSelf && (
                        <Badge variant="outline" className="text-[9px] bg-secondary border-border font-bold px-1.5 py-0 shrink-0">
                          You
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground truncate block">{member.user?.email}</span>
                  </div>
                </div>

                {isOwner && !isSelf && !isMemberOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-muted-foreground hover:bg-secondary hover:text-foreground shrink-0"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="border-border/50 bg-card/95 backdrop-blur-xl w-44"
                    >
                      <DropdownMenuItem
                        className="text-xs font-semibold cursor-pointer flex items-center gap-2"
                        onClick={() => onChangeRole(member.userId, member.user?.name, member.roleId)}
                      >
                        <UserCog className="w-3.5 h-3.5" />
                        Change Role
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border/50" />
                      <DropdownMenuItem
                        className="text-xs font-semibold text-red-500 hover:text-red-400 focus:text-red-400 focus:bg-destructive/10 cursor-pointer flex items-center gap-2"
                        onClick={() => onRemove(member.userId, member.user?.name)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border/30">
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold uppercase tracking-wider border flex items-center gap-1 w-fit ${getRoleBadgeStyle(member.role?.name)}`}
                >
                  {getRoleIcon(member.role?.name)}
                  {member.role?.name}
                </Badge>
                <span className="text-[10px] text-muted-foreground font-medium">
                  Joined {format(new Date(member.createdAt), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          );
        })}
        {invites.map((invite: any) => (
          <div
            key={invite.id}
            className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-xl p-4 space-y-3 opacity-80"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="w-9 h-9 border border-border/50 shrink-0">
                  <AvatarFallback className="bg-secondary text-muted-foreground text-xs font-bold">
                    <Mail className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="truncate">{invite.email}</span>
                  </div>
                  <span className="text-xs text-muted-foreground truncate block">Invited by {invite.invitedBy?.name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/30">
              <div className="flex gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold uppercase tracking-wider border flex items-center gap-1 w-fit ${getRoleBadgeStyle(invite.role?.name)}`}
                >
                  {getRoleIcon(invite.role?.name)}
                  {invite.role?.name}
                </Badge>
                <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold">
                  PENDING
                </Badge>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">
                Sent {format(new Date(invite.createdAt), 'MMM d')}
              </span>
            </div>
          </div>
        ))}
        </>
      )}
    </div>
  );

  // ── Desktop table layout ────────────────────────────────────────
  const DesktopTable = () => (
    <div className="hidden md:block rounded-2xl border border-border/50 bg-card/30 backdrop-blur-xl overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/40 hover:bg-transparent">
              <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider w-[300px]">
                Member
              </TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Email
              </TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Workspace Role
              </TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Joined
              </TableHead>
              {isOwner && (
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right w-[80px]">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 && invites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isOwner ? 5 : 4} className="text-center py-16 text-muted-foreground text-sm">
                  <Users className="w-8 h-8 mx-auto mb-3 text-muted-foreground/30" />
                  No members found.
                </TableCell>
              </TableRow>
            ) : (
              <>
              {members.map((member: any) => {
                const isSelf = member.userId === currentUser?.id;
                const isMemberOwner = member.role?.name === 'Owner';

                return (
                  <TableRow
                    key={member.id}
                    className="border-border/30 hover:bg-secondary/20 transition-colors duration-150"
                  >
                    {/* Avatar + Name */}
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
                            {isSelf && (
                              <Badge variant="outline" className="text-[9px] bg-secondary border-border font-bold px-1.5 py-0">
                                You
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Email */}
                    <TableCell className="py-4">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        {member.user?.email}
                      </span>
                    </TableCell>

                    {/* Role */}
                    <TableCell className="py-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold uppercase tracking-wider border flex items-center gap-1 w-fit ${getRoleBadgeStyle(member.role?.name)}`}
                      >
                        {getRoleIcon(member.role?.name)}
                        {member.role?.name}
                      </Badge>
                    </TableCell>

                    {/* Joined At */}
                    <TableCell className="py-4">
                      <span className="text-xs text-muted-foreground font-medium">
                        {format(new Date(member.createdAt), 'MMM d, yyyy')}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    {isOwner && (
                      <TableCell className="py-4 text-right">
                        {!isSelf && !isMemberOwner ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 text-muted-foreground hover:bg-secondary hover:text-foreground"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="border-border/50 bg-card/95 backdrop-blur-xl w-44"
                            >
                              <DropdownMenuItem
                                className="text-xs font-semibold cursor-pointer flex items-center gap-2"
                                onClick={() => onChangeRole(member.userId, member.user?.name, member.roleId)}
                              >
                                <UserCog className="w-3.5 h-3.5" />
                                Change Role
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-border/50" />
                              <DropdownMenuItem
                                className="text-xs font-semibold text-red-500 hover:text-red-400 focus:text-red-400 focus:bg-destructive/10 cursor-pointer flex items-center gap-2"
                                onClick={() => onRemove(member.userId, member.user?.name)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Remove Member
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
              })}
              {invites.map((invite: any) => (
                <TableRow
                  key={invite.id}
                  className="border-border/30 hover:bg-secondary/20 transition-colors duration-150 opacity-80"
                >
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9 border border-border/50 shrink-0">
                        <AvatarFallback className="bg-secondary text-muted-foreground text-xs font-bold">
                          <Mail className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <span className="text-muted-foreground italic">Pending Invite</span>
                          <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold px-1.5 py-0">
                            PENDING
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="py-4">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      {invite.email}
                    </span>
                  </TableCell>

                  <TableCell className="py-4">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold uppercase tracking-wider border flex items-center gap-1 w-fit ${getRoleBadgeStyle(invite.role?.name)}`}
                    >
                      {getRoleIcon(invite.role?.name)}
                      {invite.role?.name}
                    </Badge>
                  </TableCell>

                  <TableCell className="py-4">
                    <span className="text-xs text-muted-foreground font-medium">
                      Sent {format(new Date(invite.createdAt), 'MMM d, yyyy')}
                    </span>
                  </TableCell>

                  {isOwner && (
                    <TableCell className="py-4 text-right">
                      <span className="text-xs text-muted-foreground/40 font-medium pr-2">—</span>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <>
      <MobileCards />
      <DesktopTable />
    </>
  );
}

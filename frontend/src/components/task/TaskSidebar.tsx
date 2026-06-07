import React from 'react';
import { EyeOff, Eye, User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUpdateTaskMutation, useToggleWatchMutation } from '@/services/task/task.queries';

interface TaskSidebarProps {
  taskId: string;
  slug: string;
  task: any;
  members: any[];
  currentUser: any;
  canEditTasks?: boolean;
}

export function TaskSidebar({ taskId, slug, task, members, currentUser, canEditTasks = true }: TaskSidebarProps) {
  const updateTaskMutation = useUpdateTaskMutation(slug);
  const watchMutation = useToggleWatchMutation(slug, taskId);

  const isWatching = task?.watchers?.some((w: any) => w.userId === currentUser?.id);

  return (
    <div className="md:col-span-2 p-4 sm:p-6 bg-secondary/15 space-y-6 md:overflow-y-auto custom-scrollbar border-t md:border-t-0 border-border/30">
      
      {/* Watcher widget */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Subscribers</h4>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => watchMutation.mutate()}
          className="w-full bg-card/50 border-border/50 hover:bg-secondary hover:text-foreground font-semibold text-xs h-9 justify-start"
          disabled={watchMutation.isPending}
        >
          {isWatching ? (
            <>
              <EyeOff className="w-4 h-4 mr-2 text-primary" /> Unsubscribe
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-2 text-muted-foreground" /> Subscribe Alert
            </>
          )}
        </Button>

        <div className="flex flex-wrap gap-1.5 pt-2">
          {task.watchers && task.watchers.length > 0 ? (
            task.watchers.map((w: any) => (
              <Badge key={w.userId} variant="secondary" className="text-[10px] font-medium py-0.5 px-2 bg-secondary/50 border border-border/30">
                {w.user?.name}
              </Badge>
            ))
          ) : (
            <span className="text-[10px] text-muted-foreground italic">No watchers yet.</span>
          )}
        </div>
      </div>

      {/* Assignee widget */}
      <div className="space-y-3 pt-2">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><User className="w-3.5 h-3.5 text-primary" /> Assignee</h4>
        <Select
          value={task.assigneeId || 'unassigned'}
          onValueChange={(val) => updateTaskMutation.mutate({ taskId, data: { assigneeId: val === 'unassigned' ? null : val } })}
          disabled={!canEditTasks || updateTaskMutation.isPending}
        >
          <SelectTrigger className="w-full h-9 bg-card text-xs border-border/50">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {members && members.map((m: any) => (
              <SelectItem key={m.user.id} value={m.user.id}>
                {m.user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {task.assignee ? (
          <div className="flex items-center gap-2.5 bg-card/45 p-2 rounded-xl border border-border/30">
            <Avatar className="w-7 h-7 border border-border">
              <AvatarImage src={task.assignee.avatarUrl} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                {task.assignee.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate text-foreground">{task.assignee.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{task.assignee.email}</p>
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground italic pl-1">No assignee assigned.</p>
        )}
      </div>

      {/* Due Date picker */}
      <div className="space-y-3 pt-2">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-primary" /> Due Date</h4>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full h-9 justify-start text-left font-normal bg-card border-border/50 text-xs",
                !task.dueDate && "text-muted-foreground"
              )}
              disabled={!canEditTasks || updateTaskMutation.isPending}
            >
              {task.dueDate ? format(new Date(task.dueDate), "PPP") : <span>Pick a due date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarUI
              mode="single"
              selected={task.dueDate ? new Date(task.dueDate) : undefined}
              onSelect={(date) => updateTaskMutation.mutate({ taskId, data: { dueDate: date ? date.toISOString() : null } })}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {task.dueDate && (
          <Badge variant="outline" className={`text-[10px] font-semibold border ${
            new Date(task.dueDate) < new Date() && task.status !== 'DONE'
              ? 'bg-red-500/10 text-red-400 border-red-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}>
            {new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'Overdue' : 'Due'} • {new Date(task.dueDate).toLocaleDateString()}
          </Badge>
        )}
      </div>

      {/* Activity Stats details */}
      <div className="border-t border-border/30 pt-4 space-y-2 text-[10px] text-muted-foreground">
        <div className="flex justify-between font-medium">
          <span>Task UUID:</span>
          <span className="font-mono text-muted-foreground/80">{task.id.substring(0, 8)}...</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Total Comments:</span>
          <span>{task.comments?.length || 0} posts</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Subscribers Size:</span>
          <span>{task.watchers?.length || 0} watcher(s)</span>
        </div>
      </div>

    </div>
  );
}

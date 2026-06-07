import React, { useState } from 'react';
import { ClipboardList, Play, Users, CheckCircle, Plus, AlertCircle, Trash2, CheckCircle2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

const COLUMNS = [
  { id: 'TODO', title: 'To Do', icon: ClipboardList, color: 'text-blue-400 border-blue-500/20 bg-blue-500/5' },
  { id: 'IN_PROGRESS', title: 'In Progress', icon: Play, color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' },
  { id: 'IN_REVIEW', title: 'In Review', icon: Users, color: 'text-purple-400 border-purple-500/20 bg-purple-500/5' },
  { id: 'DONE', title: 'Done', icon: CheckCircle, color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' },
];

interface KanbanBoardProps {
  tasks: any[];
  canCreateTasks: boolean;
  canEditTasks: boolean;
  canDeleteAnyTask: boolean;
  canDeleteOwnTasks: boolean;
  currentUser: any;
  onAddTask: (columnId: string) => void;
  onTaskClick: (taskId: string) => void;
  onUpdateStatus: (taskId: string, status: string) => void;
  onDeleteTask?: (taskId: string, title: string) => void;
}

export function KanbanBoard({
  tasks,
  canCreateTasks,
  canEditTasks,
  canDeleteAnyTask,
  canDeleteOwnTasks,
  currentUser,
  onAddTask,
  onTaskClick,
  onUpdateStatus,
  onDeleteTask
}: KanbanBoardProps) {
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedOverColumn !== columnId) {
      setDraggedOverColumn(columnId);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDraggedOverColumn(null);
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;
    onUpdateStatus(taskId, status);
  };

  const handleDelete = (e: React.MouseEvent, taskId: string, title: string) => {
    e.stopPropagation();
    if (onDeleteTask) onDeleteTask(taskId, title);
  }

  const getPriorityBadgeStyle = (p: string) => {
    switch (p) {
      case 'URGENT': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'HIGH': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'MEDIUM': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'LOW': return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
      default: return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  return (
    <div className="flex-1 flex lg:grid lg:grid-cols-4 gap-4 overflow-x-auto overflow-y-hidden min-h-0 pb-2 custom-scrollbar pr-1 snap-x snap-mandatory lg:snap-none">
      {COLUMNS.map((column) => {
        const colTasks = tasks?.filter((t: any) => t.status === column.id) || [];
        const isOver = draggedOverColumn === column.id;

        return (
          <div
            key={column.id}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
            className={cn(
              'flex flex-col h-full rounded-2xl border bg-card/10 backdrop-blur-xl p-4 transition-all duration-200 min-h-[400px] shadow-md w-[280px] sm:w-[300px] lg:w-auto snap-center shrink-0 lg:shrink',
              isOver
                ? 'border-primary bg-primary/5 ring-1 ring-primary/25 shadow-lg shadow-primary/5'
                : 'border-border/30'
            )}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <column.icon className={cn('w-4 h-4', column.color.split(' ')[0])} />
                <span className="font-bold text-sm text-foreground truncate">{column.title}</span>
                <Badge variant="secondary" className="text-[10px] font-semibold bg-secondary/50 border border-border/30 py-0 px-2 shrink-0">
                  {colTasks.length}
                </Badge>
              </div>

              {canCreateTasks && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-secondary/80 shrink-0"
                  onClick={() => onAddTask(column.id)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Task List */}
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1 -mr-1 min-h-0">
              {colTasks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-border/30 rounded-xl bg-card/5 text-muted-foreground">
                  <span className="text-xs font-medium">No tasks</span>
                </div>
              ) : (
                colTasks.map((task: any) => {
                  const isTaskAuthor = task.authorId === currentUser?.id;
                  const canDelete = canDeleteAnyTask || (canDeleteOwnTasks && isTaskAuthor);

                  return (
                    <div
                      key={task.id}
                      draggable={canEditTasks}
                      onDragStart={(e) => canEditTasks && handleDragStart(e, task.id)}
                      onClick={() => onTaskClick(task.id)}
                      className={cn(
                        "shrink-0 group cursor-pointer rounded-xl border border-border/50 bg-card/60 backdrop-blur-md p-3.5 shadow-sm transition-all duration-200 relative overflow-hidden",
                        "hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5",
                        isOver && "opacity-80"
                      )}
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="flex items-start justify-between gap-2 mb-2 w-full">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] font-bold tracking-wider px-1.5 py-0 shrink-0",
                            getPriorityBadgeStyle(task.priority)
                          )}
                        >
                          {task.priority}
                        </Badge>

                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-6 h-6 h-6 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mt-1 -mr-1"
                            onClick={(e) => handleDelete(e, task.id, task.title)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-foreground mb-1 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                        {task.title}
                      </h4>

                      {task.description && (
                        <p className="text-xs text-muted-foreground mb-3 leading-relaxed whitespace-pre-wrap line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/40">
                        <div className="flex items-center gap-3">
                          {task.dueDate && (
                            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1" title="Due Date">
                              <AlertCircle className="w-3 h-3" />
                              {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                            </span>
                          )}
                          {(task.subtasks?.length > 0 || task._count?.subtasks > 0) && (
                            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1" title="Subtasks">
                              <CheckCircle2 className="w-3 h-3" />
                              {task.subtasks?.filter((s: any) => s.isCompleted)?.length || 0}/{task.subtasks?.length || task._count?.subtasks || 0}
                            </span>
                          )}
                          {(task.comments?.length > 0 || task._count?.comments > 0) && (
                            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1" title="Comments">
                              <MessageSquare className="w-3 h-3" />
                              {task.comments?.length || task._count?.comments || 0}
                            </span>
                          )}
                        </div>

                        {task.assignee && (
                          <Avatar className="w-6 h-6 border border-border/50 shrink-0 shadow-sm" title={`Assigned to ${task.assignee.name}`}>
                            <AvatarImage src={task.assignee.avatarUrl} />
                            <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">
                              {task.assignee.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

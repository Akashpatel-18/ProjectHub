import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { socket } from '../../lib/socket';
import { useAuthStore } from '../../store/auth.store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { TaskSubtasks } from './TaskSubtasks';
import { TaskAttachments } from './TaskAttachments';
import { TaskComments } from './TaskComments';
import { TaskSidebar } from './TaskSidebar';

import { useTaskQuery, useUpdateTaskMutation } from '@/services/task/task.queries';
import { useWorkspaceMembersQuery } from '@/services/member/member.queries';
import { useProjectRole } from '@/hooks/useProjectRole';

interface TaskDetailsModalProps {
  taskId: string | null;
  onClose: () => void;
}

export default function TaskDetailsModal({ taskId, onClose }: TaskDetailsModalProps) {
  const { slug } = useParams();
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isEditingDesc, setIsEditingDesc] = useState(false);

  // Queries
  const { data: task, isLoading, error } = useTaskQuery(slug!, taskId);
  const { data: members } = useWorkspaceMembersQuery(slug!);
  const { canEditTasks } = useProjectRole(task?.projectId);

  useEffect(() => {
    if (task) {
      setEditTitle(task.title || '');
      setEditDescription(task.description || '');
    }
  }, [task]);

  // Sockets real-time update listeners
  useEffect(() => {
    if (!taskId) return;

    const handleTyping = ({ taskId: incomingTaskId, userName }: { taskId: string; userName: string }) => {
      if (incomingTaskId === taskId) {
        setTypingUser(userName);
      }
    };

    const handleStopTyping = ({ taskId: incomingTaskId }: { taskId: string }) => {
      if (incomingTaskId === taskId) {
        setTypingUser(null);
      }
    };

    const handleCommentCreated = (comment: any) => {
      if (comment.taskId === taskId) {
        queryClient.setQueryData(['task', taskId, slug], (old: any) => {
          if (!old) return old;
          if (old.comments?.some((c: any) => c.id === comment.id)) return old;
          return { ...old, comments: [...(old.comments || []), comment] };
        });
        // We can still invalidate tasks list in background if needed, but avoiding it reduces network spam
      }
    };

    const handleTaskUpdated = (updatedTask: any) => {
      if (updatedTask.id === taskId || updatedTask.taskId === taskId) {
        // Update local cache directly instead of triggering a network fetch
        queryClient.setQueryData(['task', taskId, slug], (old: any) => {
          if (!old) return old;
          return { ...old, ...updatedTask };
        });
        
        // Update the tasks list cache directly to prevent network refetches
        queryClient.setQueryData(['tasks', slug], (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((t: any) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
        });
        queryClient.setQueryData(['tasks', slug, task?.projectId], (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((t: any) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
        });
      }
    };
    const handleSubtaskCreated = (subtask: any) => {
      if (subtask.taskId === taskId) {
        queryClient.setQueryData(['task', taskId, slug], (old: any) => {
          if (!old) return old;
          if (old.subtasks?.some((st: any) => st.id === subtask.id)) return old;
          return { ...old, subtasks: [...(old.subtasks || []), subtask] };
        });
      }
    };

    const handleSubtaskUpdated = (subtask: any) => {
      if (subtask.taskId === taskId) {
        queryClient.setQueryData(['task', taskId, slug], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            subtasks: (old.subtasks || []).map((st: any) => st.id === subtask.id ? subtask : st)
          };
        });
      }
    };

    const handleSubtaskDeleted = ({ taskId: deletedTaskId, subtaskId }: any) => {
      if (deletedTaskId === taskId) {
        queryClient.setQueryData(['task', taskId, slug], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            subtasks: (old.subtasks || []).filter((st: any) => st.id !== subtaskId)
          };
        });
      }
    };

    const handleWatcherUpdated = (data: any) => {
      if (data.taskId === taskId) {
        queryClient.setQueryData(['task', taskId, slug], (old: any) => {
          if (!old) return old;
          let newWatchers = old.watchers || [];
          if (data.watching) {
            if (!newWatchers.some((w: any) => w.userId === data.userId)) {
              newWatchers = [...newWatchers, { userId: data.userId, user: data.user }];
            }
          } else {
            newWatchers = newWatchers.filter((w: any) => w.userId !== data.userId);
          }
          return { ...old, watchers: newWatchers };
        });
      }
    };

    socket.on('user:typing', handleTyping);
    socket.on('user:stopped-typing', handleStopTyping);
    socket.on('comment:created', handleCommentCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('subtask:created', handleSubtaskCreated);
    socket.on('subtask:updated', handleSubtaskUpdated);
    socket.on('subtask:deleted', handleSubtaskDeleted);
    socket.on('task:watcher:updated', handleWatcherUpdated);

    return () => {
      socket.off('user:typing', handleTyping);
      socket.off('user:stopped-typing', handleStopTyping);
      socket.off('comment:created', handleCommentCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('subtask:created', handleSubtaskCreated);
      socket.off('subtask:updated', handleSubtaskUpdated);
      socket.off('subtask:deleted', handleSubtaskDeleted);
      socket.off('task:watcher:updated', handleWatcherUpdated);
    };
  }, [taskId, slug, queryClient]);

  // Mutations
  const updateTaskMutation = useUpdateTaskMutation(slug);

  const handleTitleBlur = () => {
    if (editTitle.trim() && editTitle.trim() !== task?.title) {
      updateTaskMutation.mutate({ taskId: taskId!, data: { title: editTitle.trim() } });
    } else {
      setEditTitle(task?.title || '');
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleDescBlur = () => {
    setIsEditingDesc(false);
    const trimmed = editDescription.trim();
    if (trimmed !== (task?.description || '')) {
      updateTaskMutation.mutate({ taskId: taskId!, data: { description: trimmed } });
    } else {
      setEditDescription(task?.description || '');
    }
  };

  if (!taskId) return null;

  return (
    <Dialog open={!!taskId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] md:h-[85vh] overflow-y-auto border-border/50 bg-card/95 backdrop-blur-xl flex flex-col p-0">

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <AlertCircle className="w-12 h-12 text-destructive mb-3" />
            <h4 className="font-bold text-foreground">Failed to load task</h4>
            <p className="text-sm mt-1">This task might have been deleted or permissions changed.</p>
          </div>
        ) : (
          <>
            <DialogHeader className="p-6 pb-4 border-b border-border/40 relative">
              <div className="flex flex-wrap items-center gap-2 mb-2 pr-6">
                <Badge variant="outline" className="bg-secondary text-secondary-foreground text-[10px] font-semibold border-border">
                  {task?.project?.name}
                </Badge>
                <Select
                  value={task?.priority}
                  disabled={!canEditTasks || updateTaskMutation.isPending}
                  onValueChange={(val) => updateTaskMutation.mutate({ taskId, data: { priority: val } })}
                >
                  <SelectTrigger className="w-auto h-7 bg-transparent border-border/50 rounded text-[10px] font-semibold tracking-wider uppercase px-2 py-0 text-foreground hover:bg-secondary transition-colors focus:ring-0 focus:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW" className="text-[10px] font-semibold">LOW</SelectItem>
                    <SelectItem value="MEDIUM" className="text-[10px] font-semibold">MEDIUM</SelectItem>
                    <SelectItem value="HIGH" className="text-[10px] font-semibold">HIGH</SelectItem>
                    <SelectItem value="URGENT" className="text-[10px] font-semibold">URGENT</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={task?.status}
                  disabled={!canEditTasks || updateTaskMutation.isPending}
                  onValueChange={(val) => updateTaskMutation.mutate({ taskId, data: { status: val } })}
                >
                  <SelectTrigger className="w-auto h-7 bg-transparent border-border/50 rounded text-[10px] font-semibold tracking-wider uppercase px-2 py-0 text-foreground hover:bg-secondary transition-colors focus:ring-0 focus:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODO" className="text-[10px] font-semibold">TO DO</SelectItem>
                    <SelectItem value="IN_PROGRESS" className="text-[10px] font-semibold">IN PROGRESS</SelectItem>
                    <SelectItem value="IN_REVIEW" className="text-[10px] font-semibold">IN REVIEW</SelectItem>
                    <SelectItem value="DONE" className="text-[10px] font-semibold">DONE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogTitle className="text-xl font-bold text-foreground pr-8">
                {canEditTasks ? (
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={handleTitleKeyDown}
                    className="w-full bg-transparent border-b border-transparent hover:border-border/50 focus:border-primary focus:outline-none transition-colors"
                    placeholder="Task Title"
                  />
                ) : (
                  task?.title
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                Created by {task?.creator?.name} • {task?.createdAt && formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 grid md:grid-cols-5 overflow-hidden">
              {/* Main Column */}
              <div className="md:col-span-3 p-6 space-y-6 overflow-y-auto custom-scrollbar border-r border-border/30">
                {/* Description */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description</h4>
                  <div 
                    className={`text-sm leading-relaxed text-foreground bg-secondary/20 rounded-xl border border-border/30 overflow-hidden ${canEditTasks && !isEditingDesc ? 'cursor-pointer hover:bg-secondary/40' : ''}`}
                    onClick={() => canEditTasks && !isEditingDesc && setIsEditingDesc(true)}
                  >
                    {isEditingDesc ? (
                      <textarea
                        autoFocus
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        onBlur={handleDescBlur}
                        className="w-full min-h-[120px] bg-transparent p-4 resize-none focus:outline-none"
                        placeholder="Add a more detailed description..."
                      />
                    ) : (
                      <div className="p-4">
                        {task?.description || <span className="text-muted-foreground italic">No description provided for this task. {canEditTasks && "Click to add one."}</span>}
                      </div>
                    )}
                  </div>
                </div>

                <TaskSubtasks taskId={taskId} slug={slug!} subtasks={task?.subtasks || []} canEditTasks={canEditTasks} />
                <TaskAttachments taskId={taskId} slug={slug!} attachments={task?.attachments || []} canEditTasks={canEditTasks} />
                <TaskComments taskId={taskId} slug={slug!} comments={task?.comments || []} currentUser={currentUser} typingUser={typingUser} canEditTasks={canEditTasks} />
              </div>

              {/* Sidebar Column */}
              <TaskSidebar taskId={taskId} slug={slug!} task={task} members={members || []} currentUser={currentUser} canEditTasks={canEditTasks} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

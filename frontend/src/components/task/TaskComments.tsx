import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { socket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAddCommentMutation } from '@/services/task/task.queries';

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
});

interface TaskCommentsProps {
  taskId: string;
  slug: string;
  comments: any[];
  currentUser: any;
  typingUser: string | null;
  canEditTasks?: boolean;
}

export function TaskComments({ taskId, slug, comments, currentUser, typingUser }: TaskCommentsProps) {
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const form = useForm({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: '' },
  });

  const commentMutation = useAddCommentMutation(slug, taskId);

  const onSubmit = (values: { content: string }) => {
    commentMutation.mutate(values, {
      onSuccess: () => {
        form.reset();
        socket.emit('user:stopped-typing', { workspaceSlug: slug, taskId });
      }
    });
  };

  const handleTypingKeyPress = () => {
    if (!currentUser || !slug || !taskId) return;

    socket.emit('user:typing', {
      workspaceSlug: slug,
      taskId,
      userName: currentUser.name,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('user:stopped-typing', { workspaceSlug: slug, taskId });
    }, 2000);
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border/30">
      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <MessageSquare className="w-4 h-4 text-primary" /> Comments
      </h4>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-2"
      >
        <textarea
          placeholder="Write a comment..."
          {...form.register('content')}
          onKeyPress={handleTypingKeyPress}
          className="w-full min-h-[70px] rounded-lg border border-border/50 bg-background/50 p-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 placeholder:text-muted-foreground leading-relaxed resize-none"
        />
        <div className="flex justify-between items-center">
          <div className="text-[10px] text-muted-foreground italic h-4">
            {typingUser && `${typingUser} is typing...`}
          </div>
          <Button
            type="submit"
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-4"
            disabled={commentMutation.isPending}
          >
            {commentMutation.isPending ? 'Sending...' : 'Post Comment'}
          </Button>
        </div>
      </form>

      <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
        {comments && comments.length > 0 ? (
          comments.map((comm: any) => (
            <div key={comm.id} className="flex gap-3 bg-secondary/10 p-3 rounded-xl border border-border/20">
              <Avatar className="w-7 h-7 border border-border mt-0.5 shrink-0">
                <AvatarImage src={comm.user?.avatarUrl} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                  {comm.user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{comm.user?.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(comm.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-wrap leading-relaxed">
                  {comm.content}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-muted-foreground text-xs italic">
            No comments yet. Start the conversation.
          </div>
        )}
      </div>
    </div>
  );
}

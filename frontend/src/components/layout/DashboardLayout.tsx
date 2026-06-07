import { useEffect } from 'react';
import { Outlet, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { Bell, Sun, Moon, MessageSquare, ClipboardList, Check, Clock, Inbox } from 'lucide-react';
import { useTheme } from 'next-themes';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

import { Sidebar } from './Sidebar';
import { Button } from '@/components/ui/button';
import api from '../../lib/axios';
import { socket } from '../../lib/socket';
import { useAuthStore } from '../../store/auth.store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DashboardLayout = () => {
  const { slug } = useParams();
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Queries
  const {
    data: notifPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage

  } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.append('cursor', pageParam as string);

      const response = await api.get(`/notifications${pageParam ? `?${params.toString()}` : ''}`);
      return response.data.data;
    },
    getNextPageParam: (lastPage: any) => lastPage.nextCursor || undefined,
    initialPageParam: undefined,
    enabled: !!user,
  });

  const notifications = notifPages?.pages.flatMap((page: any) => page.data) || [];

  // Mutations
  const readAllMutation = useMutation({
    mutationFn: async () => {
      await api.put('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const readSingleMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Sockets listener for new notifications
  useEffect(() => {
    if (!user) return;

    const handleNewNotification = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [user, queryClient]);

  const unreadCount = notifications?.filter((n: any) => !n.isRead).length || 0;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return <ClipboardList className="w-4 h-4 text-primary" />;
      case 'TASK_COMMENT':
      case 'TASK_COMMENTED':
      case 'TASK_MENTIONED':
        return <MessageSquare className="w-4 h-4 text-indigo-400" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-8 top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold text-lg tracking-tight capitalize text-foreground">
              {slug?.replace('-', ' ')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            {/* Notifications Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-secondary hover:text-foreground relative">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 border-border/50 bg-card/95 backdrop-blur-xl" align="end">
                <div className="flex items-center justify-between p-3">
                  <span className="text-xs font-bold text-foreground">Notifications</span>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      onClick={() => readAllMutation.mutate()}
                      className="h-auto p-0.5 text-[10px] font-semibold text-primary hover:text-primary/95 flex items-center gap-1 hover:bg-transparent"
                    >
                      <Check className="w-3 h-3" /> Mark all read
                    </Button>
                  )}
                </div>
                <DropdownMenuSeparator className="bg-border/50" />

                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  {notifications && notifications.length > 0 ? (
                    <>
                      {notifications.map((n: any) => (
                        <DropdownMenuItem
                          key={n.id}
                          onClick={() => !n.isRead && readSingleMutation.mutate(n.id)}
                          className={cn(
                            "flex gap-3 p-3 text-xs leading-normal cursor-pointer border-b border-border/20 last:border-b-0",
                            "focus:bg-secondary/60 hover:bg-secondary/60 focus:text-foreground",
                            !n.isRead ? 'bg-primary/5 font-medium text-foreground' : 'text-muted-foreground'
                          )}
                        >
                          <div className="w-7 h-7 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0 border border-border/30">
                            {getNotificationIcon(n.type)}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="font-semibold text-foreground truncate">{n.title}</p>
                            <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{n.message}</p>
                            <p className="text-[9px] text-muted-foreground/60 flex items-center gap-1 mt-1 font-medium">
                              <Clock className="w-2.5 h-2.5" />
                              {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          {!n.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 self-center" />
                          )}
                        </DropdownMenuItem>
                      ))}
                      {hasNextPage && (
                        <div className="p-3 flex justify-center border-t border-border/20">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              fetchNextPage();
                            }}
                            disabled={isFetchingNextPage}
                            className="h-auto p-1 text-xs text-muted-foreground hover:text-primary hover:bg-transparent"
                          >
                            {isFetchingNextPage ? "Loading..." : "Load older notifications"}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <Inbox className="w-8 h-8 text-muted-foreground/40 mb-2" />
                      <span className="text-[10px] font-medium">All caught up!</span>
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-background p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

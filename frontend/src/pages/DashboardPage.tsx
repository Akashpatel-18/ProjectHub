import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  FolderKanban,
  CheckCircle2,
  ListTodo,
  Users,
  TrendingUp,
  Activity,
  Clock,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useProjectsQuery } from '@/services/project/project.queries';
import { useTasksQuery } from '@/services/task/task.queries';
import { useWorkspaceMembersQuery } from '@/services/member/member.queries';
import { useWorkspaceActivityQuery } from '@/services/activity/activity.queries';
import { StatsCard } from '@/components/cards/StatsCard';
import { useAuthStore } from '../store/auth.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const { slug } = useParams();
  const { user } = useAuthStore();

  // Queries
  const { data: projectsData, isLoading: loadingProjects } = useProjectsQuery(slug);
  const { data: tasksData, isLoading: loadingTasks } = useTasksQuery(slug);
  const { data: membersData, isLoading: loadingMembers } = useWorkspaceMembersQuery(slug);
  const {
    data: activityPages,
    isLoading: loadingActivity,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useWorkspaceActivityQuery(slug);

  const activityData = activityPages?.pages.flatMap((page: any) => page.data.data) || [];

  const isLoading = loadingProjects || loadingTasks || loadingMembers || loadingActivity;

  // Calculate statistics
  const totalProjects = projectsData?.length || 0;

  // My Tasks (assigned to current user)
  const myTasks = tasksData?.filter((t: any) => t.assigneeId === user?.id && t.status !== 'DONE') || [];
  const myTasksCount = myTasks.length;

  // Tasks Due Today (from accessible tasks)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tasksDueToday = tasksData?.filter((t: any) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due.getTime() === today.getTime();
  }).length || 0;

  // Completed Tasks (for current user)
  const completedTasks = myTasks.filter((t: any) => t.status === 'DONE').length || 0;

  // Dynamic Greeting based on time of day
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 w-48 bg-muted rounded-md" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-card/50 border border-border/50 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <div className="h-[400px] md:col-span-4 bg-card/50 border border-border/50 rounded-xl" />
          <div className="h-[400px] md:col-span-3 bg-card/50 border border-border/50 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header / Welcome Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            {getGreeting()}, {user?.name}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Here's what is happening in your workspace today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
            <Link to={`/w/${slug}/projects`}>
              <Plus className="w-4 h-4 mr-2" /> New Project
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="My Projects"
          value={totalProjects}
          description={<span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Accessible projects</span>}
          icon={FolderKanban}
          iconBgClass="bg-primary/10 border-primary/20"
          iconColorClass="text-primary"
        />
        <StatsCard
          title="My Tasks"
          value={myTasksCount}
          description="Assigned to you"
          icon={ListTodo}
          iconBgClass="bg-indigo-500/10 border-indigo-500/20"
          iconColorClass="text-indigo-400"
        />
        <StatsCard
          title="Tasks Due Today"
          value={tasksDueToday}
          description="Deadlines for today"
          icon={Clock}
          iconBgClass="bg-emerald-500/10 border-emerald-500/20"
          iconColorClass="text-emerald-400"
        />
        <StatsCard
          title="Completed Tasks"
          value={completedTasks}
          description="Tasks you have finished"
          icon={CheckCircle2}
          iconBgClass="bg-pink-500/10 border-pink-500/20"
          iconColorClass="text-pink-400"
        />
      </div>

      {/* Main Grid: Projects & Activity */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Projects Overview */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-xl md:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Recent Projects</CardTitle>
              <CardDescription>A list of active initiatives in this workspace.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-primary hover:bg-primary/10 hover:text-primary">
              <Link to={`/w/${slug}/projects`}>
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-4">
              {projectsData && projectsData.length > 0 ? (
                projectsData.slice(0, 5).map((project: any) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-card/25 hover:border-border transition-colors duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary">
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground hover:underline">
                          <Link to={`/w/${slug}/projects/${project.id}/board`}>{project.name}</Link>
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">{project.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground uppercase font-medium">
                        {project.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {project._count?.tasks || 0} tasks
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/50 rounded-lg bg-card/10">
                  <FolderKanban className="w-8 h-8 text-muted-foreground mb-3" />
                  <p className="font-medium text-sm">No projects created yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">Get started by making your first project inside this workspace.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity Stream */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-xl md:col-span-3">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg font-bold">Activity Feed</CardTitle>
            </div>
            <CardDescription>Real-time log of workspace activities.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="relative pl-4 border-l border-border/50 space-y-6 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {activityData && activityData.length > 0 ? (
                <>
                  {activityData.map((log: any) => {
                    let logDetails = { title: '', desc: '' };
                    try {
                      const metadata = log.metadata ? JSON.parse(log.metadata) : {};
                      switch (log.action) {
                        case 'TASK_CREATED':
                          logDetails = { title: 'Created task', desc: `"${metadata.title || log.task?.title || 'Unknown Task'}"` };
                          break;
                        case 'TASK_UPDATED':
                          logDetails = { title: 'Updated task', desc: log.task?.title ? `"${log.task.title}"` : 'Task details updated' };
                          break;
                        case 'MEMBER_INVITED':
                          logDetails = { title: 'Invited user', desc: `${metadata.email} as ${metadata.role}` };
                          break;
                        case 'MEMBER_JOINED':
                          logDetails = { title: 'Collaborator joined', desc: metadata.email };
                          break;
                        case 'PROJECT_CREATED':
                          logDetails = { title: 'Created project', desc: `"${metadata.name}"` };
                          break;
                        case 'WORKSPACE_CREATED':
                          logDetails = { title: 'Created workspace', desc: `"${metadata.name}"` };
                          break;
                        default:
                          logDetails = { title: log.action.replace('_', ' ').toLowerCase(), desc: '' };
                      }
                    } catch (e) {
                      logDetails = { title: log.action.replace('_', ' ').toLowerCase(), desc: '' };
                    }

                    return (
                      <div key={log.id} className="relative group">
                        {/* Bullet marker */}
                        <span className="absolute -left-[21px] top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-primary/70 ring-4 ring-background" />

                        <div className="flex gap-3">
                          <Avatar className="w-6 h-6 border border-border">
                            <AvatarImage src={log.actor?.avatarUrl} />
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {log.actor?.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground">
                              {log.actor?.name}{' '}
                              <span className="font-normal text-muted-foreground">{logDetails.title}</span>
                            </p>
                            {logDetails.desc && (
                              <p className="text-xs text-muted-foreground mt-0.5 font-medium">{logDetails.desc}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mt-1 font-medium">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {hasNextPage && (
                    <div className="pt-2 flex justify-center relative z-10">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        className="text-xs bg-card/50"
                      >
                        {isFetchingNextPage ? "Loading..." : "Load more"}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-l-0 -ml-4">
                  <Activity className="w-6 h-6 text-muted-foreground/50 mb-2" />
                  <p className="text-xs font-medium">No activity logged yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

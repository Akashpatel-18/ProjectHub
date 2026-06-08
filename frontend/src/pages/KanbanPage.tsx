import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FolderKanban, Loader2, Grid, Users, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { useProjectsQuery } from '@/services/project/project.queries';
import { useTasksQuery, useUpdateTaskMutation, useDeleteTaskMutation } from '@/services/task/task.queries';
import { useWorkspaceMembersQuery, useProjectMembersQuery } from '@/services/member/member.queries';
import { useWorkspaceRolesQuery } from '@/services/workspace/workspace.queries';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useProjectRole } from '@/hooks/useProjectRole';
import { useWorkspaceSocket } from '@/hooks/useWorkspaceSocket';

import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { CreateTaskModal } from '@/components/modals/CreateTaskModal';
import TaskDetailsModal from '@/components/task/TaskDetailsModal';
import { ProjectMembersTab } from '@/components/project/ProjectMembersTab';

type Tab = 'kanban' | 'members';

export default function KanbanPage() {
  const { slug, projectId } = useParams();
  const { user: currentUser } = useAuthStore();

  const { isOwner: isWorkspaceOwner } = useWorkspaceRole();
  const {
    canCreateTasks,
    canEditTasks,
    canDeleteAnyTask,
    canDeleteOwnTasks,
    canManageProjectMembers,
    isProjectAdmin,
  } = useProjectRole(projectId);

  // Hook for real-time task updates
  useWorkspaceSocket(slug, projectId);

  const [activeTab, setActiveTab] = useState<Tab>('kanban');
  const [openCreate, setOpenCreate] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: projects, isLoading: loadingProject } = useProjectsQuery(slug!);
  const project = projects?.find((p: any) => p.id === projectId);

  const { data: tasks, isLoading: loadingTasks } = useTasksQuery(slug!, projectId);
  const { data: workspaceMembers } = useWorkspaceMembersQuery(slug!);
  const { data: projectMembers, isLoading: loadingProjectMembers } = useProjectMembersQuery(slug!, projectId);
  const { data: roles } = useWorkspaceRolesQuery(slug!);

  const projectRoles = roles?.filter((r: any) => ['Admin', 'Member', 'Guest'].includes(r.name)) ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateTaskMutation = useUpdateTaskMutation(slug!);
  const deleteTaskMutation = useDeleteTaskMutation(slug!, projectId!);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleUpdateStatus = (taskId: string, status: string) => {
    const task = tasks?.find((t: any) => t.id === taskId);
    if (!task || task.status === status) return;
    updateTaskMutation.mutate({ taskId, data: { status } });
  };

  const handleDeleteTask = (taskId: string, title: string) => {
    if (confirm(`Are you sure you want to delete task "${title}"?`)) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  if (loadingProject || loadingTasks || loadingProjectMembers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <FolderKanban className="w-12 h-12 text-muted-foreground/50" />
        <div>
          <h2 className="text-xl font-bold">Project not found</h2>
          <p className="text-muted-foreground mt-1">The project might have been deleted or you don't have access.</p>
        </div>
        <Button asChild variant="outline">
          <Link to={`/w/${slug}/projects`}>Return to Projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] sm:h-[calc(100vh-128px)] animate-in fade-in duration-500">
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{project.name}</h2>
            <p className="text-muted-foreground text-xs mt-1 leading-none">
              {project.description || 'No description provided.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canCreateTasks && (
            <Button
              size="sm"
              onClick={() => setOpenCreate(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" /> New Task
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="bg-secondary/40 border-border/50 hover:bg-secondary hover:text-foreground text-xs h-9">
            <Link to={`/w/${slug}/projects`}>All Boards</Link>
          </Button>
        </div>
      </div>

      {/* ── TAB SWITCHER ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-border/40 shrink-0 mb-4 sm:mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('kanban')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors duration-150',
            activeTab === 'kanban' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Grid className="w-4 h-4" />
          Kanban
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors duration-150',
            activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Users className="w-4 h-4" />
          Members
          {projectMembers && (
            <Badge variant="secondary" className="text-[10px] font-semibold bg-secondary/50 border border-border/30 py-0 px-1.5">
              {projectMembers.length}
            </Badge>
          )}
        </button>
      </div>

      {/* ── TABS ──────────────────────────────────────────────────────── */}
      {activeTab === 'kanban' && (
        <KanbanBoard
          tasks={tasks || []}
          canCreateTasks={canCreateTasks}
          canEditTasks={canEditTasks}
          canDeleteAnyTask={canDeleteAnyTask}
          canDeleteOwnTasks={canDeleteOwnTasks}
          currentUser={currentUser}
          onAddTask={() => setOpenCreate(true)}
          onTaskClick={setSelectedTaskId}
          onUpdateStatus={handleUpdateStatus}
          onDeleteTask={handleDeleteTask}
        />
      )}

      {activeTab === 'members' && (
        <ProjectMembersTab
          slug={slug!}
          projectId={projectId!}
          projectMembers={projectMembers || []}
          workspaceMembers={workspaceMembers || []}
          projectRoles={projectRoles}
          currentUser={currentUser}
          isWorkspaceOwner={isWorkspaceOwner}
          canManageProjectMembers={canManageProjectMembers}
          isProjectAdmin={isProjectAdmin}
        />
      )}

      {/* ── MODALS ───────────────────────────────────────────────────────────── */}
      {canCreateTasks && (
        <CreateTaskModal
          slug={slug!}
          projectId={projectId!}
          open={openCreate}
          onOpenChange={setOpenCreate}
          projectMembers={workspaceMembers || []}
        />
      )}

      {selectedTaskId && (
        <TaskDetailsModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}

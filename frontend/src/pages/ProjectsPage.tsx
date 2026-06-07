import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Calendar,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProjectsQuery, useDeleteProjectMutation } from '@/services/project/project.queries';
import { CreateProjectModal } from '@/components/modals/CreateProjectModal';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';

export default function ProjectsPage() {
  const { slug } = useParams();
  const { user: currentUser } = useAuthStore();
  const { canManageProjects, isOwner, isAdmin } = useWorkspaceRole();
  const [open, setOpen] = useState(false);

  // Queries & Mutations
  const { data: projects, isLoading } = useProjectsQuery(slug!);
  const deleteMutation = useDeleteProjectMutation(slug!);

  const handleDelete = (projectId: string) => {
    if (confirm('Are you sure you want to delete this project? This will remove all tasks as well.')) {
      deleteMutation.mutate(projectId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'PLANNING':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'PAUSED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'COMPLETED':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Projects</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your initiatives, roadmaps, and timelines.
          </p>
        </div>

        {/* New Project button — only for OWNER and ADMIN */}
        {canManageProjects && (
          <Button onClick={() => setOpen(true)} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4 mr-2" /> New Project
          </Button>
        )}
      </div>

      <CreateProjectModal slug={slug!} open={open} onOpenChange={setOpen} />

      {/* Projects Grid */}
      {projects && projects.length > 0 ? (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: any) => (
            <Card
              key={project.id}
              className="border-border/50 bg-card/30 backdrop-blur-xl hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary font-bold shrink-0">
                      {project.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base font-bold truncate hover:text-primary transition-colors">
                        <Link to={`/w/${slug}/projects/${project.id}/board`}>{project.name}</Link>
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(project.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-[10px] font-semibold border tracking-wider ${getStatusColor(project.status)}`}>
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-sm text-muted-foreground line-clamp-3 min-h-[60px] leading-relaxed">
                  {project.description || 'No description provided.'}
                </p>
                <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-muted-foreground bg-secondary/20 p-2.5 rounded-lg border border-border/30 w-fit">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>{project._count?.tasks || 0} active tasks</span>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/40 pt-4 pb-4 flex flex-row justify-between bg-card/10 rounded-b-xl gap-2">
                {/* Delete — OWNER can delete any; ADMIN can delete only their own */}
                {(isOwner || (isAdmin && project.createdById === currentUser?.id)) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-200"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this project? All associated tasks will be lost.')) {
                        deleteMutation.mutate(project.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                  </Button>
                )}

                <Button asChild size="sm" variant="ghost" className="text-primary hover:text-primary/90 hover:bg-primary/10">
                  <Link to={`/w/${slug}/projects/${project.id}/board`}>
                    Open Board <ExternalLink className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/50 rounded-2xl bg-card/10 max-w-lg mx-auto">
          <FolderKanban className="w-12 h-12 text-muted-foreground/60 mb-4" />
          <h3 className="text-lg font-bold">No projects yet</h3>
          <p className="text-muted-foreground text-sm mt-1.5 max-w-sm px-4">
            {canManageProjects
              ? 'Projects act as boards for organizing tasks, sprints, backlog, and comments. Create one now.'
              : 'You have not been added to any projects yet. Ask your workspace admin to add you.'}
          </p>
          {canManageProjects && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="mt-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
                  <Plus className="w-4 h-4 mr-2" /> Get Started
                </Button>
              </DialogTrigger>
            </Dialog>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  LogOut,
  ChevronDown,
  Plus,
  Building,
  Loader2,
  X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { cn } from '@/lib/utils';
import api from '../../lib/axios';
import { useAuthStore } from '../../store/auth.store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '../../hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '' },
  { icon: FolderKanban, label: 'Projects', path: '/projects' },
  { icon: Users, label: 'Team Members', path: '/team' },
];

const workspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters long.'),
  slug: z.string().min(2, 'Slug must be at least 2 characters long.')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and dashes.'),
});

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const [openCreate, setOpenCreate] = useState(false);

  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: '',
      slug: '',
    },
  });

  // Watch name to auto-fill slug
  const workspaceName = form.watch('name');
  useEffect(() => {
    if (workspaceName) {
      const generatedSlug = workspaceName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      form.setValue('slug', generatedSlug, { shouldValidate: true });
    }
  }, [workspaceName, form]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => document.body.classList.remove('overflow-hidden');
  }, [isOpen]);

  // Fetch workspaces
  const { data: workspaces, isLoading: loadingWorkspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const response = await api.get('/workspaces');
      return response.data.data;
    },
  });

  // Create workspace mutation
  const createWorkspaceMutation = useMutation({
    mutationFn: async (values: WorkspaceFormValues) => {
      const response = await api.post('/workspaces', values);
      return response.data.data;
    },
    onSuccess: (newWorkspace) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setOpenCreate(false);
      form.reset();
      toast({
        title: 'Workspace Created',
        description: `Welcome to your new "${newWorkspace.name}" workspace!`,
      });
      navigate(`/w/${newWorkspace.slug}`);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: error.response?.data?.message || 'Something went wrong.',
      });
    },
  });

  const handleCreateWorkspace = (values: WorkspaceFormValues) => {
    createWorkspaceMutation.mutate(values);
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const handleNavClick = () => {
    // Close sidebar on mobile when a nav link is clicked
    if (onClose) onClose();
  };

  const currentWorkspace = workspaces?.find((w: any) => w.slug === slug);

  const sidebarContent = (
    <>
      {/* Workspace Switcher */}
      <div className="h-16 flex items-center px-4 border-b border-border shrink-0">
        {loadingWorkspaces ? (
          <div className="flex items-center gap-3 px-2">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground">Loading workspaces...</span>
          </div>
        ) : (
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-between w-full p-2 hover:bg-secondary/50 rounded-lg transition-colors border border-transparent hover:border-border/30 text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center font-bold text-primary shrink-0 text-sm">
                      {currentWorkspace?.name?.charAt(0).toUpperCase() || slug?.charAt(0).toUpperCase() || 'W'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-xs text-foreground truncate leading-none">
                        {currentWorkspace?.name || slug || 'Workspace'}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate font-medium mt-0.5">
                        {currentWorkspace?.role || 'Member'}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 border-border/50 bg-card/95 backdrop-blur-xl" align="start">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold">
                  Switch Workspace
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/50" />

                {workspaces && workspaces.map((w: any) => (
                  <DropdownMenuItem
                    key={w.id}
                    className="flex items-center justify-between font-medium cursor-pointer"
                    onClick={() => { navigate(`/w/${w.slug}`); handleNavClick(); }}
                  >
                    <span className="truncate">{w.name}</span>
                    {w.slug === slug && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator className="bg-border/50" />

                <DialogTrigger asChild>
                  <DropdownMenuItem className="text-primary hover:text-primary/95 font-semibold cursor-pointer flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Create Workspace
                  </DropdownMenuItem>
                </DialogTrigger>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Creation Dialog */}
            <DialogContent className="border-border/50 bg-card/95 backdrop-blur-xl">
              <DialogHeader>
                <DialogTitle>Create Workspace</DialogTitle>
                <DialogDescription>
                  Enter workspace details to set up your new project hub.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={form.handleSubmit(handleCreateWorkspace)} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Workspace Name</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Acme Corporation"
                      {...form.register('name')}
                      className="pl-9 bg-background/50 border-border/50"
                    />
                  </div>
                  {form.formState.errors.name && (
                    <p className="text-xs font-medium text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Workspace URL Slug</label>
                  <div className="flex rounded-md border border-input bg-background/50 border-border/50 overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <span className="bg-secondary/40 text-muted-foreground text-xs flex items-center px-3 border-r border-border/50 font-semibold select-none">
                      /w/
                    </span>
                    <Input
                      {...form.register('slug')}
                      placeholder="acme-corp"
                      className="border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 h-10 w-full"
                    />
                  </div>
                  {form.formState.errors.slug && (
                    <p className="text-xs font-medium text-destructive">{form.formState.errors.slug.message}</p>
                  )}
                </div>

                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setOpenCreate(false)}
                    disabled={createWorkspaceMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                    disabled={createWorkspaceMutation.isPending}
                  >
                    {createWorkspaceMutation.isPending ? 'Creating...' : 'Create Workspace'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider px-2">
          Menu
        </div>
        {navItems.map((item) => {
          const to = `/w/${slug}${item.path}`;
          return (
            <NavLink
              key={item.path}
              to={to}
              end={item.path === ''}
              onClick={handleNavClick}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          );
        })}
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-border bg-secondary/30 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full outline-none">
            <div className="flex items-center gap-3 p-2 hover:bg-secondary/50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-border/50">
              <Avatar className="w-9 h-9 border border-border">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0 text-left">
                <span className="text-sm font-medium truncate leading-none text-foreground">{user?.name}</span>
                <span className="text-[10px] text-muted-foreground truncate font-medium mt-1">{user?.email}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[230px] border-border/50 bg-card/95 backdrop-blur-xl mb-2" align="center">
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem
              className="text-xs font-semibold text-red-500 hover:text-red-400 focus:text-red-400 focus:bg-destructive/10 cursor-pointer flex items-center gap-2"
              onClick={handleLogout}
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar — static, always visible on lg+ */}
      <aside className="hidden lg:flex w-64 border-r border-border bg-card flex-col h-full text-card-foreground shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile/Tablet Sidebar — overlay with backdrop */}
      {/* Backdrop */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-40 bg-black/60 sidebar-overlay",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sidebar Panel */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-card flex flex-col h-full text-card-foreground shadow-2xl sidebar-panel pointer-events-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile close button */}
        <button
          className="absolute top-4 right-4 z-10 p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}

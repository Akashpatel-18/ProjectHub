import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Rocket, LogOut, Loader2, Link2 } from 'lucide-react';

import api from '../lib/axios';
import { useAuthStore } from '../store/auth.store';
import { useToast } from '../hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const workspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters long.'),
  slug: z.string().min(2, 'Slug must be at least 2 characters long.')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and dashes.'),
});

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  
  const [joinToken, setJoinToken] = useState('');

  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: '',
      slug: '',
    },
  });

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

  const createWorkspaceMutation = useMutation({
    mutationFn: async (values: WorkspaceFormValues) => {
      const response = await api.post('/workspaces', values);
      return response.data.data;
    },
    onSuccess: (newWorkspace) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
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

  const handleJoinWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinToken.trim()) return;
    
    // Extract token if they pasted a full URL
    let token = joinToken.trim();
    if (token.includes('/invite/')) {
      const parts = token.split('/invite/');
      token = parts[parts.length - 1].split('?')[0].replace('/', '');
    }
    
    navigate(`/invite/${token}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 backdrop-blur-sm">
            <Rocket className="w-6 h-6 text-primary" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-foreground">
          Welcome, {user?.name?.split(' ')[0]}!
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Let's get you set up. Choose an option below to start collaborating.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10 grid gap-6 px-4 sm:px-0">
        
        {/* Create Workspace Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle>Create a New Workspace</CardTitle>
            <CardDescription>
              Start a brand new workspace for your organization. You will be the owner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateWorkspace)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workspace Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corp" className="bg-background/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workspace URL</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <span className="px-3 py-2 bg-secondary/50 border border-r-0 border-border rounded-l-md text-muted-foreground text-sm shrink-0">
                            app.com/w/
                          </span>
                          <Input className="rounded-l-none bg-background/50 focus-visible:ring-offset-0 focus-visible:z-10" placeholder="acme-corp" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createWorkspaceMutation.isPending}
                >
                  {createWorkspaceMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Rocket className="w-4 h-4 mr-2" />
                  )}
                  Create Workspace
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Join Workspace Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-xl">
          <CardHeader>
            <CardTitle>Join an Existing Workspace</CardTitle>
            <CardDescription>
              Have an invite link? Paste it below to join your team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinWorkspace} className="flex gap-3">
              <Input 
                placeholder="Paste invite link or token..." 
                className="bg-background/50 flex-1" 
                value={joinToken}
                onChange={(e) => setJoinToken(e.target.value)}
              />
              <Button type="submit" variant="secondary" disabled={!joinToken.trim()}>
                <Link2 className="w-4 h-4 mr-2" />
                Join
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Logout Option */}
        <div className="flex justify-center mt-2 pb-8">
          <Button variant="ghost" className="text-muted-foreground" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>

      </div>
    </div>
  );
}

import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, Rocket, ShieldAlert, ArrowRight, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import api from '../lib/axios';
import { useAuthStore } from '../store/auth.store';
import { useToast } from '../hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const signupSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

export default function InviteAcceptPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, setAuth } = useAuthStore();

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', password: '' },
  });

  // Query invitation details (now unauthenticated endpoint!)
  const { data: invite, isLoading, error } = useQuery({
    queryKey: ['invite-details', token],
    queryFn: async () => {
      const response = await api.get(`/workspaces/invites/${token}`);
      return response.data.data;
    },
    enabled: !!token,
    retry: false,
  });

  // Accept mutation (when user is ALREADY authenticated and their email matches)
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/workspaces/invites/${token}/accept`);
      return response.data.data;
    },
    onSuccess: () => {
      toast({
        title: 'Invitation Accepted',
        description: `You are now a member of ${invite?.workspace?.name || 'the workspace'}!`,
      });
      navigate(`/w/${invite?.workspace?.slug}`);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to Join',
        description: error.response?.data?.message || 'Something went wrong.',
      });
    },
  });

  // Registration mutation (when user does NOT exist, we register and it auto-accepts invite on backend)
  const registerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof signupSchema>) => {
      const response = await api.post('/auth/signup', {
        name: data.name,
        password: data.password,
        email: invite?.email, // We get email from the invite itself
        inviteToken: token,   // Important: Backend uses this to auto-join workspace
      });
      return response.data;
    },
    onSuccess: (data) => {
      setAuth(data.data.user, data.data.token);
      toast({
        title: 'Account Created & Workspace Joined',
        description: "Welcome! You've successfully set up your account and joined the workspace.",
      });
      navigate(`/w/${invite?.workspace?.slug}`);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: error.response?.data?.message || 'Something went wrong.',
      });
    },
  });

  const handleJoin = () => {
    if (isAuthenticated) {
      acceptMutation.mutate();
    } else if (invite?.userExists) {
      // User has an account, but is not logged in
      sessionStorage.setItem('pending_invite_token', token as string);
      navigate(`/auth?email=${encodeURIComponent(invite?.email || '')}`);
    }
  };

  const handleRegisterSubmit = (data: z.infer<typeof signupSchema>) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden text-foreground">
      {/* Background radial effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-sm text-muted-foreground font-medium">Verifying invitation token...</span>
        </div>
      ) : error ? (
        <Card className="w-full max-w-md relative z-10 border-destructive/20 bg-card/45 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-3 text-center pt-8">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center border border-destructive/20 mb-2">
              <ShieldAlert className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              Invitation Invalid
            </CardTitle>
            <CardDescription className="text-xs">
              This invitation link is expired, already used, or invalid.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8 text-center text-sm text-muted-foreground leading-relaxed px-6">
            Please ask the workspace administrator to send you a new invitation link.
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/30 pt-4 pb-6 bg-card/10">
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link to="/auth">Go to Sign In</Link>
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="w-full max-w-md relative z-10 border-border/50 bg-card/45 backdrop-blur-xl shadow-2xl animate-in zoom-in-95 duration-300">
          <CardHeader className="space-y-3 text-center pt-8">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 mb-2">
              {(!isAuthenticated && !invite?.userExists) ? <UserPlus className="w-6 h-6 text-primary" /> : <Rocket className="w-6 h-6 text-primary" />}
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              {(!isAuthenticated && !invite?.userExists) ? 'Set Password to Join' : 'Workspace Invitation'}
            </CardTitle>
            <CardDescription className="text-xs">
              You've been invited to join a collaborative workspace!
            </CardDescription>
          </CardHeader>

          <CardContent className="pb-6 text-center space-y-4 px-6">
            <div className="bg-secondary/35 p-4 rounded-xl border border-border/35 space-y-1">
              <p className="text-xs text-muted-foreground font-medium">WORKSPACE NAME</p>
              <h3 className="text-lg font-bold text-foreground">{invite?.workspace?.name}</h3>
              <p className="text-[10px] text-muted-foreground font-mono mt-1">/w/{invite?.workspace?.slug}</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed leading-5">
              <span className="font-semibold text-foreground">{invite?.invitedBy?.name}</span> has invited you to collaborate.
              {(!isAuthenticated && !invite?.userExists) && ' Set a name and password for your new account to join immediately.'}
            </p>
            
            {/* Inline Registration Form */}
            {(!isAuthenticated && !invite?.userExists) && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleRegisterSubmit)} className="space-y-4 pt-4 text-left">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Email</p>
                    <Input disabled value={invite?.email} className="bg-muted text-muted-foreground" />
                  </div>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} className="bg-background/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} className="bg-background/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 font-semibold text-xs py-5 mt-4"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating Account...</>
                    ) : (
                      <>Set Password & Join <ArrowRight className="w-4 h-4 ml-1.5" /></>
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>

          {(isAuthenticated || invite?.userExists) && (
            <CardFooter className="flex flex-col border-t border-border/35 pt-4 pb-6 bg-card/10 gap-3">
              <Button
                onClick={handleJoin}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 font-semibold text-xs py-5"
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Joining...
                  </>
                ) : isAuthenticated ? (
                  <>
                    Accept & Join Workspace <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                ) : (
                  <>
                    Log In to Accept <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </Button>
              {isAuthenticated ? (
                <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                  <Link to="/auth">Logged in as {invite?.email}</Link>
                </Button>
              ) : (
                <div className="text-center text-xs text-muted-foreground mt-1">
                  You already have an account. Please log in to continue.
                </div>
              )}
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Briefcase, Mail, Eye, EyeOff } from 'lucide-react';

import api from '../lib/axios';
import { useAuthStore } from '../store/auth.store';
import { useToast } from '../hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

const signupSchema = loginSchema.extend({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
});

const forgotSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
});

type AuthMode = 'login' | 'signup' | 'forgot-password';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const defaultEmail = searchParams.get('email') || '';

  const [mode, setMode] = useState<AuthMode>(defaultEmail ? 'signup' : 'login');
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: defaultEmail, password: '' },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: defaultEmail, password: '' },
  });

  const forgotForm = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: defaultEmail },
  });

  const handleSuccessRedirect = () => {
    const pendingToken = sessionStorage.getItem('pending_invite_token');
    if (pendingToken) {
      sessionStorage.removeItem('pending_invite_token');
      navigate(`/invite/${pendingToken}`);
    } else {
      navigate('/');
    }
  };

  // Mutations
  const loginMutation = useMutation({
    mutationFn: async (data: z.infer<typeof loginSchema>) => {
      const response = await api.post('/auth/login', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.clear();
      setAuth(data.data.user, data.data.token);
      toast({
        title: 'Welcome back!',
        description: "You've successfully signed into your workspace.",
      });
      handleSuccessRedirect();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: error.response?.data?.message || 'Invalid credentials. Please try again.',
      });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: z.infer<typeof signupSchema>) => {
      const response = await api.post('/auth/signup', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.clear();
      setAuth(data.data.user, data.data.token);
      toast({
        title: 'Account Created',
        description: "Your collaborator account has been successfully initialized.",
      });
      handleSuccessRedirect();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: error.response?.data?.message || 'Something went wrong.',
      });
    },
  });

  const forgotMutation = useMutation({
    mutationFn: async (data: z.infer<typeof forgotSchema>) => {
      const response = await api.post('/auth/forgot-password', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Recovery Email Dispatched',
        description: data.message || 'Check your inbox for a password reset token.',
      });
      setMode('login');
      forgotForm.reset();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Dispatch Failed',
        description: error.response?.data?.message || 'Could not send recovery link.',
      });
    },
  });

  const handleLoginSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  const handleSignupSubmit = (data: z.infer<typeof signupSchema>) => {
    signupMutation.mutate(data);
  };

  const handleForgotSubmit = (data: z.infer<typeof forgotSchema>) => {
    forgotMutation.mutate(data);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden text-foreground">
      {/* Dynamic theme background radial gradients */}
      {/* <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-accent/10 blur-[120px] pointer-events-none" /> */}

      <Card className="w-full max-w-md relative z-10 border-border/50 bg-card/45 backdrop-blur-xl shadow-2xl animate-in zoom-in-95 duration-300">
        <CardHeader className="space-y-3 text-center pt-8">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 mb-2">
            <Briefcase className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {mode === 'login' && 'Sign in to ProjectHub'}
            {mode === 'signup' && 'Create an account'}
            {mode === 'forgot-password' && 'Recover Password'}
          </CardTitle>
          <CardDescription className="text-xs">
            {mode === 'login' && 'Enter your email to sign in to your workspace'}
            {mode === 'signup' && 'Enter your details below to create your account'}
            {mode === 'forgot-password' && 'Request a secure verification link to update credentials'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8 px-6">
          {mode === 'login' && (
            <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Email Address</label>
                <Input 
                  placeholder="name@company.com" 
                  type="email" 
                  {...loginForm.register('email')} 
                  className="bg-background/50 border-border/50 text-xs h-9" 
                />
                {loginForm.formState.errors.email && (
                  <p className="text-[10px] font-medium text-destructive">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium leading-none">Password</label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot-password')}
                    className="text-xs text-primary hover:underline font-semibold transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input 
                    placeholder="••••••••" 
                    type={showPassword ? "text" : "password"} 
                    {...loginForm.register('password')} 
                    className="bg-background/50 border-border/50 text-xs h-9 pr-10" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-[10px] font-medium text-destructive">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 font-semibold text-xs py-5"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={signupForm.handleSubmit(handleSignupSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Full Name</label>
                <Input 
                  placeholder="John Doe" 
                  {...signupForm.register('name')} 
                  className="bg-background/50 border-border/50 text-xs h-9" 
                />
                {signupForm.formState.errors.name && (
                  <p className="text-[10px] font-medium text-destructive">{signupForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Email Address</label>
                <Input 
                  placeholder="name@company.com" 
                  type="email" 
                  {...signupForm.register('email')} 
                  className="bg-background/50 border-border/50 text-xs h-9" 
                />
                {signupForm.formState.errors.email && (
                  <p className="text-[10px] font-medium text-destructive">{signupForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Password</label>
                <div className="relative">
                  <Input 
                    placeholder="••••••••" 
                    type={showPassword ? "text" : "password"} 
                    {...signupForm.register('password')} 
                    className="bg-background/50 border-border/50 text-xs h-9 pr-10" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {signupForm.formState.errors.password && (
                  <p className="text-[10px] font-medium text-destructive">{signupForm.formState.errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 font-semibold text-xs py-5"
                disabled={signupMutation.isPending}
              >
                {signupMutation.isPending ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          )}

          {mode === 'forgot-password' && (
            <form onSubmit={forgotForm.handleSubmit(handleForgotSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Verify Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="collaborator@company.com" 
                    {...forgotForm.register('email')} 
                    className="pl-9 bg-background/50 border-border/50 text-xs h-9" 
                  />
                </div>
                {forgotForm.formState.errors.email && (
                  <p className="text-[10px] font-medium text-destructive">{forgotForm.formState.errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 font-semibold text-xs py-5"
                disabled={forgotMutation.isPending}
              >
                {forgotMutation.isPending ? 'Dispatching link...' : 'Send Recovery Link'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode('login')}
                className="w-full font-semibold text-xs py-5 text-muted-foreground hover:text-foreground"
              >
                Back to Sign In
              </Button>
            </form>
          )}

          {mode !== 'forgot-password' && (
            <div className="mt-6 text-center text-xs font-semibold text-muted-foreground">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                }}
                className="text-primary hover:underline font-bold transition-colors ml-1"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

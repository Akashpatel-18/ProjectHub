import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Rocket, ShieldAlert, CheckCircle } from 'lucide-react';

import api from '../lib/axios';
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

const resetSchema = z.object({
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string().min(6, { message: 'Confirm password must be at least 6 characters' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetFormValues = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get('token');

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (values: ResetFormValues) => {
      const response = await api.post('/auth/reset-password', {
        token,
        password: values.password,
      });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Password Reset Successful',
        description: 'You can now sign in with your new password.',
      });
      navigate('/auth');
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Reset Failed',
        description: error.response?.data?.message || 'Token is invalid or has expired.',
      });
    },
  });

  const onSubmit = (values: ResetFormValues) => {
    if (!token) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Missing password reset token in URL link.',
      });
      return;
    }
    resetMutation.mutate(values);
  };

  if (!token) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden text-foreground">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <Card className="w-full max-w-md relative z-10 border-destructive/20 bg-card/45 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-3 text-center pt-8">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center border border-destructive/20 mb-2">
              <ShieldAlert className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">
              Link is Invalid
            </CardTitle>
            <CardDescription className="text-xs">
              This password reset link is missing a verification token.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8 text-center text-xs text-muted-foreground leading-relaxed px-6">
            Please check your email client or request a new reset link from the login page.
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/30 pt-4 pb-6 bg-card/10">
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link to="/auth">Go to Sign In</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden text-foreground">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md relative z-10 border-border/50 bg-card/45 backdrop-blur-xl shadow-2xl animate-in zoom-in-95 duration-300">
        <CardHeader className="space-y-3 text-center pt-8">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 mb-2">
            <Rocket className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Reset Password
          </CardTitle>
          <CardDescription className="text-xs">
            Enter your new secure account password below.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8 px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" type="password" {...field} className="bg-background/50 border-border/50 text-xs h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" type="password" {...field} className="bg-background/50 border-border/50 text-xs h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 font-semibold text-xs py-5"
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? 'Updating password...' : 'Update Password'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

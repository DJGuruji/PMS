'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

import { useRecaptcha } from '@/hooks/useRecaptcha';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { executeRecaptcha } = useRecaptcha();

  useEffect(() => {
    const checkUser = async () => {
      if (!useAuthStore.getState().user) {
        try {
          const { data } = await api.get('/auth/me');
          setAuth(data, '');
          router.push('/dashboard');
        } catch (e) {
          // No session
        }
      } else {
        router.push('/dashboard');
      }
    };
    checkUser();
  }, [setAuth, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!executeRecaptcha) {
      toast.error('reCAPTCHA not initialized');
      return;
    }

    setIsLoading(true);

    try {
      const recaptchaToken = await executeRecaptcha('login');
      const { data } = await api.post('/auth/login', { email, password, recaptchaToken });
      setAuth(data.user, data.accessToken);
      toast.success('Login successful');
      router.push('/dashboard');
    } catch (err: any) {
      const apiError = err.response?.data?.error || 'Invalid credentials';
      if (err.response?.data?.details?.unverified) {
        toast.error('Email not verified. Please check your inbox.');
        router.push(`/auth/verify-otp?email=${encodeURIComponent(err.response.data.details.email)}`);
        return;
      }
      toast.error(apiError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md space-y-8 glass p-8 rounded-3xl relative z-10 shadow-2xl border-white/5">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Layout className="text-primary-foreground w-6 h-6" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
          <p className="text-muted-foreground">Sign in to manage your projects</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium ml-1">Email address</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-medium">Password</label>
                <Link href="/auth/forgot-password" title="Click here to reset your password" className="text-xs text-primary hover:underline underline-offset-4 font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Sign in
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link href="/register" className="text-primary font-semibold hover:underline underline-offset-4">
            Create one for free
          </Link>
        </p>
      </div>
    </div>
  );
}

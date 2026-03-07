'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Loader2, ArrowRight, ArrowLeft, KeyRound } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import { useRecaptcha } from '@/hooks/useRecaptcha';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const router = useRouter();
  const { executeRecaptcha } = useRecaptcha();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!executeRecaptcha) return;

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const recaptchaToken = await executeRecaptcha('forgot_password');
      await api.post('/auth/forgot-password', { email, recaptchaToken });
      setMessage('If an account exists, a reset link has been sent to your email.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to request reset');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 glass p-8 rounded-3xl relative z-10 shadow-2xl border-white/5">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Forgot Password</h2>
          <p className="text-muted-foreground text-sm">Enter your email and we'll send you a link to reset your password.</p>
        </div>

        {message ? (
          <div className="space-y-6 text-center animate-in fade-in zoom-in-95">
             <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm p-4 rounded-xl">
               {message}
             </div>
             <Link href="/login" className="flex items-center justify-center gap-2 text-primary font-bold hover:gap-3 transition-all">
                <ArrowLeft className="w-4 h-4" /> Back to Login
             </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg animate-in fade-in">
                {error}
              </div>
            )}

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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Send Reset Link
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <Link href="/login" className="flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors">
               <ArrowLeft className="w-4 h-4" /> Back to Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

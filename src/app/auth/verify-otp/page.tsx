'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import { useRecaptcha } from '@/hooks/useRecaptcha';

function VerifyOtpForm() {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const { executeRecaptcha } = useRecaptcha();

  useEffect(() => {
    if (!email) {
      router.push('/register');
    }
  }, [email, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!executeRecaptcha) return;
    
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const recaptchaToken = await executeRecaptcha('verify_otp');
      await api.post('/auth/verify-otp', { email, otp, recaptchaToken });
      setMessage('Email verified! Redirecting to login...');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    // Basic resend logic could be implemented here calling register again or a specific resend endpoint
    setMessage('Feature coming soon. Please contact support if you did not receive a code.');
  };

  return (
    <div className="w-full max-w-md space-y-8 glass p-8 rounded-3xl relative z-10 shadow-2xl border-white/5">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Verify Email</h2>
        <p className="text-muted-foreground text-sm">
          We sent a 6-digit code to <br />
          <span className="text-foreground font-semibold">{email}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg animate-in fade-in">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm p-3 rounded-lg animate-in fade-in">
            {message}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-center gap-2">
               <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center text-3xl tracking-[1.5rem] font-black pl-6 py-4 bg-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                placeholder="000000"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || otp.length < 6}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Verify Code
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          Didn't receive code?{' '}
          <button onClick={handleResend} className="text-primary font-semibold hover:underline">
            Resend
          </button>
        </p>
        <button onClick={() => router.push('/register')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Change Email Address
        </button>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <Suspense fallback={<Loader2 className="animate-spin" />}>
                <VerifyOtpForm />
            </Suspense>
        </div>
    );
}

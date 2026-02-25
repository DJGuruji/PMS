'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCcw, Home, Terminal } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-destructive/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-lg w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mx-auto w-24 h-24 bg-destructive/10 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-destructive/5">
          <AlertTriangle className="text-destructive w-12 h-12" />
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tight leading-none text-foreground">
            System Overload
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            We encountered an unexpected glitch while processing your request. 
            Our automated cleanup services have been notified.
          </p>
        </div>

        {error.digest && (
          <div className="bg-secondary/50 rounded-2xl p-4 flex items-center gap-3 border border-border/50 max-w-sm mx-auto">
            <Terminal className="w-5 h-5 text-muted-foreground shrink-0" />
            <code className="text-xs font-mono text-muted-foreground truncate">
              ERR_ID: {error.digest}
            </code>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 pt-8 justify-center">
          <button
            onClick={() => reset()}
            className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCcw className="w-5 h-5" />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-secondary text-foreground rounded-2xl font-bold border border-border/50 hover:bg-border transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
        </div>

        <p className="text-muted-foreground text-xs italic pt-10">
          "Even the best systems need a reboot sometimes."
        </p>
      </div>
    </div>
  );
}

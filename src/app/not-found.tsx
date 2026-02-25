'use client';

import Link from 'next/link';
import { Layout, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="mx-auto w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mb-8 rotate-12 hover:rotate-0 transition-transform duration-500 shadow-xl shadow-primary/5">
          <Layout className="text-primary w-12 h-12" />
        </div>

        <div className="space-y-4">
          <h1 className="text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/30 leading-none">
            404
          </h1>
          <h2 className="text-3xl font-bold tracking-tight">Project Lost in Space</h2>
          <p className="text-muted-foreground text-lg italic">
            "The board you are looking for has been archived, moved, or never existed in this dimension."
          </p>
        </div>

        <div className="flex flex-col gap-4 pt-8">
          <Link
            href="/dashboard"
            className="w-full px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 group"
          >
            <Home className="w-5 h-5" />
            Back to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="w-full px-8 py-4 bg-secondary text-foreground rounded-2xl font-bold border border-border/50 hover:bg-border transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>
      </div>

      <footer className="mt-20 text-muted-foreground text-sm font-medium">
        PMS. High Performance Task Tracking
      </footer>
    </div>
  );
}

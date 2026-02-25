import Link from 'next/link';
import { 
  Layout, 
  ChevronRight, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Zap,
  ArrowRight
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/30">
      {/* Abstract Background Decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Layout className="text-primary-foreground w-6 h-6" />
             </div>
             <span className="font-bold text-2xl tracking-tighter">PMS.</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/login" className="px-5 py-2 text-sm font-semibold hover:text-primary transition-colors">
              Login
            </Link>
            <Link 
              href="/register" 
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold animate-in fade-in slide-in-from-top-4">
              <Zap className="w-4 h-4 fill-primary" /> v1.0 is now live
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9] text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/50">
              Manage projects <br /> with surgical precision.
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              A high-performance Kanban system built for elite teams. Track every second, 
              analyze velocity, and ship faster than ever.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-10">
              <Link 
                href="/register" 
                className="w-full sm:w-auto px-10 py-5 bg-primary text-primary-foreground rounded-3xl font-black text-lg shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                Start for Free <ArrowRight className="w-6 h-6" />
              </Link>
              <Link 
                href="/login"
                className="w-full sm:w-auto px-10 py-5 bg-secondary text-foreground rounded-3xl font-bold text-lg border border-border/50 hover:bg-border transition-all"
              >
                View Demo
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-32 px-4 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="glass p-10 rounded-[40px] space-y-6 hover:border-primary/50 transition-all group">
                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="text-blue-500 w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold">Deep Analytics</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Real-time velocity tracking and project health metrics. Know exactly when you'll ship.
                </p>
             </div>

             <div className="glass p-10 rounded-[40px] space-y-6 border-primary/20 shadow-2xl shadow-primary/5 hover:border-primary/50 transition-all group lg:-translate-y-4">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="text-primary w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold">Smart Kanban</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Optimized drag-and-drop interface with automated state management and audit logging.
                </p>
             </div>

             <div className="glass p-10 rounded-[40px] space-y-6 hover:border-primary/50 transition-all group">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="text-emerald-500 w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold">Time Analysis</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Understand bottlenecks with column-by-column time breakdown for every single task.
                </p>
             </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="py-20 px-4 bg-secondary/30 border-y border-border/50">
          <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-6">
            <ShieldCheck className="w-16 h-16 text-primary" />
            <h2 className="text-4xl font-bold tracking-tight">Enterprise grade security.</h2>
            <p className="text-muted-foreground text-lg italic">
              "We built this system with security at its core. Rate limiting, secure JWT rotation, 
              and strict CORS policies protect your data from day one."
            </p>
          </div>
        </section>
      </main>

      <footer className="py-20 px-4 border-t border-border/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Layout className="text-primary-foreground w-5 h-5" />
             </div>
             <span className="font-bold text-xl tracking-tighter">PMS.</span>
          </div>
          
          <p className="text-muted-foreground text-sm">
            © 2026 Project Management System. All rights reserved. Built for high-performance teams.
          </p>

          <div className="flex gap-6">
            <Link href="#" className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">Privacy</Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

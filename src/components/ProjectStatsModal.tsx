'use client';

import { useEffect, useState } from 'react';
import { 
  X, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  Trophy, 
  Loader2, 
  Calendar,
  Layers,
  Activity
} from 'lucide-react';
import api from '@/lib/api';
import { format, formatDistanceToNow } from 'date-fns';

interface ProjectStatsModalProps {
  projectId: string;
  onClose: () => void;
}

export default function ProjectStatsModal({ projectId, onClose }: ProjectStatsModalProps) {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get(`/projects/${projectId}/stats`);
        setStats(data.stats);
      } catch (e) {
        console.error('Failed to fetch project stats', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [projectId]);

  if (isLoading) {
     return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-card w-full max-w-lg p-12 rounded-3xl shadow-2xl border border-border flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-muted-foreground font-medium">Crunching project data...</p>
           </div>
        </div>
     );
  }

  if (!stats) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-card w-full max-w-lg p-12 rounded-3xl shadow-2xl border border-border flex flex-col items-center gap-4">
              <BarChart3 className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground font-medium">No stats available for this project yet.</p>
              <button onClick={onClose} className="mt-4 px-6 py-2 bg-secondary rounded-xl font-bold">Close</button>
           </div>
        </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-card w-full max-w-2xl flex flex-col rounded-3xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="px-8 py-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <BarChart3 className="w-5 h-5" />
             </div>
             <div>
                <h2 className="text-xl font-bold tracking-tight">Project Insights</h2>
                <p className="text-xs text-muted-foreground">Performance and delivery metrics</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-8 space-y-8 overflow-auto max-h-[70vh] kanban-scrollbar">
           {/* Primary Progress */}
           <div className="bg-secondary/30 p-8 rounded-3xl border border-border/50 relative overflow-hidden">
              <div className="relative z-10">
                 <div className="flex justify-between items-end mb-4">
                    <div>
                       <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Completion Status</p>
                       <h3 className="text-4xl font-black text-foreground">
                          {Math.round(stats.completionPercentage)}%
                       </h3>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-bold text-primary">{stats.closedCards} / {stats.totalCards} Tasks</p>
                    </div>
                 </div>
                 <div className="w-full h-4 bg-background/50 rounded-full border border-border p-1">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-1000 shadow-lg shadow-primary/20"
                      style={{ width: `${stats.completionPercentage}%` }}
                    />
                 </div>
              </div>
              <Activity className="absolute -right-8 -bottom-8 w-40 h-40 text-primary/5 -rotate-12" />
           </div>

           {/* Stats Grid */}
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
                 <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Delivered Tasks</p>
                    <p className="text-xl font-bold">{stats.closedCards}</p>
                 </div>
              </div>
              <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
                 <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 shrink-0">
                    <Layers className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Active Backlog</p>
                    <p className="text-xl font-bold">{stats.openCards}</p>
                 </div>
              </div>
           </div>

           {/* Timeline Section */}
           <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                 <Calendar className="w-4 h-4" /> Project Timeline
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="p-5 bg-secondary/20 rounded-2xl border border-border/40 flex items-center gap-4">
                    <div className="p-3 bg-secondary rounded-xl text-muted-foreground">
                       <Clock className="w-5 h-5" />
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-muted-foreground uppercase">Project Started</p>
                       <p className="text-sm font-bold">{format(new Date(stats.startTime), 'MMM d, yyyy')}</p>
                       <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(stats.startTime))} ago</p>
                    </div>
                 </div>
                 
                 {stats.isCompleted ? (
                    <div className="p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 flex items-center gap-4">
                       <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                          <Trophy className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-emerald-500 uppercase">Project Finished</p>
                          <p className="text-sm font-bold">{format(new Date(stats.endTime), 'MMM d, yyyy')}</p>
                       </div>
                    </div>
                 ) : (
                    <div className="p-5 bg-primary/5 rounded-2xl border border-primary/20 flex items-center gap-4">
                       <div className="p-3 bg-primary/10 rounded-xl text-primary animate-pulse">
                          <Activity className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-primary uppercase">Current Velocity</p>
                          <p className="text-sm font-bold">Ongoing Execution</p>
                          <p className="text-[10px] text-muted-foreground font-medium">Estimated track: Active</p>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>

        <footer className="px-8 py-4 bg-secondary/30 border-t border-border flex justify-end">
           <button 
             onClick={onClose}
             className="px-6 py-2 bg-foreground text-background rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
           >
              Done
           </button>
        </footer>
      </div>
    </div>
  );
}

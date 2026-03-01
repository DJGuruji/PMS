'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Bell, Loader2, ChevronLeft, ChevronRight,
  FolderOpen, PenSquare, Trash2, Play, Pause,
  RotateCcw, StopCircle, Settings, UserCircle2,
  AlertCircle, RefreshCw, Activity,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────────────────────
interface LogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  meta: { label: string; color: string };
  project: { id: string; name: string } | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const COLOR_CLASSES: Record<string, { dot: string; badge: string; icon: string }> = {
  emerald: { dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: 'text-emerald-500' },
  blue:    { dot: 'bg-blue-500',    badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20',         icon: 'text-blue-500'    },
  amber:   { dot: 'bg-amber-500',   badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',      icon: 'text-amber-500'   },
  red:     { dot: 'bg-destructive', badge: 'bg-destructive/10 text-destructive border-destructive/20', icon: 'text-destructive' },
  purple:  { dot: 'bg-purple-500',  badge: 'bg-purple-500/10 text-purple-500 border-purple-500/20',   icon: 'text-purple-500'  },
  gray:    { dot: 'bg-muted',       badge: 'bg-secondary text-muted-foreground border-border',        icon: 'text-muted-foreground' },
};

const ENTITY_ICONS: Record<string, React.ElementType> = {
  PROJECT:          FolderOpen,
  PROJECT_SETTINGS: Settings,
  CARD:             PenSquare,
  COLUMN:           Activity,
  LABEL:            Bell,
  PRIORITY:         AlertCircle,
  PROFILE:          UserCircle2,
};

function ActionIcon({ action, color }: { action: string; color: string }) {
  const cls = COLOR_CLASSES[color]?.icon ?? COLOR_CLASSES.gray.icon;
  const iconMap: Record<string, React.ElementType> = {
    CREATE:          FolderOpen,
    UPDATE:          PenSquare,
    DELETE:          Trash2,
    PROJECT_STARTED: Play,
    PROJECT_PAUSED:  Pause,
    PROJECT_RESUMED: RotateCcw,
    PROJECT_CLOSED:  StopCircle,
  };
  const Icon = iconMap[action] ?? Settings;
  return <Icon className={`w-4 h-4 ${cls}`} />;
}

function LogCard({ log }: { log: LogEntry }) {
  const colors = COLOR_CLASSES[log.meta.color] ?? COLOR_CLASSES.gray;
  const EntityIcon = ENTITY_ICONS[log.entity] ?? Bell;

  return (
    <div className="flex gap-4 group">
      {/* Timeline dot */}
      <div className="flex flex-col items-center shrink-0 mt-1">
        <div className={`w-3 h-3 rounded-full ring-4 ring-background ${colors.dot}`} />
        <div className="w-px flex-1 bg-border/50 mt-2 group-last:hidden" />
      </div>

      {/* Card */}
      <div className="pb-6 flex-1 min-w-0">
        <div className="bg-card border border-border rounded-2xl p-4 hover:border-primary/20 transition-all hover:shadow-md group">
          <div className="flex items-start justify-between gap-3">
            {/* Left */}
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${colors.badge}`}>
                <ActionIcon action={log.action} color={log.meta.color} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colors.badge}`}>
                    {log.meta.label}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <EntityIcon className="w-3 h-3" />
                    {log.entity.replace('_', ' ').toLowerCase()}
                  </span>
                </div>
                {log.project && (
                  <Link
                    href={`/dashboard/projects/${log.project.id}`}
                    className="text-sm font-semibold text-foreground hover:text-primary transition-colors mt-0.5 flex items-center gap-1 truncate"
                  >
                    <FolderOpen className="w-3 h-3 shrink-0 text-muted-foreground" />
                    {log.project.name}
                  </Link>
                )}
                {!log.project && log.entity === 'PROFILE' && (
                  <p className="text-sm font-semibold mt-0.5">Your profile</p>
                )}
              </div>
            </div>

            {/* Timestamp */}
            <time
              className="text-xs text-muted-foreground whitespace-nowrap shrink-0 mt-1"
              title={format(new Date(log.createdAt), 'PPpp')}
            >
              {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
            </time>
          </div>

          {/* Details snippet */}
          {log.details && Object.keys(log.details).length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <pre className="text-[11px] text-muted-foreground font-mono bg-secondary/50 rounded-lg px-3 py-2 overflow-x-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ActivityPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLogs = useCallback(async (p: number, refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const { data } = await api.get(`/user/activity?page=${p}&limit=15`);
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (e) {
      console.error('Failed to fetch activity', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchLogs(page); }, [page, fetchLogs]);

  // Group logs by date
  const grouped: Record<string, LogEntry[]> = {};
  logs.forEach((log) => {
    const day = format(new Date(log.createdAt), 'PPP');
    (grouped[day] ??= []).push(log);
  });

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
          <p className="text-muted-foreground mt-1">
            {pagination ? `${pagination.total} total events` : 'A log of all your actions'}
          </p>
        </div>
        <button
          onClick={() => fetchLogs(page, true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-xl text-sm font-medium hover:bg-border transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && logs.length === 0 && (
        <div className="text-center py-24 bg-secondary/30 rounded-3xl border-2 border-dashed border-border">
          <Bell className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold">No activity yet</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            Your actions across projects will appear here
          </p>
        </div>
      )}

      {/* Timeline */}
      {!isLoading && logs.length > 0 && (
        <div className="space-y-8">
          {Object.entries(grouped).map(([day, dayLogs]) => (
            <div key={day}>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-border/50" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-3 py-1 bg-secondary rounded-full">
                  {day}
                </span>
                <div className="h-px flex-1 bg-border/50" />
              </div>

              <div>
                {dayLogs.map((log) => <LogCard key={log.id} log={log} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-xl text-sm font-medium hover:bg-border disabled:opacity-40 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-sm text-muted-foreground font-medium">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-xl text-sm font-medium hover:bg-border disabled:opacity-40 transition-all"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

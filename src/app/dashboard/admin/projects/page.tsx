'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Folder, Search, Trash2, Loader2, X, ChevronLeft,
  ChevronRight, Users, Layers, Clock, CheckCircle2,
  Play, Pause, StopCircle, AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  creator: { name: string | null; email: string };
  _count: { members: number; cards: number; columns: number };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  IDLE:   { label: 'Idle',   icon: Clock,       cls: 'bg-secondary text-muted-foreground border-border' },
  ACTIVE: { label: 'Active', icon: Play,        cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  PAUSED: { label: 'Paused', icon: Pause,       cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  CLOSED: { label: 'Closed', icon: StopCircle,  cls: 'bg-destructive/10 text-destructive border-destructive/20' },
};

function DeleteConfirm({
  project, onConfirm, onCancel, isDeleting,
}: {
  project: Project; onConfirm: () => void; onCancel: () => void; isDeleting: boolean;
}) {
  const [typed, setTyped] = useState('');
  const confirmed = typed.trim() === project.name.trim();
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-destructive/20 p-8 animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <h3 className="font-bold text-xl text-center">Delete Project?</h3>
        <p className="text-muted-foreground text-sm text-center mt-2 mb-6">
          This permanently deletes <span className="font-bold text-foreground">{project.name}</span> and all its data.
        </p>
        <div className="space-y-2 mb-6">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Type <span className="text-foreground">{project.name}</span> to confirm
          </label>
          <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)}
            placeholder={project.name}
            className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl outline-none focus:ring-2 focus:ring-destructive/20 text-sm font-mono" />
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 bg-secondary rounded-xl font-semibold text-sm hover:bg-border transition-colors">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={!confirmed || isDeleting}
            className="flex-1 py-2.5 bg-destructive text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-destructive/20"
          >
            {isDeleting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><Trash2 className="w-4 h-4" /><span>Delete Project</span></>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectManagementPage() {
  const [projects, setProjects]     = useState<Project[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading]   = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast]           = useState('');

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), limit: '10',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });
      const { data } = await api.get(`/admin/projects?${params}`);
      setProjects(data.projects);
      setPagination(data.pagination);
    } catch (e) {
      console.error('Failed to fetch projects', e);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/projects/${deleteTarget.id}`);
      setDeleteTarget(null);
      showToast('Project deleted');
      fetchProjects();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Management</h1>
          <p className="text-muted-foreground mt-1">
            {pagination ? `${pagination.total} total projects` : 'Manage all system projects'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search projects…"
            className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-3.5 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="flex gap-2 flex-wrap">
          {['', 'IDLE', 'ACTIVE', 'PAUSED', 'CLOSED'].map((s) => {
            const cfg = s ? STATUS_CONFIG[s] : null;
            return (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  statusFilter === s ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-card border-border text-muted-foreground hover:border-primary/30'
                }`}>
                {s ? cfg!.label : 'All'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Project table/cards */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-3 bg-secondary/40 border-b border-border text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <span>Project</span>
          <span className="text-center">Status</span>
          <span className="text-center">Members</span>
          <span className="text-center">Cards</span>
          <span className="text-right">Actions</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Folder className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No projects found</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {projects.map((p) => {
              const stat = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.IDLE;
              const StatIcon = stat.icon;
              return (
                <div key={p.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-4 items-center hover:bg-secondary/20 transition-colors">
                  {/* Project info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Folder className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <Link href={`/dashboard/projects/${p.id}`}
                        className="font-semibold text-sm hover:text-primary transition-colors truncate block">
                        {p.name}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate">
                        by {p.creator?.name || p.creator?.email} · {formatDistanceToNow(new Date(p.createdAt))} ago
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${stat.cls}`}>
                    <StatIcon className="w-3 h-3" /> {stat.label}
                  </span>

                  {/* Members */}
                  <span className="hidden sm:flex items-center justify-center gap-1 text-sm text-muted-foreground font-semibold">
                    <Users className="w-3.5 h-3.5" /> {p._count.members}
                  </span>

                  {/* Cards */}
                  <span className="hidden sm:flex items-center justify-center gap-1 text-sm text-muted-foreground font-semibold">
                    <Layers className="w-3.5 h-3.5" /> {p._count.cards}
                  </span>

                  {/* Delete */}
                  <div className="flex justify-end">
                    <button onClick={() => setDeleteTarget(p)}
                      className="p-2 hover:bg-destructive/10 hover:text-destructive text-muted-foreground rounded-lg transition-colors"
                      title="Delete project">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-xl text-sm font-medium hover:bg-border disabled:opacity-40 transition-all">
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-sm text-muted-foreground font-medium">
            Page {page} of {pagination.totalPages}
          </span>
          <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-xl text-sm font-medium hover:bg-border disabled:opacity-40 transition-all">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteConfirm project={deleteTarget} onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)} isDeleting={isDeleting} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-3 bg-card border border-border rounded-2xl shadow-2xl font-semibold text-sm animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {toast}
        </div>
      )}
    </div>
  );
}

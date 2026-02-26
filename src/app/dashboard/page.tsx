'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Folder,
  Users,
  Clock,
  ChevronRight,
  MoreVertical,
  Layers,
  Loader2,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  status: string;
  _count: {
    members: number;
    cards: number;
  };
}

const STATUS_PILL: Record<string, string> = {
  IDLE:    'bg-secondary text-muted-foreground border-border',
  ACTIVE:  'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  PAUSED:  'bg-amber-500/10 text-amber-500 border-amber-500/20',
  CLOSED:  'bg-destructive/10 text-destructive border-destructive/20',
};

// ─── Card dropdown menu ───────────────────────────────────────────────────────
function ProjectCardMenu({
  project,
  onDeleteRequest,
}: {
  project: Project;
  onDeleteRequest: (p: Project) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative z-10">
      <button
        id={`project-menu-${project.id}`}
        onClick={(e) => {
          e.preventDefault();    // prevent Link navigation
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Project options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-44 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              onDeleteRequest(project);
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Project
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Delete confirmation modal ───────────────────────────────────────────────
function DeleteConfirmModal({
  project,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  project: Project;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  const [typed, setTyped] = useState('');
  const confirmed = typed === project.name;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card w-full max-w-md p-8 rounded-3xl shadow-2xl border border-destructive/20 animate-in zoom-in-95 duration-200">
        {/* Icon */}
        <div className="w-14 h-14 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>

        <h2 className="text-xl font-bold text-center mb-1">Delete Project</h2>
        <p className="text-muted-foreground text-sm text-center mb-6">
          This will permanently delete{' '}
          <span className="font-bold text-foreground">{project.name}</span> and all
          its columns, cards, labels, and history. This action{' '}
          <span className="text-destructive font-semibold">cannot be undone</span>.
        </p>

        {/* Type-to-confirm */}
        <div className="space-y-2 mb-6">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Type <span className="text-foreground font-bold">{project.name}</span> to confirm
          </label>
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={project.name}
            className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl outline-none focus:ring-2 focus:ring-destructive/30 text-sm font-mono"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 bg-secondary rounded-xl font-semibold hover:bg-border transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!confirmed || isDeleting}
            className="flex-1 px-4 py-2.5 bg-destructive text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-40 transition-all shadow-lg shadow-destructive/20 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <><Trash2 className="w-4 h-4" /> Delete</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/projects');
      setProjects(Array.isArray(data) ? data : data.projects || []);
    } catch (e) {
      console.error('Failed to fetch projects', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await api.post('/projects', newProject);
      setShowCreateModal(false);
      setNewProject({ name: '', description: '' });
      fetchProjects();
    } catch (e) {
      console.error('Failed to create project', e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/projects/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchProjects();
    } catch (e: any) {
      setDeleteError(e.response?.data?.error || 'Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage and track your active boards</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary/20 flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          Create Project
        </button>
      </div>

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div key={project.id} className="group relative">
            <Link href={`/dashboard/projects/${project.id}`}>
              <div className="bg-card border border-border p-6 rounded-3xl hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 relative overflow-visible cursor-pointer">

                {/* Top-right: chevron + menu button row */}
                <div className="absolute top-4 right-4 flex items-center gap-1">
                  <ProjectCardMenu
                    project={project}
                    onDeleteRequest={(p) => { setDeleteError(''); setDeleteTarget(p); }}
                  />
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                </div>

                {/* Folder icon */}
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Folder className="text-primary w-6 h-6" />
                </div>

                {/* Status pill */}
                {project.status && project.status !== 'IDLE' && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border mb-3 ${STATUS_PILL[project.status] ?? STATUS_PILL.IDLE}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {project.status}
                  </span>
                )}

                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors pr-12">
                  {project.name}
                </h3>
                <p className="text-muted-foreground text-sm line-clamp-2 mb-6 h-10">
                  {project.description || 'No description provided for this project.'}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-border/50 text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" /> {project._count.members}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4" /> {project._count.cards}
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 italic">
                    <Clock className="w-4 h-4" />
                    {formatDistanceToNow(new Date(project.createdAt))} ago
                  </span>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="text-center py-20 bg-secondary/30 rounded-3xl border-2 border-dashed border-border">
          <Folder className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold">No projects found</h3>
          <p className="text-muted-foreground mt-2">Get started by creating your first project</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-6 text-primary font-semibold hover:underline underline-offset-4"
          >
            Create project now
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-full max-w-md p-8 rounded-3xl shadow-2xl border border-border animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold mb-6">New Project</h2>
            <form onSubmit={handleCreate} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium ml-1">Project Name</label>
                <input
                  autoFocus
                  required
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="e.g. Website Redesign"
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium ml-1">Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="What is this project about?"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 bg-secondary rounded-xl font-semibold hover:bg-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          project={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => { setDeleteTarget(null); setDeleteError(''); }}
          isDeleting={isDeleting}
        />
      )}

      {/* Inline error toast if delete fails */}
      {deleteError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-destructive text-white font-semibold rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {deleteError}
          <button onClick={() => setDeleteError('')} className="ml-2 opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

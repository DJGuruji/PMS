'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Loader2,
  Tag,
  AlertCircle,
  Plus,
  Trash2,
  Play,
  Pause,
  StopCircle,
  RefreshCw,
  ArrowRightLeft,
  ChevronRight,
  Timer,
  CheckCircle2,
  Settings2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import api from '@/lib/api';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface Label {
  id: string;
  name: string;
  color: string;
}

interface Priority {
  id: string;
  name: string;
  weight: number;
}

interface ProjectSettings {
  id: string;
  name: string;
  description: string | null;
  status: 'IDLE' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
  cardMovementMode: 'FREE' | 'FORWARD_ONLY';
  startedAt: string | null;
  pausedAt: string | null;
  closedAt: string | null;
  totalPausedMs: string;
  labels: Label[];
  priorities: Priority[];
}

interface LifecycleInfo {
  status: string;
  startedAt: string | null;
  pausedAt: string | null;
  closedAt: string | null;
  totalPausedMs: string;
  activeMs: string;
  totalElapsedMs: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function formatMs(ms: number): string {
  if (ms <= 0) return '0s';
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hrs % 24 > 0) parts.push(`${hrs % 24}h`);
  if (mins % 60 > 0) parts.push(`${mins % 60}m`);
  if (secs % 60 > 0 || parts.length === 0) parts.push(`${secs % 60}s`);
  return parts.join(' ');
}

const STATUS_COLORS: Record<string, string> = {
  IDLE: 'bg-secondary text-muted-foreground border-border',
  ACTIVE: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  PAUSED: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  CLOSED: 'bg-destructive/10 text-destructive border-destructive/20',
};

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#64748b',
];

// ─────────────────────────────────────────────────────────────
// Live Timer Hook
// ─────────────────────────────────────────────────────────────
function useLiveTimer(lifecycle: LifecycleInfo | null) {
  const [elapsed, setElapsed] = useState({ activeMs: 0, totalMs: 0, pausedMs: 0 });

  useEffect(() => {
    if (!lifecycle) return;

    const update = () => {
      const now = Date.now();
      const totalElapsed = lifecycle.startedAt
        ? now - new Date(lifecycle.startedAt).getTime()
        : 0;

      let livePaused = Number(lifecycle.totalPausedMs);
      if (lifecycle.status === 'PAUSED' && lifecycle.pausedAt) {
        livePaused += now - new Date(lifecycle.pausedAt).getTime();
      }

      const closedTotal = lifecycle.closedAt
        ? new Date(lifecycle.closedAt).getTime() - (lifecycle.startedAt ? new Date(lifecycle.startedAt).getTime() : 0)
        : totalElapsed;

      const closedPaused = lifecycle.closedAt ? Number(lifecycle.totalPausedMs) : livePaused;
      const activeMs = Math.max(0, closedTotal - closedPaused);

      setElapsed({ activeMs, totalMs: closedTotal, pausedMs: closedPaused });
    };

    update();
    if (lifecycle.status === 'CLOSED') return; // no live tick for closed
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [lifecycle]);

  return elapsed;
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
interface Props {
  projectId: string;
  onClose: () => void;
  onUpdated: () => void;
}

type Tab = 'general' | 'labels' | 'priorities' | 'lifecycle';

export default function ProjectSettingsModal({ projectId, onClose, onUpdated }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [lifecycle, setLifecycle] = useState<LifecycleInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [movementMode, setMovementMode] = useState<'FREE' | 'FORWARD_ONLY'>('FREE');

  // Label form
  const [labelName, setLabelName] = useState('');
  const [labelColor, setLabelColor] = useState(PRESET_COLORS[0]);

  // Priority form
  const [priorityName, setPriorityName] = useState('');
  const [priorityWeight, setPriorityWeight] = useState(5);

  const { activeMs, totalMs, pausedMs } = useLiveTimer(lifecycle);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ data: s }, { data: l }] = await Promise.all([
        api.get(`/projects/${projectId}/settings`),
        api.get(`/projects/${projectId}/lifecycle`),
      ]);
      setSettings(s);
      setLifecycle(l);
      setProjectName(s.name);
      setProjectDesc(s.description || '');
      setMovementMode(s.cardMovementMode);
    } catch (e) {
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── General Settings ──────────────────────────────────────
  const saveGeneral = async () => {
    setIsSaving(true);
    setError('');
    try {
      await api.patch(`/projects/${projectId}/settings`, {
        name: projectName,
        description: projectDesc,
        cardMovementMode: movementMode,
      });
      onUpdated();
      await fetchData();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Labels ────────────────────────────────────────────────
  const createLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labelName.trim()) return;
    try {
      await api.post(`/projects/${projectId}/labels`, { name: labelName, color: labelColor });
      setLabelName('');
      setLabelColor(PRESET_COLORS[0]);
      fetchData();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Create failed');
    }
  };

  const deleteLabel = async (id: string) => {
    try {
      await api.delete(`/projects/${projectId}/labels/${id}`);
      fetchData();
    } catch (e) {
      setError('Delete failed');
    }
  };

  // ── Priorities ────────────────────────────────────────────
  const createPriority = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priorityName.trim()) return;
    try {
      await api.post(`/projects/${projectId}/priorities`, { name: priorityName, weight: priorityWeight });
      setPriorityName('');
      setPriorityWeight(5);
      fetchData();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Create failed');
    }
  };

  const deletePriority = async (id: string) => {
    try {
      await api.delete(`/projects/${projectId}/priorities/${id}`);
      fetchData();
    } catch (e) {
      setError('Delete failed');
    }
  };

  // ── Lifecycle ─────────────────────────────────────────────
  const performLifecycleAction = async (action: 'start' | 'pause' | 'resume' | 'close') => {
    setIsSaving(true);
    setError('');
    try {
      await api.post(`/projects/${projectId}/lifecycle`, { action });
      onUpdated();
      fetchData();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Action failed');
    } finally {
      setIsSaving(false);
    }
  };

  const status = lifecycle?.status || 'IDLE';

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center p-0 md:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card w-full md:max-w-3xl md:rounded-3xl shadow-2xl border border-border flex flex-col max-h-screen md:max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300 rounded-t-3xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{settings?.name} — Settings</h2>
              <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border mt-0.5 ${STATUS_COLORS[status]}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {status}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-6 mt-5 border-b border-border shrink-0">
          {(['general', 'labels', 'priorities', 'lifecycle'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl capitalize transition-colors relative ${
                activeTab === tab
                  ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Error Toast */}
        {error && (
          <div className="mx-6 mt-4 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-2 text-destructive text-sm font-medium shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
            <button onClick={() => setError('')} className="ml-auto p-1 hover:bg-destructive/10 rounded-lg">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ── General ─────────────────────────────────────── */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Project Name</label>
                <input
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Description</label>
                <textarea
                  value={projectDesc}
                  onChange={e => setProjectDesc(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm resize-none"
                  placeholder="Project description..."
                />
              </div>

              {/* Card Movement Toggle */}
              <div className="p-5 bg-secondary/50 rounded-2xl border border-border space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                    <ArrowRightLeft className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Card Movement Direction</p>
                    <p className="text-xs text-muted-foreground">Control how cards can be moved between columns</p>
                  </div>
                </div>

                <div
                  onClick={() => setMovementMode(prev => prev === 'FREE' ? 'FORWARD_ONLY' : 'FREE')}
                  className="flex items-center justify-between p-4 bg-card rounded-xl border border-border cursor-pointer hover:border-primary/30 transition-all group"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold">
                      {movementMode === 'FREE' ? 'Free Movement' : 'Forward Only'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {movementMode === 'FREE'
                        ? 'Cards can be moved to any column in any direction'
                        : 'Cards can only advance to forward columns (no going back)'}
                    </p>
                  </div>
                  <div className="shrink-0 ml-4">
                    {movementMode === 'FREE'
                      ? <ToggleLeft className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                      : <ToggleRight className="w-10 h-10 text-primary" />
                    }
                  </div>
                </div>
              </div>

              <button
                onClick={saveGeneral}
                disabled={isSaving}
                className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          )}

          {/* ── Labels ──────────────────────────────────────── */}
          {activeTab === 'labels' && (
            <div className="space-y-6">
              <form onSubmit={createLabel} className="p-5 bg-secondary/50 rounded-2xl border border-border space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Tag className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-bold text-sm">Create New Label</p>
                </div>

                <div className="flex gap-3">
                  <input
                    value={labelName}
                    onChange={e => setLabelName(e.target.value)}
                    placeholder="Label name"
                    className="flex-1 px-4 py-2.5 bg-card border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    required
                  />
                  <div className="relative">
                    <div
                      className="w-10 h-10 rounded-xl border-2 border-border cursor-pointer shadow-sm"
                      style={{ backgroundColor: labelColor }}
                      title="Click to pick color"
                    />
                    <input
                      type="color"
                      value={labelColor}
                      onChange={e => setLabelColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setLabelColor(c)}
                      className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${labelColor === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </form>

              <div className="space-y-2">
                {settings?.labels.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">No labels yet. Create one above.</p>
                )}
                {settings?.labels.map(label => (
                  <div
                    key={label.id}
                    className="flex items-center justify-between p-3 bg-secondary/40 rounded-xl border border-border group hover:border-primary/20 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: label.color }} />
                      <span className="font-medium text-sm">{label.name}</span>
                      <span
                        className="px-3 py-0.5 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: label.color }}
                      >
                        {label.name}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteLabel(label.id)}
                      className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors text-muted-foreground opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Priorities ──────────────────────────────────── */}
          {activeTab === 'priorities' && (
            <div className="space-y-6">
              <form onSubmit={createPriority} className="p-5 bg-secondary/50 rounded-2xl border border-border space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-bold text-sm">Create New Priority</p>
                </div>

                <div className="flex gap-3">
                  <input
                    value={priorityName}
                    onChange={e => setPriorityName(e.target.value)}
                    placeholder="Priority name (e.g. Critical)"
                    className="flex-1 px-4 py-2.5 bg-card border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    required
                  />
                  <div className="space-y-1">
                    <input
                      type="number"
                      min={1} max={10}
                      value={priorityWeight}
                      onChange={e => setPriorityWeight(Number(e.target.value))}
                      className="w-20 px-3 py-2.5 bg-card border border-border rounded-xl text-center font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      title="Weight (1–10): higher = more urgent"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Weight (1–10): higher values appear first and signal greater urgency.</p>
              </form>

              <div className="space-y-2">
                {settings?.priorities.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">No priorities yet. Create one above.</p>
                )}
                {settings?.priorities.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 bg-secondary/40 rounded-xl border border-border group hover:border-primary/20 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black ${
                        p.weight >= 8 ? 'bg-destructive/15 text-destructive'
                        : p.weight >= 5 ? 'bg-amber-500/15 text-amber-500'
                        : 'bg-emerald-500/15 text-emerald-500'
                      }`}>
                        {p.weight}
                      </div>
                      <span className="font-medium text-sm">{p.name}</span>
                      <span className="text-xs text-muted-foreground">weight {p.weight}/10</span>
                    </div>
                    <button
                      onClick={() => deletePriority(p.id)}
                      className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors text-muted-foreground opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Lifecycle ────────────────────────────────────── */}
          {activeTab === 'lifecycle' && (
            <div className="space-y-6">
              {/* Timer Display */}
              <div className="p-6 bg-secondary/50 rounded-2xl border border-border space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Timer className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-bold">Project Timer</p>
                  <div className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[status]}`}>
                    {status === 'ACTIVE' && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                    {status}
                  </div>
                </div>

                {lifecycle?.startedAt ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-card rounded-xl p-4 border border-border text-center">
                      <p className="text-2xl font-black tabular-nums tracking-tight text-emerald-500">{formatMs(activeMs)}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">Active Time</p>
                    </div>
                    <div className="bg-card rounded-xl p-4 border border-border text-center">
                      <p className="text-2xl font-black tabular-nums tracking-tight text-amber-500">{formatMs(pausedMs)}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">Paused Time</p>
                    </div>
                    <div className="bg-card rounded-xl p-4 border border-border text-center">
                      <p className="text-2xl font-black tabular-nums tracking-tight">{formatMs(totalMs)}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">Total Elapsed</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Timer className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Project not started yet</p>
                    <p className="text-xs mt-1">Start the project to begin tracking time</p>
                  </div>
                )}

                {lifecycle?.startedAt && (
                  <div className="space-y-2 text-sm">
                    {lifecycle.startedAt && (
                      <div className="flex justify-between text-muted-foreground">
                        <span className="flex items-center gap-2"><Play className="w-3.5 h-3.5 text-emerald-500" /> Started</span>
                        <span className="font-mono font-semibold">{new Date(lifecycle.startedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {lifecycle.closedAt && (
                      <div className="flex justify-between text-muted-foreground">
                        <span className="flex items-center gap-2"><StopCircle className="w-3.5 h-3.5 text-destructive" /> Closed</span>
                        <span className="font-mono font-semibold">{new Date(lifecycle.closedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {status !== 'CLOSED' && (
                <div className="grid grid-cols-2 gap-3">
                  {status === 'IDLE' && (
                    <button
                      onClick={() => performLifecycleAction('start')}
                      disabled={isSaving}
                      className="col-span-2 flex items-center justify-center gap-2 px-5 py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Play className="w-5 h-5" /> Start Project</>}
                    </button>
                  )}
                  {status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => performLifecycleAction('pause')}
                        disabled={isSaving}
                        className="flex items-center justify-center gap-2 px-5 py-4 bg-amber-500 text-white rounded-2xl font-bold hover:bg-amber-600 active:scale-95 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                      >
                        <Pause className="w-5 h-5" /> Pause
                      </button>
                      <button
                        onClick={() => performLifecycleAction('close')}
                        disabled={isSaving}
                        className="flex items-center justify-center gap-2 px-5 py-4 bg-destructive text-white rounded-2xl font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-destructive/20 disabled:opacity-50"
                      >
                        <StopCircle className="w-5 h-5" /> Close Project
                      </button>
                    </>
                  )}
                  {status === 'PAUSED' && (
                    <>
                      <button
                        onClick={() => performLifecycleAction('resume')}
                        disabled={isSaving}
                        className="flex items-center justify-center gap-2 px-5 py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                      >
                        <RefreshCw className="w-5 h-5" /> Resume
                      </button>
                      <button
                        onClick={() => performLifecycleAction('close')}
                        disabled={isSaving}
                        className="flex items-center justify-center gap-2 px-5 py-4 bg-destructive text-white rounded-2xl font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-destructive/20 disabled:opacity-50"
                      >
                        <StopCircle className="w-5 h-5" /> Close Project
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Final time breakdown on close */}
              {status === 'CLOSED' && (
                <div className="p-5 bg-secondary/50 rounded-2xl border border-border space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <p className="font-bold text-sm">Project Complete — Final Breakdown</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 bg-card rounded-xl border border-border">
                      <span className="text-sm font-medium text-muted-foreground">Total Elapsed</span>
                      <span className="font-black text-lg tabular-nums">{formatMs(totalMs)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                      <span className="text-sm font-medium text-emerald-500">⚡ Active Working Time</span>
                      <span className="font-black text-lg tabular-nums text-emerald-500">{formatMs(activeMs)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-amber-500/5 rounded-xl border border-amber-500/20">
                      <span className="text-sm font-medium text-amber-500">⏸ Total Paused Time</span>
                      <span className="font-black text-lg tabular-nums text-amber-500">{formatMs(pausedMs)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-secondary rounded-xl border border-border">
                      <span className="text-sm font-medium text-muted-foreground">Efficiency</span>
                      <span className="font-black text-lg">{totalMs > 0 ? `${Math.round((activeMs / totalMs) * 100)}%` : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Building2, Plus, Pencil, Trash2, Users, Folder, UserPlus,
  X, Loader2, CheckCircle2, AlertTriangle, ChevronRight,
  Mail, Search, Shield, Clock, ArrowLeft,
} from 'lucide-react';
import api from '@/lib/api';
import { format, formatDistanceToNow } from 'date-fns';

// ── Types ────────────────────────────────────────────────────────────────────
interface Org {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  createdBy: { name: string | null; email: string };
  _count: { members: number; projects: number };
}

interface OrgDetail {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string };
  members: Array<{
    id: string;
    userId: string;
    createdAt: string;
    user: { id: string; name: string | null; email: string; role: string };
  }>;
  projects: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: string;
    _count: { members: number; cards: number };
  }>;
  _count: { members: number; projects: number };
}

interface UserOption { id: string; name: string | null; email: string; role: string }

const STATUS_CLS: Record<string, string> = {
  IDLE:   'bg-secondary text-muted-foreground',
  ACTIVE: 'bg-emerald-500/10 text-emerald-500',
  PAUSED: 'bg-amber-500/10 text-amber-500',
  CLOSED: 'bg-destructive/10 text-destructive',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function showToastFn(setToast: (t: string) => void, msg: string) {
  setToast(msg); setTimeout(() => setToast(''), 3500);
}

// ── Org Form Modal ────────────────────────────────────────────────────────────
function OrgFormModal({
  org, onClose, onSaved,
}: { org: Org | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!org;
  const [name, setName]   = useState(org?.name || '');
  const [desc, setDesc]   = useState(org?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (isEdit) {
        await api.patch(`/organizations/${org!.id}`, { name, description: desc });
      } else {
        await api.post('/organizations', { name, description: desc });
      }
      onSaved(); onClose();
    } catch (e: any) { setError(e.response?.data?.error || 'Operation failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              {isEdit ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
            </div>
            <h2 className="font-bold text-lg">{isEdit ? 'Edit Organization' : 'New Organization'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Name <span className="text-destructive">*</span></label>
            <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Description</label>
            <textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)}
              placeholder="What does this organization do?"
              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm resize-none" />
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-secondary rounded-xl font-semibold hover:bg-border transition-colors text-sm">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Member Modal ──────────────────────────────────────────────────────────
function AddMemberModal({
  orgId, onClose, onAdded,
}: { orgId: string; onClose: () => void; onAdded: () => void }) {
  const [users, setUsers]     = useState<UserOption[]>([]);
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState<UserOption | null>(null);
  const [adding, setAdding]   = useState(false);
  const [error, setError]     = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const searchUsers = useCallback(async (q: string) => {
    if (!q) { setUsers([]); return; }
    setIsSearching(true);
    try {
      const { data } = await api.get(`/admin/users?search=${encodeURIComponent(q)}&limit=8`);
      setUsers(data.users);
    } catch { setUsers([]); }
    finally { setIsSearching(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchUsers(search), 300);
    return () => clearTimeout(t);
  }, [search, searchUsers]);

  const handleAdd = async () => {
    if (!selected) return;
    setAdding(true); setError('');
    try {
      await api.post(`/organizations/${orgId}/members`, { userId: selected.id });
      onAdded(); onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to add member');
    } finally { setAdding(false); }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-emerald-500" />
            </div>
            <h2 className="font-bold text-lg">Add Member</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            The user will be added to this organization and all its projects, and will receive an email notification.
          </p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
              placeholder="Search by name or email…"
              className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            />
            {isSearching && <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-muted-foreground" />}
          </div>

          {/* Results */}
          {users.length > 0 && (
            <div className="bg-secondary/50 border border-border rounded-2xl overflow-hidden divide-y divide-border/50">
              {users.map((u) => (
                <button key={u.id} onClick={() => setSelected(u)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary transition-colors ${selected?.id === u.id ? 'bg-primary/10 border-l-2 border-primary' : ''}`}>
                  <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center text-primary text-xs font-black shrink-0">
                    {(u.name || u.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{u.name || <span className="text-muted-foreground italic">No name</span>}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {u.email}
                    </p>
                  </div>
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${u.role === 'ADMIN' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-secondary text-muted-foreground border-border'}`}>
                    {u.role}
                  </span>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Selected: <span className="font-bold">{selected.name || selected.email}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 bg-secondary rounded-xl font-semibold hover:bg-border text-sm transition-colors">Cancel</button>
            <button onClick={handleAdd} disabled={!selected || adding}
              className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4" /> Add & Notify</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Org Detail View ───────────────────────────────────────────────────────────
function OrgDetailView({
  orgId, onBack, setToast,
}: { orgId: string; onBack: () => void; setToast: (t: string) => void }) {
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchOrg = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/organizations/${orgId}`);
      setOrg(data);
    } catch { showToastFn(setToast, 'Failed to load organization'); }
    finally { setIsLoading(false); }
  }, [orgId, setToast]);

  useEffect(() => { fetchOrg(); }, [fetchOrg]);

  const removeMember = async (userId: string, name: string) => {
    setRemovingId(userId);
    try {
      await api.delete(`/organizations/${orgId}/members/${userId}`);
      showToastFn(setToast, `${name} removed and notified`);
      fetchOrg();
    } catch (e: any) { showToastFn(setToast, e.response?.data?.error || 'Failed to remove member'); }
    finally { setRemovingId(null); }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!org) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-secondary rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold truncate">{org.name}</h2>
          {org.description && <p className="text-muted-foreground text-sm mt-0.5 truncate">{org.description}</p>}
        </div>
        <button onClick={() => setShowAddMember(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold text-sm hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 shrink-0">
          <UserPlus className="w-4 h-4" /> Add Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Members', value: org._count.members, icon: Users, color: 'text-primary' },
          { label: 'Projects', value: org._count.projects, icon: Folder, color: 'text-emerald-500' },
          { label: 'Created', value: format(new Date(org.createdAt), 'MMM yyyy'), icon: Clock, color: 'text-amber-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5 text-center">
            <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
            <p className="text-xl font-black">{value}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h3 className="font-bold flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Members</h3>
            <span className="text-xs font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{org.members.length}</span>
          </div>
          <div className="divide-y divide-border/50">
            {org.members.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">No members yet</p>
            ) : org.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/20 transition-colors">
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary text-xs font-black shrink-0">
                  {(m.user.name || m.user.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{m.user.name || <span className="text-muted-foreground italic">No name</span>}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${m.user.role === 'ADMIN' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-secondary text-muted-foreground border-border'}`}>
                  {m.user.role}
                </span>
                {m.user.role !== 'ADMIN' && (
                  <button
                    onClick={() => removeMember(m.userId, m.user.name || m.user.email)}
                    disabled={removingId === m.userId}
                    className="p-1.5 hover:bg-destructive/10 hover:text-destructive text-muted-foreground rounded-lg transition-colors disabled:opacity-50 shrink-0"
                    title="Remove member"
                  >
                    {removingId === m.userId ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Projects */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h3 className="font-bold flex items-center gap-2"><Folder className="w-4 h-4 text-emerald-500" /> Projects</h3>
            <span className="text-xs font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{org.projects.length}</span>
          </div>
          <div className="divide-y divide-border/50">
            {org.projects.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">No projects in this organization yet</p>
            ) : org.projects.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/20 transition-colors">
                <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <Folder className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p._count.members} members · {p._count.cards} cards</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_CLS[p.status] ?? STATUS_CLS.IDLE}`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAddMember && (
        <AddMemberModal orgId={orgId} onClose={() => setShowAddMember(false)} onAdded={() => { fetchOrg(); showToastFn(setToast, 'Member added and notified via email!'); }} />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OrganizationsPage() {
  const [orgs, setOrgs]           = useState<Org[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm]   = useState<Org | null | 'new'>(null);
  const [deleteTarget, setDeleteTarget] = useState<Org | null>(null);
  const [isDeleting, setIsDeleting]     = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const fetchOrgs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/organizations');
      setOrgs(data.organizations);
    } catch { console.error('Failed to fetch organizations'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/organizations/${deleteTarget.id}`);
      setDeleteTarget(null);
      showToastFn(setToast, 'Organization deleted');
      fetchOrgs();
    } catch (e: any) { showToastFn(setToast, e.response?.data?.error || 'Delete failed'); }
    finally { setIsDeleting(false); }
  };

  // Show detail view
  if (selectedOrgId) {
    return (
      <div className="animate-in fade-in duration-300">
        <OrgDetailView orgId={selectedOrgId} onBack={() => setSelectedOrgId(null)} setToast={setToast} />
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-3 bg-card border border-border rounded-2xl shadow-2xl font-semibold text-sm animate-in slide-in-from-bottom-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {toast}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground mt-1">{orgs.length} organization{orgs.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm('new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all">
          <Plus className="w-5 h-5" /> New Organization
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-24 bg-secondary/30 rounded-3xl border-2 border-dashed border-border">
          <Building2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold">No organizations yet</h3>
          <p className="text-muted-foreground mt-2 text-sm">Create your first organization to group projects and manage user access</p>
          <button onClick={() => setShowForm('new')} className="mt-6 text-primary font-semibold hover:underline">Create now</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orgs.map((org) => (
            <div key={org.id} className="group bg-card border border-border rounded-3xl p-6 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all relative">
              {/* Actions */}
              <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setShowForm(org)} className="p-1.5 hover:bg-primary/10 hover:text-primary text-muted-foreground rounded-lg transition-colors" title="Edit">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleteTarget(org)} className="p-1.5 hover:bg-destructive/10 hover:text-destructive text-muted-foreground rounded-lg transition-colors" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Icon */}
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Building2 className="w-6 h-6 text-primary" />
              </div>

              <h3 className="font-bold text-lg mb-1 pr-16 truncate group-hover:text-primary transition-colors">{org.name}</h3>
              <p className="text-muted-foreground text-sm line-clamp-2 mb-5 h-10">
                {org.description || <span className="italic">No description</span>}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-border/50 text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {org._count.members}</span>
                  <span className="flex items-center gap-1"><Folder className="w-3.5 h-3.5" /> {org._count.projects}</span>
                </div>
                <span className="italic">{formatDistanceToNow(new Date(org.createdAt))} ago</span>
              </div>

              {/* Open button */}
              <button
                onClick={() => setSelectedOrgId(org.id)}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2 bg-secondary hover:bg-primary/10 hover:text-primary rounded-xl text-sm font-semibold transition-colors"
              >
                Manage <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showForm !== null && (
        <OrgFormModal
          org={showForm === 'new' ? null : showForm}
          onClose={() => setShowForm(null)}
          onSaved={() => { fetchOrgs(); showToastFn(setToast, showForm === 'new' ? 'Organization created!' : 'Organization updated!'); }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-full max-w-sm rounded-3xl p-8 shadow-2xl border border-destructive/20 text-center animate-in zoom-in-95">
            <div className="w-14 h-14 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <h3 className="font-bold text-lg mb-2">Delete Organization?</h3>
            <p className="text-muted-foreground text-sm mb-6">
              <strong className="text-foreground">{deleteTarget.name}</strong> will be deleted. Its projects will be <em>unlinked but not deleted</em>.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 bg-secondary rounded-xl font-semibold text-sm hover:bg-border">Cancel</button>
              <button onClick={handleDelete} disabled={isDeleting}
                className="flex-1 py-2.5 bg-destructive text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-destructive/20">
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /><span>Delete</span></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-3 bg-card border border-border rounded-2xl shadow-2xl font-semibold text-sm animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {toast}
        </div>
      )}
    </div>
  );
}

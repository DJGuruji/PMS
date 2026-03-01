'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Users, Plus, Search, Pencil, Trash2, KeyRound,
  Loader2, X, ChevronLeft, ChevronRight, Shield,
  UserCheck, AlertTriangle, CheckCircle2, AlertCircle,
  Eye, EyeOff, Mail, Calendar,
} from 'lucide-react';
import api from '@/lib/api';
import { format } from 'date-fns';

// ── Types ────────────────────────────────────────────────────────────────────
interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'MEMBER';
  createdAt: string;
  _count: { projects: number; assignedCards: number };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Create / Edit Modal ───────────────────────────────────────────────────────
function UserFormModal({
  user,
  onClose,
  onSaved,
}: {
  user: User | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!user;
  const [name, setName]         = useState(user?.name || '');
  const [email, setEmail]       = useState(user?.email || '');
  const [role, setRole]         = useState<'ADMIN' | 'MEMBER'>(user?.role || 'MEMBER');
  const [password, setPassword] = useState('');
  const [resetPw, setResetPw]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      if (isEdit) {
        const payload: Record<string, unknown> = { name, role };
        if (resetPw && password) payload.newPassword = password;
        await api.patch(`/admin/users/${user!.id}`, payload);
      } else {
        await api.post('/admin/users', { email, name, role, password });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Operation failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              {isEdit ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
            </div>
            <h2 className="font-bold text-lg">{isEdit ? 'Edit User' : 'Create User'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Display Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            />
          </div>

          {/* Email (create only) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Email <span className="text-destructive">*</span></label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
          )}

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {(['MEMBER', 'ADMIN'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-2.5 rounded-xl font-bold text-sm border transition-all flex items-center justify-center gap-2 ${
                    role === r
                      ? r === 'ADMIN'
                        ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                        : 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                      : 'bg-secondary border-border text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Password — required for create, optional reset for edit */}
          {!isEdit ? (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Password <span className="text-destructive">*</span></label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm pr-10"
                />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1 border-t border-border">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => setResetPw((v) => !v)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${resetPw ? 'bg-amber-500' : 'bg-secondary border border-border'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${resetPw ? 'left-4' : 'left-0.5'}`} />
                </div>
                <span className="text-sm font-semibold flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-amber-500" /> Reset Password
                </span>
              </label>

              {resetPw && (
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required={resetPw}
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password (min 8 chars)"
                    className="w-full px-4 py-2.5 bg-secondary border border-amber-500/30 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 text-sm pr-10"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 bg-secondary rounded-xl font-semibold hover:bg-border transition-colors text-sm">
              Cancel
            </button>
            <button type="submit" disabled={isSaving}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirmation ───────────────────────────────────────────────────────
function DeleteConfirm({
  user,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  user: User;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl border border-destructive/20 p-8 text-center animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <h3 className="font-bold text-lg">Delete User?</h3>
        <p className="text-muted-foreground text-sm mt-2 mb-6">
          <span className="font-bold text-foreground">{user.name || user.email}</span> will be permanently removed from the system.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 bg-secondary rounded-xl font-semibold text-sm hover:bg-border transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isDeleting}
            className="flex-1 py-2.5 bg-destructive text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-destructive/20">
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UserManagementPage() {
  const [users, setUsers]           = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading]   = useState(true);
  const [editTarget, setEditTarget] = useState<User | null | 'new'>( null); // null=hidden, 'new'=create, User=edit
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast]           = useState('');
  const searchRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Debounce search
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/admin/users?page=${page}&limit=10&search=${encodeURIComponent(debouncedSearch)}`);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (e) {
      console.error('Failed to fetch users', e);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/admin/users/${deleteTarget.id}`);
      setDeleteTarget(null);
      showToast('User deleted successfully');
      fetchUsers();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">
            {pagination ? `${pagination.total} user${pagination.total !== 1 ? 's' : ''}` : 'Manage all system users'}
          </p>
        </div>
        <button
          onClick={() => setEditTarget('new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" /> Add User
        </button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-4 top-3.5 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-3 bg-secondary/40 border-b border-border text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <span>User</span>
          <span className="text-center">Role</span>
          <span className="text-center">Projects</span>
          <span className="text-right">Actions</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No users found</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {users.map((u) => (
              <div key={u.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-4 items-center hover:bg-secondary/20 transition-colors group">
                {/* User info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black text-sm shrink-0">
                    {(u.name || u.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{u.name || <span className="text-muted-foreground italic">No name</span>}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 shrink-0" /> {u.email}
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 shrink-0" /> Joined {format(new Date(u.createdAt), 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>

                {/* Role badge */}
                <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${
                  u.role === 'ADMIN'
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-secondary text-muted-foreground border-border'
                }`}>
                  {u.role === 'ADMIN' ? '⚡ Admin' : 'Member'}
                </span>

                {/* Projects count */}
                <span className="text-center text-sm font-semibold text-muted-foreground">
                  {u._count.projects}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 justify-end">
                  <button
                    onClick={() => setEditTarget(u)}
                    className="p-2 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors text-muted-foreground"
                    title="Edit user"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(u)}
                    className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors text-muted-foreground"
                    title="Delete user"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-xl text-sm font-medium hover:bg-border disabled:opacity-40 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="px-2 text-muted-foreground text-sm">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                      page === p ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'hover:bg-secondary text-muted-foreground'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-xl text-sm font-medium hover:bg-border disabled:opacity-40 transition-all"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modals */}
      {editTarget !== null && (
        <UserFormModal
          user={editTarget === 'new' ? null : editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { fetchUsers(); showToast(editTarget === 'new' ? 'User created' : 'User updated'); }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          user={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-3 bg-card border border-border rounded-2xl shadow-2xl font-semibold text-sm animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          {toast}
        </div>
      )}
    </div>
  );
}

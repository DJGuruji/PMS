'use client';

import { useEffect, useState } from 'react';
import {
  User as UserIcon, Mail, Shield, Calendar, Loader2,
  Save, KeyRound, CheckCircle2, AlertCircle, Folder,
  Layers, Activity, Eye, EyeOff,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';

interface ProfileData {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
  };
  stats: {
    projects: number;
    cards: number;
    activities: number;
  };
}

export default function ProfilePage() {
  const { user: authUser, setAuth } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Name form
  const [name, setName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSavingPw, setIsSavingPw] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState('');

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/user/profile');
      setProfile(data);
      setName(data.user.name || '');
    } catch (e) {
      console.error('Failed to load profile', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingName(true);
    setNameError('');
    setNameSuccess(false);
    try {
      const { data } = await api.patch('/user/profile', { name });
      // Update the auth store so the header reflects the new name
      if (authUser) setAuth(data.user, useAuthStore.getState().accessToken ?? '');
      setProfile((prev) => prev ? { ...prev, user: data.user } : prev);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (e: any) {
      setNameError(e.response?.data?.error || 'Failed to update name');
    } finally {
      setIsSavingName(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('Password must be at least 8 characters');
      return;
    }
    setIsSavingPw(true);
    setPwError('');
    setPwSuccess(false);
    try {
      await api.patch('/user/profile', { currentPassword, newPassword });
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (e: any) {
      setPwError(e.response?.data?.error || 'Failed to update password');
    } finally {
      setIsSavingPw(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const user = profile?.user;
  const stats = profile?.stats;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      {/* Avatar + info card */}
      <div className="bg-card border border-border rounded-3xl p-6 flex items-center gap-6">
        <div className="relative shrink-0">
          <div className="w-20 h-20 bg-primary/15 rounded-3xl border-2 border-primary/20 flex items-center justify-center text-primary text-3xl font-black">
            {(user?.name || user?.email || '?')[0].toUpperCase()}
          </div>
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-card ${
            user?.role === 'ADMIN' ? 'bg-primary' : 'bg-emerald-500'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate">{user?.name || 'No name set'}</h2>
          <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{user?.email}</span>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              user?.role === 'ADMIN'
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-secondary text-muted-foreground border-border'
            }`}>
              <Shield className="w-3 h-3" />
              {user?.role}
            </span>
            {user?.createdAt && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Joined {format(new Date(user.createdAt), 'MMM yyyy')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Projects', value: stats?.projects ?? 0,    icon: Folder,   color: 'text-primary'      },
          { label: 'Cards',    value: stats?.cards ?? 0,       icon: Layers,   color: 'text-emerald-500'  },
          { label: 'Actions',  value: stats?.activities ?? 0,  icon: Activity, color: 'text-amber-500'    },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5 text-center">
            <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
            <p className="text-2xl font-black tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Edit Name */}
      <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm">Display Name</p>
            <p className="text-xs text-muted-foreground">This is how you appear across the app</p>
          </div>
        </div>

        <form onSubmit={saveName} className="flex gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your display name"
            minLength={2}
            className="flex-1 px-4 py-2.5 bg-secondary border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
          />
          <button
            type="submit"
            disabled={isSavingName || name === (user?.name || '')}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {isSavingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </form>

        {nameSuccess && (
          <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" /> Name updated successfully
          </div>
        )}
        {nameError && (
          <div className="flex items-center gap-2 text-destructive text-sm font-medium">
            <AlertCircle className="w-4 h-4" /> {nameError}
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center">
            <KeyRound className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="font-bold text-sm">Change Password</p>
            <p className="text-xs text-muted-foreground">Use a strong password with 8+ characters</p>
          </div>
        </div>

        <form onSubmit={savePassword} className="space-y-3">
          {/* Current password */}
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              required
              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm pr-10"
            />
            <button type="button" onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* New password */}
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 8 chars)"
              minLength={8}
              required
              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm pr-10"
            />
            <button type="button" onClick={() => setShowNew((v) => !v)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Confirm */}
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
            className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
          />

          <button
            type="submit"
            disabled={isSavingPw || !currentPassword || !newPassword || !confirmPassword}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
          >
            {isSavingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Update Password
          </button>
        </form>

        {pwSuccess && (
          <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" /> Password changed successfully
          </div>
        )}
        {pwError && (
          <div className="flex items-center gap-2 text-destructive text-sm font-medium">
            <AlertCircle className="w-4 h-4" /> {pwError}
          </div>
        )}
      </div>

      {/* Read-only info */}
      <div className="bg-secondary/40 border border-border rounded-3xl p-5 space-y-3 text-sm">
        <p className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Account Info</p>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Email</span>
          <span className="font-semibold">{user?.email}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> Role</span>
          <span className="font-semibold capitalize">{user?.role?.toLowerCase()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Member since</span>
          <span className="font-semibold">
            {user?.createdAt ? format(new Date(user.createdAt), 'dd MMM yyyy') : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

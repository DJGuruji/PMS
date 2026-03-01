'use client';

import { useState } from 'react';
import { Settings as SettingsIcon, ShieldAlert, Key, Loader2, X, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';

export default function SettingsPage() {
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
  
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 border-b border-border pb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
          <SettingsIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account settings and preferences.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Security Section */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold">Security</h2>
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl border border-border/50 hover:bg-secondary/50 transition-colors">
            <div>
              <p className="font-semibold flex items-center gap-2"><Key className="w-4 h-4 text-primary" /> Change Password</p>
              <p className="text-sm text-muted-foreground mt-1">Update your password to keep your account secure.</p>
            </div>
            <button
              onClick={() => setPasswordModalOpen(true)}
              className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm shadow-md hover:opacity-90 transition-opacity"
            >
              Update
            </button>
          </div>
        </div>
      </div>

      {isPasswordModalOpen && (
        <PasswordChangeModal onClose={() => setPasswordModalOpen(false)} />
      )}
    </div>
  );
}

function PasswordChangeModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setIsSaving(true);
    try {
      await api.patch('/auth/me/password', { currentPassword, newPassword });
      setSuccess('Password updated successfully!');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to update password');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 hover:bg-secondary rounded-xl transition-colors text-muted-foreground"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
          <Key className="w-5 h-5 text-primary" />
          Secure Password Change
        </h3>

        {success ? (
          <div className="py-8 text-center animate-in zoom-in-95">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h4 className="text-xl font-bold text-emerald-500">Success!</h4>
            <p className="text-muted-foreground mt-2">{success}</p>
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-sm font-semibold border border-red-500/20">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-sm font-semibold pl-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50"
                placeholder="Enter current password"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-semibold pl-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50"
                placeholder="Enter new password"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold pl-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50"
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-xl flex justify-center items-center shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-all mt-6"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

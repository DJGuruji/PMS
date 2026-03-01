'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import {
  Building2,
  Folder,
  Users,
  ChevronRight,
  Loader2,
  Plus,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count: {
    members: number;
    projects: number;
  };
}

export default function DashboardOrganizationsPage() {
  const { user } = useAuthStore();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Users can only view organizations they are part of (the API handles this automatically via the GET route)
  const fetchOrganizations = async () => {
    try {
      const { data } = await api.get('/organizations');
      setOrgs(data.organizations || []);
    } catch (e) {
      console.error('Failed to fetch organizations', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground mt-1">Select an organization to view its projects.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orgs.map((org) => (
          <div key={org.id} className="group relative">
            <Link href={`/dashboard/organizations/${org.id}`}>
              <div className="bg-card border border-border p-6 rounded-3xl hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 relative overflow-visible cursor-pointer">
                
                <div className="absolute top-4 right-4 flex items-center gap-1">
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                </div>

                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Building2 className="text-primary w-6 h-6" />
                </div>

                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors pr-12">
                  {org.name}
                </h3>
                <p className="text-muted-foreground text-sm line-clamp-2 mb-6 h-10">
                  {org.description || 'No description provided.'}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-border/50 text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" /> {org._count.members}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Folder className="w-4 h-4" /> {org._count.projects}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {orgs.length === 0 && (
        <div className="text-center py-20 bg-secondary/30 rounded-3xl border-2 border-dashed border-border">
          <Building2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold">No organizations found</h3>
          <p className="text-muted-foreground mt-2">You are not part of any organization yet.</p>
        </div>
      )}
    </div>
  );
}

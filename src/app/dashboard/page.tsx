'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Folder, 
  Users, 
  Clock, 
  ChevronRight,
  MoreVertical,
  Layers,
  Calendar,
  Loader2
} from 'lucide-react';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count: {
    members: number;
    cards: number;
  };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [isCreating, setIsCreating] = useState(false);

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/projects');
      setProjects(data);
    } catch (e) {
      console.error('Failed to fetch projects', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
            <div className="group bg-card border border-border p-6 rounded-3xl hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                </div>
                
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Folder className="text-primary w-6 h-6" />
                </div>

                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{project.name}</h3>
                <p className="text-muted-foreground text-sm line-clamp-2 mb-6 h-10">
                  {project.description || 'No description provided for this project.'}
                </p>

                <div className="flex items-center justify-between pt-6 border-t border-border/50 text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-4">
                     <span className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                        <Users className="w-4 h-4" /> {project._count.members}
                     </span>
                     <span className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                        <Layers className="w-4 h-4" /> {project._count.cards}
                     </span>
                  </div>
                  <span className="flex items-center gap-1.5 italic">
                    <Clock className="w-4 h-4" /> {formatDistanceToNow(new Date(project.createdAt))} ago
                  </span>
                </div>
            </div>
          </Link>
        ))}
      </div>

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
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Plus } from 'lucide-react';
import api from '@/lib/api';

interface CreateCardModalProps {
  projectId: string;
  columnId: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateCardModal({ projectId, columnId, onClose, onCreated }: CreateCardModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [priorityId, setPriorityId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [isLabelDropdownOpen, setIsLabelDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ data: pData }, { data: lData }, { data: mData }] = await Promise.all([
          api.get(`/projects/${projectId}/priorities`),
          api.get(`/projects/${projectId}/labels`),
          api.get(`/projects/${projectId}/members`)
        ]);
        setPriorities(pData);
        setLabels(lData);
        setMembers(mData.members || []);
      } catch (e) {
        console.error('Failed to fetch metadata', e);
      }
    };
    fetchData();
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post(`/projects/${projectId}/cards`, {
        name,
        description,
        columnId,
        assigneeId: assigneeId || undefined,
        priorityId: priorityId || undefined,
        labelIds: selectedLabels
      });
      onCreated();
      onClose();
    } catch (e) {
      console.error('Failed to create card', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLabel = (id: string) => {
    setSelectedLabels(prev => 
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card w-full max-w-lg p-8 rounded-3xl shadow-2xl border border-border animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">New Card</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium ml-1">Card Title</label>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="What needs to be done?"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium ml-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              rows={3}
              placeholder="Add some details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-sm font-medium ml-1">Priority</label>
                <select 
                  value={priorityId}
                  onChange={(e) => setPriorityId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                >
                  <option value="">None</option>
                  {priorities.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
             </div>
             
             <div className="space-y-2">
                <label className="text-sm font-medium ml-1">Assignee</label>
                <select 
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                >
                  <option value="">Unassigned</option>
                  {members.map(m => (
                    <option key={m.user.id} value={m.user.id}>{m.user.name || m.user.email}</option>
                  ))}
                </select>
             </div>
          </div>

          <div className="space-y-2 relative">
             <label className="text-sm font-medium ml-1">Labels</label>
             <div 
               onClick={() => setIsLabelDropdownOpen(!isLabelDropdownOpen)}
               className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors flex flex-wrap gap-2 items-center min-h-[46px]"
             >
                {selectedLabels.length === 0 ? (
                  <span className="text-muted-foreground text-sm">Select labels...</span>
                ) : (
                  labels.filter(l => selectedLabels.includes(l.id)).map(label => (
                    <span
                      key={label.id}
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm"
                      style={{ backgroundColor: label.color, color: '#fff' }}
                    >
                      {label.name}
                    </span>
                  ))
                )}
             </div>

             {isLabelDropdownOpen && (
               <div className="absolute top-[100%] left-0 w-full mt-2 p-3 bg-card border border-border rounded-xl shadow-xl z-50 flex flex-col gap-2 max-h-48 overflow-y-auto">
                 {labels.length === 0 ? (
                    <span className="text-muted-foreground text-sm p-2 text-center">No labels available in this project.</span>
                 ) : (
                    labels.map(label => (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => toggleLabel(label.id)}
                        className={`flex flex-1 justify-between items-center px-3 py-2 rounded-lg text-sm font-bold transition-all border ${
                          selectedLabels.includes(label.id) 
                            ? 'ring-2 ring-primary ring-offset-1 ring-offset-card' 
                            : 'opacity-80 hover:opacity-100 hover:bg-secondary'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: label.color }} />
                          {label.name}
                        </div>
                        {selectedLabels.includes(label.id) && <span className="text-primary text-xs">Selected</span>}
                      </button>
                    ))
                 )}
               </div>
             )}
          </div>

          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-secondary rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name}
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

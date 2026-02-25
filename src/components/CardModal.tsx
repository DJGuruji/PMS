'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  Calendar, 
  User as UserIcon, 
  Tag, 
  AlertCircle, 
  History,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Trash2,
  AlertTriangle,
  Settings,
  Plus
} from 'lucide-react';
import api from '@/lib/api';
import { format, formatDistanceToNow } from 'date-fns';

interface TimelineStep {
  columnId: string;
  columnName: string;
  enteredAt: string;
  leftAt: string | null;
  durationMs: number;
  isCurrent?: boolean;
}

interface CardModalProps {
  cardId: string;
  onClose: () => void;
  onDeleted?: () => void;
}

export default function CardModal({ cardId, onClose, onDeleted }: CardModalProps) {
  const [timeline, setTimeline] = useState<any>(null);
  const [card, setCard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [priorities, setPriorities] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [selectedPriorityId, setSelectedPriorityId] = useState<string>('');
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          { data: timelineData }, 
          { data: cardData }
        ] = await Promise.all([
          api.get(`/cards/${cardId}/timeline`),
          api.get(`/cards/${cardId}`)
        ]);
        
        setTimeline(timelineData);
        setCard(cardData);
        setEditedName(cardData.name);
        setEditedDescription(cardData.description || '');
        setSelectedPriorityId(cardData.priorityId || '');
        setSelectedLabelIds(cardData.labels?.map((l: any) => l.id) || []);
        
        if (cardData.projectId) {
           const [pResp, lResp] = await Promise.all([
             api.get(`/projects/${cardData.projectId}/priorities`),
             api.get(`/projects/${cardData.projectId}/labels`)
           ]);
           setPriorities(pResp.data);
           setLabels(lResp.data);
        }
      } catch (e) {
        console.error('Failed to fetch card details', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [cardId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.patch(`/cards/${cardId}`, {
        name: editedName,
        description: editedDescription,
        priorityId: selectedPriorityId || null,
        labelIds: selectedLabelIds
      });
      setIsEditing(false);
      const { data } = await api.get(`/cards/${cardId}`);
      setCard(data);
    } catch (e) {
      console.error('Failed to save card', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/cards/${cardId}`);
      onDeleted?.();
      onClose();
    } catch (e) {
      console.error('Failed to delete card', e);
      setIsDeleting(false);
    }
  };

  const toggleLabel = (id: string) => {
    setSelectedLabelIds(prev => 
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-card w-full max-w-2xl h-[80vh] flex flex-col rounded-3xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="px-8 py-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 mr-4">
             <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                <History className="w-5 h-5" />
             </div>
             <div className="flex-1">
                {isEditing ? (
                  <input 
                    value={editedName} 
                    onChange={(e) => setEditedName(e.target.value)}
                    className="text-xl font-bold tracking-tight bg-secondary border border-border rounded px-2 py-1 outline-none w-full"
                    autoFocus
                  />
                ) : (
                  <h2 className="text-xl font-bold tracking-tight">{card?.name || 'Loading...'}</h2>
                )}
                <p className="text-xs text-muted-foreground">Lifecycle tracking for this task</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="hover:bg-destructive/10 p-2 rounded-lg transition-colors text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            {isEditing ? (
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-primary text-primary-foreground px-4 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/20"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </button>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="hover:bg-secondary p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 kanban-scrollbar relative">
          {showDeleteConfirm && (
            <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in zoom-in-95">
               <div className="bg-card p-8 rounded-3xl border border-border shadow-2xl max-w-sm text-center">
                  <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive mx-auto mb-6">
                     <AlertTriangle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Delete Card?</h3>
                  <p className="text-muted-foreground text-sm mb-8">This action cannot be undone. All history for this card will be permanently removed.</p>
                  <div className="flex gap-3">
                     <button 
                       onClick={() => setShowDeleteConfirm(false)}
                       className="flex-1 py-2.5 bg-secondary rounded-xl font-bold hover:bg-border transition-colors"
                     >
                        Cancel
                     </button>
                     <button 
                       onClick={handleDelete}
                       disabled={isDeleting}
                       className="flex-1 py-2.5 bg-destructive text-destructive-foreground rounded-xl font-bold shadow-lg shadow-destructive/20 hover:opacity-90 flex items-center justify-center gap-2"
                     >
                        {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Delete'}
                     </button>
                  </div>
               </div>
            </div>
          )}
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
               <Loader2 className="w-8 h-8 animate-spin text-primary" />
               <p className="text-sm text-muted-foreground">Fetching card details...</p>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Description Section */}
              <div className="space-y-3">
                 <h3 className="font-bold text-sm tracking-wide uppercase text-muted-foreground flex items-center gap-2">
                    Description
                 </h3>
                 {isEditing ? (
                    <textarea 
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-xl p-4 min-h-[100px] outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Add a detailed description..."
                    />
                 ) : (
                    <p className="text-foreground/80 leading-relaxed bg-secondary/30 p-4 rounded-xl border border-border/50">
                       {card?.description || <span className="italic text-muted-foreground">No description provided.</span>}
                    </p>
                 )}
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-3">
                    <h3 className="font-bold text-sm tracking-wide uppercase text-muted-foreground flex items-center gap-2">
                       Priority
                    </h3>
                    {isEditing ? (
                      <select 
                        value={selectedPriorityId}
                        onChange={(e) => setSelectedPriorityId(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                      >
                         <option value="">None</option>
                         {priorities.map(p => (
                           <option key={p.id} value={p.id}>{p.name}</option>
                         ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        {card?.priority ? (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            card.priority.weight >= 3 
                              ? 'bg-destructive/10 border-destructive/20 text-destructive' 
                              : card.priority.weight === 2 
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                          }`}>
                            {card.priority.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">No priority set</span>
                        )}
                      </div>
                    )}
                 </div>

                 <div className="space-y-3">
                    <h3 className="font-bold text-sm tracking-wide uppercase text-muted-foreground flex items-center gap-2">
                       Labels
                    </h3>
                    <div className="flex flex-wrap gap-2">
                       {isEditing ? (
                         labels.map(l => (
                           <button
                             key={l.id}
                             onClick={() => toggleLabel(l.id)}
                             className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${
                               selectedLabelIds.includes(l.id) 
                                 ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-105' 
                                 : 'opacity-40 hover:opacity-100'
                             }`}
                             style={{ backgroundColor: l.color, color: '#fff' }}
                           >
                             {l.name}
                           </button>
                         ))
                       ) : (
                         card?.labels?.length > 0 ? (
                            card.labels.map((l: any) => (
                              <span 
                                key={l.id} 
                                className="px-3 py-1 rounded-full text-[10px] font-bold border border-white/10"
                                style={{ backgroundColor: l.color, color: '#fff' }}
                              >
                                {l.name}
                              </span>
                            ))
                         ) : (
                            <span className="text-muted-foreground italic text-sm">No labels</span>
                         )
                       )}
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6">
                 <div className="bg-secondary/50 p-6 rounded-2xl border border-border/50">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Total Active Time</p>
                    <p className="text-2xl font-black text-primary font-mono">
                       {Math.floor((timeline?.totalTimeSeconds || 0) / 3600)}h {Math.floor(((timeline?.totalTimeSeconds || 0) % 3600) / 60)}m
                    </p>
                 </div>
                 <div className="bg-secondary/50 p-6 rounded-2xl border border-border/50">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Current Status</p>
                    <p className="text-2xl font-bold flex items-center gap-2">
                       <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                       {timeline?.timeline?.[timeline?.timeline?.length - 1]?.columnName || 'Active'}
                    </p>
                 </div>
              </div>

              {/* Visualization */}
              <div className="space-y-6">
                <h3 className="font-bold text-sm tracking-wide uppercase text-muted-foreground flex items-center gap-2">
                   <Clock className="w-4 h-4" /> Movement History
                </h3>
                
                <div className="relative space-y-4">
                   <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-border -z-10" />
                   
                   {timeline.timeline.map((step: any, index: number) => (
                      <div key={index} className="flex gap-6 group">
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-4 border-card transition-all ${
                            step.isCurrent ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/10' : 'bg-secondary text-muted-foreground group-hover:bg-border'
                         }`}>
                            {index === 0 ? <Plus className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                         </div>
                         
                         <div className="flex-1 bg-secondary/30 rounded-2xl p-5 border border-border/50 group-hover:border-primary/20 transition-all">
                            <div className="flex justify-between items-start mb-1">
                               <h4 className="font-bold text-lg">{step.columnName}</h4>
                               <span className="text-xs font-mono font-bold bg-secondary px-2 py-1 rounded-md text-muted-foreground">
                                  {Math.floor(step.durationSeconds / 60)} min
                               </span>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-4">
                               <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Entered {format(new Date(step.enteredAt), 'MMM d, HH:mm')}</span>
                               {step.leftAt && (
                                 <span className="flex items-center gap-1 border-l border-border pl-4">Left {format(new Date(step.leftAt), 'HH:mm')}</span>
                               )}
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

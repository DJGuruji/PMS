'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  Plus, 
  MoreVertical, 
  MessageSquare, 
  Paperclip, 
  Clock, 
  User as UserIcon,
  Tag,
  AlertCircle,
  Loader2,
  Filter,
  Users,
  Settings,
  ArrowLeft,
  Calendar,
  Trash2,
  BarChart3
} from 'lucide-react';
import api from '@/lib/api';
import { format } from 'date-fns';
import Link from 'next/link';
import CardModal from '@/components/CardModal';
import CreateCardModal from '@/components/CreateCardModal';
import ProjectStatsModal from '@/components/ProjectStatsModal';
import ProjectSettingsModal from '@/components/ProjectSettingsModal';

interface Card {
  id: string;
  name: string;
  description: string | null;
  order: number;
  columnId: string;
  createdAt: string;
  assignee: { id: string; name: string; email: string } | null;
  priority: { id: string; name: string; weight: number } | null;
  labels: { id: string; name: string; color: string }[];
}

interface Column {
  id: string;
  name: string;
  order: number;
  cards: Card[];
}

export default function KanbanBoard() {
  const { id: projectId } = useParams();
  const [columns, setColumns] = useState<Column[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<any>(null);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [creatingColumnId, setCreatingColumnId] = useState<string | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const fetchBoard = useCallback(async () => {
    try {
      const [{ data: boardData }, { data: projectData }] = await Promise.all([
        api.get(`/projects/${projectId}/board`),
        api.get(`/projects/${projectId}`)
      ]);
      setColumns(boardData);
      setProject(projectData);
    } catch (e) {
      console.error('Failed to fetch board', e);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const updateColumnName = async (columnId: string) => {
    if (!newColumnName.trim()) {
      setEditingColumnId(null);
      return;
    }
    try {
      await api.patch(`/columns/${columnId}`, { name: newColumnName });
      setEditingColumnId(null);
      fetchBoard();
    } catch (e) {
      console.error('Failed to update column', e);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Optimistic update
    const newColumns = [...columns];
    const sourceCol = newColumns.find(col => col.id === source.droppableId);
    const destCol = newColumns.find(col => col.id === destination.droppableId);

    if (!sourceCol || !destCol) return;

    const [movedCard] = sourceCol.cards.splice(source.index, 1);
    destCol.cards.splice(destination.index, 0, { ...movedCard, columnId: destination.droppableId });

    setColumns(newColumns);

    // Sync with API
    try {
      await api.patch(`/cards/${draggableId}/move`, {
        columnId: destination.droppableId,
        order: destination.index
      });
    } catch (e) {
      console.error('Failed to sync drag', e);
      fetchBoard(); // Revert on failure
    }
  };

  const addColumn = async () => {
    try {
      await api.post(`/projects/${projectId}/columns`, {
        name: 'New Column',
        order: columns.length
      });
      fetchBoard();
    } catch (e) {
      console.error('Failed to add column', e);
    }
  };

  const deleteColumn = async (columnId: string) => {
    const col = columns.find(c => c.id === columnId);
    if (col && col.cards.length > 0) {
      alert('Cannot delete a column that contains cards. Please move or delete the cards first.');
      return;
    }
    if (!confirm('Are you sure you want to delete this column?')) return;
    
    try {
      await api.delete(`/columns/${columnId}`);
      fetchBoard();
    } catch (e) {
      console.error('Failed to delete column', e);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Synchronizing board state...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Board Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-secondary rounded-lg transition-colors">
             <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project?.name}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
               <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Started {format(new Date(project?.createdAt), 'MMM d, yyyy')}</span>
               <span className="flex items-center gap-1.5 border-l border-border pl-3"><Users className="w-3.5 h-3.5" /> {project?._count?.members} members</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <button className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-xl text-sm font-medium hover:bg-border transition-all">
              <Filter className="w-4 h-4" /> Filter
           </button>
           <button 
             onClick={() => setShowStats(true)}
             className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-xl text-sm font-medium hover:bg-border transition-all"
           >
              <BarChart3 className="w-4 h-4" /> Stats
           </button>
           <button 
             onClick={() => setShowSettings(true)}
             className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-xl text-sm font-medium hover:bg-border transition-all"
           >
              <Settings className="w-4 h-4" /> Settings
           </button>
           <button 
             onClick={() => setCreatingColumnId(columns[0]?.id)}
             className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
           >
              <Plus className="w-4 h-4" /> New Card
           </button>
        </div>
      </div>

      {/* Kanban Scroll Area */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 flex gap-6 overflow-x-auto pb-6 -mx-2 px-2 kanban-scrollbar">
          {columns.map((column) => (
            <div key={column.id} className="w-[320px] shrink-0 flex flex-col h-full bg-secondary/30 rounded-3xl border border-border/50">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5 flex-1 mr-2">
                  {editingColumnId === column.id ? (
                    <input
                      autoFocus
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      onBlur={() => updateColumnName(column.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') updateColumnName(column.id);
                        if (e.key === 'Escape') setEditingColumnId(null);
                      }}
                      className="bg-secondary border border-primary/30 rounded px-2 py-0.5 text-sm font-bold w-full outline-none"
                    />
                  ) : (
                    <h3 
                      onDoubleClick={() => {
                        setEditingColumnId(column.id);
                        setNewColumnName(column.name);
                      }}
                      className="font-bold text-sm tracking-wide uppercase text-muted-foreground cursor-text hover:text-foreground transition-colors"
                    >
                      {column.name}
                    </h3>
                  )}
                  <span className="bg-secondary px-2 py-0.5 rounded-full text-[10px] font-bold text-muted-foreground border border-border shrink-0">
                    {column.cards.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                   <button 
                     onClick={() => deleteColumn(column.id)}
                     className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors text-muted-foreground"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                   <button className="p-1.5 hover:bg-border rounded-lg transition-colors text-muted-foreground">
                     <MoreVertical className="w-4 h-4" />
                   </button>
                </div>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex-1 p-3 space-y-3 transition-colors duration-200 ${
                      snapshot.isDraggingOver ? 'bg-primary/5' : ''
                    }`}
                  >
                    {column.cards.map((card, index) => (
                      <Draggable key={card.id} draggableId={card.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => setSelectedCardId(card.id)}
                            className={`bg-card p-4 rounded-2xl border border-border shadow-sm group hover:shadow-md hover:border-primary/30 transition-all ${
                              snapshot.isDragging ? 'rotate-2 scale-105 shadow-2xl z-50 ring-2 ring-primary/20' : ''
                            }`}
                          >
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {card.priority && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  card.priority.weight >= 3 
                                    ? 'bg-destructive/10 border-destructive/20 text-destructive' 
                                    : card.priority.weight === 2 
                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                }`}>
                                  {card.priority.name}
                                </span>
                              )}
                              {card.labels.map(label => (
                                <span 
                                  key={label.id} 
                                  className="w-8 h-1.5 rounded-full" 
                                  style={{ backgroundColor: label.color }}
                                />
                              ))}
                            </div>

                            <h4 className="font-bold text-sm leading-tight group-hover:text-primary transition-colors cursor-pointer">{card.name}</h4>
                            {card.description && (
                              <p className="text-muted-foreground text-[11px] mt-1 line-clamp-2">{card.description}</p>
                            )}

                            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-muted-foreground">
                               <div className="flex items-center gap-3">
                                  {card.assignee ? (
                                    <div className="flex items-center gap-1.5 cursor-help" title={card.assignee.name}>
                                       <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center text-[8px] font-bold text-primary border border-primary/20">
                                          {card.assignee.name[0].toUpperCase()}
                                       </div>
                                    </div>
                                  ) : (
                                    <div className="p-1 border border-dashed border-border rounded-full cursor-help hover:border-muted-foreground transition-colors" title="Unassigned">
                                       <UserIcon className="w-3 h-3" />
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 text-[10px] font-medium">
                                     <Clock className="w-3 h-3" />
                                     {format(new Date(card.createdAt), 'MMM d')}
                                  </div>
                               </div>
                               
                               <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1 text-[10px]">
                                     <MessageSquare className="w-3 h-3" />
                                     <span>2</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px]">
                                     <Paperclip className="w-3 h-3" />
                                     <span>1</span>
                                  </div>
                               </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              
              <div className="p-3">
                 <button 
                   onClick={() => setCreatingColumnId(column.id)}
                   className="w-full py-2 hover:bg-secondary rounded-xl text-xs font-bold text-muted-foreground transition-all flex items-center justify-center gap-2 group"
                 >
                    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Add Card
                 </button>
              </div>
            </div>
          ))}

          {/* New Column Placeholder */}
          <div 
            onClick={addColumn}
            className="w-[320px] shrink-0 h-40 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-muted-foreground hover:bg-secondary/20 hover:border-primary/30 transition-all cursor-pointer group"
          >
             <Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
             <span className="font-bold text-sm tracking-wide uppercase">New Column</span>
          </div>
        </div>
      </DragDropContext>

      {selectedCardId && (
        <CardModal 
          cardId={selectedCardId} 
          onClose={() => setSelectedCardId(null)} 
          onDeleted={fetchBoard}
        />
      )}

      {creatingColumnId && (
        <CreateCardModal
          projectId={projectId as string}
          columnId={creatingColumnId}
          onClose={() => setCreatingColumnId(null)}
          onCreated={fetchBoard}
        />
      )}

      {showStats && (
        <ProjectStatsModal
          projectId={projectId as string}
          onClose={() => setShowStats(false)}
        />
      )}

      {showSettings && (
        <ProjectSettingsModal
          projectId={projectId as string}
          onClose={() => setShowSettings(false)}
          onUpdated={fetchBoard}
        />
      )}
    </div>
  );
}

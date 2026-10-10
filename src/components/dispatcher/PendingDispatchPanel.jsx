import React, { useState } from 'react';
import { 
  Filter, 
  X, 
  Search, 
  SlidersHorizontal, 
  LayoutList, 
  ArrowUpDown, 
  Layers, 
  MoreVertical, 
  Info, 
  Flag, 
  ChevronLeft, 
  ChevronRight,
  AlertTriangle,
  Link,
  CheckSquare,
  Square
} from 'lucide-react';

export default function PendingDispatchPanel({
  tasks = [],
  selectedTaskId,
  onSelectTask,
  onInspectTask,
  onAssignTask
}) {
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showOnlyConflicts, setShowOnlyConflicts] = useState(false);

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = 
      t.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(filterQuery.toLowerCase()) ||
      t.location.toLowerCase().includes(filterQuery.toLowerCase());
    
    if (showOnlyConflicts) {
      return matchesSearch && t.hasConflict;
    }
    return matchesSearch;
  });

  const allSelected = filteredTasks.length > 0 && filteredTasks.every(t => selectedIds.has(t.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const toggleSelectTask = (e, id) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  return (
    <div className="w-80 bg-[#F3F4F6] border-r border-slate-300 flex flex-col shrink-0 select-none text-xs h-full">
      {/* Top Filter Header Bar */}
      <div className="p-2.5 pb-2 border-b border-slate-200/80 space-y-2 bg-[#F3F4F6]">
        {/* Filter Chip + View Icons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 text-[11px] font-medium shadow-2xs">
            <Filter className="w-3 h-3 text-slate-500" />
            <span>Pending Dispatch</span>
            <button 
              onClick={() => setFilterQuery('')}
              className="text-slate-400 hover:text-slate-700 ml-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-1 text-slate-500">
            <button className="p-1 hover:text-slate-800 hover:bg-slate-200 rounded transition" title="List View">
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 hover:text-slate-800 hover:bg-slate-200 rounded transition" title="Sort Order">
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setShowOnlyConflicts(prev => !prev)}
              className={`p-1 rounded transition ${
                showOnlyConflicts ? 'bg-amber-100 text-amber-800' : 'hover:text-slate-800 hover:bg-slate-200'
              }`}
              title="Toggle Conflicted Tasks"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search Input matching reference */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search tasks"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded pl-7 pr-3 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-500 shadow-2xs"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
        </div>

        {/* Select All, Bundle, More Options Row */}
        <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5 px-0.5">
          <label className="flex items-center gap-1.5 cursor-pointer font-medium hover:text-slate-900">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
            />
            <span>Select All</span>
          </label>

          <div className="flex items-center gap-2">
            <button 
              disabled={selectedIds.size < 2}
              className={`flex items-center gap-1 font-medium transition ${
                selectedIds.size >= 2 ? 'text-blue-600 hover:text-blue-700' : 'text-slate-400 cursor-not-allowed'
              }`}
              title="Bundle multiple tasks into one route"
            >
              <Link className="w-3 h-3 rotate-45" />
              <span>Bundle</span>
            </button>
            <button className="text-slate-500 hover:text-slate-800">
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Task Cards List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredTasks.map((task) => {
          const isSelected = selectedTaskId === task.id;
          const isChecked = selectedIds.has(task.id);

          return (
            <div
              key={task.id}
              onClick={() => onSelectTask?.(task)}
              className={`p-2.5 rounded border transition-all cursor-pointer relative bg-white ${
                isSelected
                  ? 'border-blue-500 ring-1 ring-blue-500/30 shadow-xs'
                  : 'border-slate-200/90 hover:border-slate-300 hover:shadow-2xs'
              }`}
            >
              {/* Card Header: Checkbox, Task ID, Info, Flag, Options */}
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => toggleSelectTask(e, task.id)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span className="font-semibold text-blue-600 hover:underline">
                    {task.id}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-400">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectTask?.(task);
                    }}
                    className="hover:text-slate-700"
                    title="Inspect details and diagnostic notes"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                  <button className="hover:text-amber-600" title="Flag task">
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                  <button className="hover:text-slate-700">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Task Title */}
              <h3 className="font-semibold text-slate-900 text-xs mt-1 leading-snug line-clamp-1">
                {task.title}
              </h3>

              {/* Location / Site */}
              <p className="text-[11px] text-slate-500 mt-0.5">
                {task.site}
              </p>

              {/* Status and Conflict Indicators */}
              <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-[11px] text-slate-600 font-medium">
                  {task.status}
                </span>

                {task.hasConflict ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Conflict
                  </span>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssignTask?.(task);
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-medium hover:underline"
                  >
                    Assign Now →
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="p-6 text-center text-slate-400 text-xs">
            No pending tasks found matching your filter.
          </div>
        )}
      </div>

      {/* Panel Bottom Footer Pagination */}
      <div className="h-9 px-3 border-t border-slate-300 bg-[#E5E6EA] flex items-center justify-between text-[11px] text-slate-600 shrink-0">
        <span>Showing 1-{filteredTasks.length} of {tasks.length}</span>
        <div className="flex items-center gap-2">
          <button className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-40" disabled>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-40" disabled>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

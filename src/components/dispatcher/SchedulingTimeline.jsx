import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  ArrowUpDown, 
  Info, 
  MapPin, 
  MoreVertical, 
  Wrench, 
  Network, 
  ClipboardCheck, 
  AlertCircle,
  Clock,
  User,
  Users
} from 'lucide-react';

const HOURS = [
  '08:00:00',
  '09:00:00',
  '10:00:00',
  '11:00:00',
  '12:00:00',
  '13:00:00',
  '14:00:00',
  '15:00:00',
  '16:00:00'
];

export default function SchedulingTimeline({
  technicians = [],
  onSelectScheduledTask,
  onAssignToTech
}) {
  const [selectedDate, setSelectedDate] = useState('Thursday November 28 2024');
  const [resourceSearch, setResourceSearch] = useState('');
  const [showAllRoutes, setShowAllRoutes] = useState(true);

  // Time window: 08:00 (8.0) to 16:00 (16.0) => 8 hours span
  const START_HOUR = 8.0;
  const TOTAL_HOURS = 8.0;

  const filteredTechnicians = technicians.filter(tech =>
    tech.name.toLowerCase().includes(resourceSearch.toLowerCase()) ||
    tech.skills?.some(s => s.toLowerCase().includes(resourceSearch.toLowerCase()))
  );

  const getTaskIcon = (type) => {
    switch (type) {
      case 'wrench': return <Wrench className="w-3 h-3 text-slate-700 shrink-0" />;
      case 'network': return <Network className="w-3 h-3 text-slate-700 shrink-0" />;
      case 'clipboard': return <ClipboardCheck className="w-3 h-3 text-slate-700 shrink-0" />;
      default: return <Clock className="w-3 h-3 text-slate-700 shrink-0" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden select-none text-xs">
      {/* Upper Timeline Control Header matching reference */}
      <div className="h-10 px-3 border-b border-slate-300 flex items-center justify-between bg-[#F8F9FA] shrink-0">
        {/* Left: Date controls */}
        <div className="flex items-center gap-2">
          <button 
            className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-800 text-xs font-semibold shadow-2xs transition"
          >
            Today
          </button>

          <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-white shadow-2xs">
            <button className="p-1 hover:bg-slate-100 text-slate-600 border-r border-slate-300 transition">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 hover:bg-slate-100 text-slate-600 transition">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1 font-semibold text-slate-800 cursor-pointer hover:text-blue-600">
            <span>{selectedDate}</span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </div>
        </div>

        {/* Right: Quick stats */}
        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          <span>Active Shift: <strong>08:00 - 17:00 PST</strong></span>
          <span className="hidden md:inline border-l border-slate-300 pl-3">Sync State: <strong className="text-emerald-600 font-semibold">Live Simulation</strong></span>
        </div>
      </div>

      {/* Resource & Time Axis Header Row */}
      <div className="h-8 border-b border-slate-300 bg-[#ECEEF1] flex items-center shrink-0">
        {/* Resource search column header */}
        <div className="w-48 px-2 flex items-center justify-between border-r border-slate-300 shrink-0">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search resources"
              value={resourceSearch}
              onChange={(e) => setResourceSearch(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded pl-6 pr-2 py-0.5 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            <Search className="w-3 h-3 text-slate-400 absolute left-1.5 top-1/2 -translate-y-1/2" />
          </div>
          <button className="ml-1 text-slate-500 hover:text-slate-800" title="Sort Resources">
            <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>

        {/* Hourly columns headers */}
        <div className="flex-1 flex">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="flex-1 px-2 text-[11px] font-medium text-slate-600 border-r border-slate-200/80 flex items-center justify-start tracking-tight"
            >
              {hour}
            </div>
          ))}
        </div>
      </div>

      {/* Assignment Group Header Sub-row */}
      <div className="h-7 bg-[#F4F5F7] border-b border-slate-300 flex items-center justify-between px-3 text-[11px] text-slate-700 shrink-0">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 font-semibold text-slate-900 hover:text-blue-600">
            <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
            <span>San Francisco Technicians</span>
          </button>
          <Info className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
          
          <label className="flex items-center gap-1 ml-4 cursor-pointer text-slate-600 hover:text-slate-900 font-normal">
            <input
              type="checkbox"
              checked={showAllRoutes}
              onChange={(e) => setShowAllRoutes(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
            />
            <span>Show all routes</span>
          </label>
        </div>

        <div className="flex items-center gap-4 text-slate-600">
          <span>Tasks <strong className="text-slate-900 font-semibold">8</strong></span>
          <span>Work <strong className="text-blue-700 font-semibold">19hr 30m</strong></span>
        </div>
      </div>

      {/* Technician Schedule Rows (Scrollable vertical list) */}
      <div className="flex-1 overflow-y-auto">
        {filteredTechnicians.map((tech) => (
          <div
            key={tech.id}
            className="h-12 border-b border-slate-200 flex items-center hover:bg-slate-50/60 transition group relative"
          >
            {/* Left Fixed Technician Info Column */}
            <div className="w-48 px-2.5 h-full flex items-center justify-between border-r border-slate-300 bg-white shrink-0 group-hover:bg-slate-50/80">
              <div className="flex items-center gap-2 overflow-hidden">
                {/* Avatar with Status Dot */}
                <div className="relative shrink-0">
                  <img
                    src={tech.avatar}
                    alt={tech.name}
                    className="w-6 h-6 rounded-full object-cover border border-slate-300"
                  />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                    tech.status === 'Available' ? 'bg-emerald-500' : 'bg-blue-500'
                  }`} />
                </div>

                {/* Name & Crew info */}
                <div className="truncate">
                  <span className="font-medium text-slate-800 text-[11px] truncate block leading-tight">
                    {tech.name}
                  </span>
                  {tech.isCrew && (
                    <span className="text-[10px] text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                      {tech.membersCount} members
                    </span>
                  )}
                </div>
              </div>

              {/* Action icons */}
              <div className="flex items-center gap-1 text-slate-400 shrink-0">
                <button className="hover:text-slate-700" title="Technician Details">
                  <Info className="w-3 h-3" />
                </button>
                <button className="hover:text-blue-600" title={`Current: ${tech.currentLocation}`}>
                  <MapPin className="w-3 h-3" />
                </button>
                <button className="hover:text-slate-700">
                  <MoreVertical className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Right Schedule Grid Timeline with vertical hour separators */}
            <div className="flex-1 h-full relative flex items-center">
              {/* Background hourly vertical column divider lines */}
              <div className="absolute inset-0 flex pointer-events-none">
                {HOURS.map((h, i) => (
                  <div key={h} className="flex-1 border-r border-slate-200/60 h-full" />
                ))}
              </div>

              {/* Render Scheduled Tasks */}
              {tech.schedule.map((job) => {
                // Calculate position percentage: (job.startHour - START_HOUR) / TOTAL_HOURS * 100
                const leftPercent = Math.max(0, ((job.startHour - START_HOUR) / TOTAL_HOURS) * 100);
                const widthPercent = (job.durationHours / TOTAL_HOURS) * 100;

                // Travel line width if route is shown
                const travelLineWidth = job.travelMinutes ? (job.travelMinutes / (TOTAL_HOURS * 60)) * 100 : 0;
                const travelLineLeft = Math.max(0, leftPercent - travelLineWidth);

                const isTeal = job.color === 'teal';

                return (
                  <React.Fragment key={job.id}>
                    {/* Travel route lead line matching screenshot */}
                    {showAllRoutes && travelLineWidth > 0 && (
                      <div
                        className="absolute h-0.5 bg-[#8C7DA7] z-10 flex items-center"
                        style={{
                          left: `${travelLineLeft}%`,
                          width: `${travelLineWidth}%`
                        }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-[#8C7DA7] -ml-0.5" />
                      </div>
                    )}

                    {/* Scheduled Work Order Card */}
                    <div
                      onClick={() => onSelectScheduledTask?.(job, tech)}
                      className={`absolute h-8 rounded px-2 flex items-center gap-1.5 z-20 cursor-pointer transition shadow-2xs border text-[11px] ${
                        isTeal
                          ? 'bg-[#B7D0DA] border-[#91B5C3] text-slate-900 hover:brightness-95'
                          : 'bg-[#DED8EC] border-[#C7BDDD] text-slate-900 hover:brightness-95'
                      }`}
                      style={{
                        left: `${leftPercent}%`,
                        width: `${Math.min(widthPercent, 98 - leftPercent)}%`
                      }}
                      title={`${job.title} (${job.taskId}) - ${job.location}`}
                    >
                      {getTaskIcon(job.type)}
                      
                      <div className="truncate flex flex-col leading-tight">
                        <span className="font-semibold text-slate-900 truncate">
                          {job.title}
                        </span>
                        <span className="text-[10px] text-slate-700 tracking-tight">
                          {job.taskId}
                        </span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer info matching reference screenshot */}
      <div className="h-7 px-3 bg-[#E5E6EA] border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
        <span>Showing 1-{filteredTechnicians.length} of {technicians.length} resources</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#DED8EC] border border-[#C7BDDD]" /> Standard Assignment
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#B7D0DA] border border-[#91B5C3]" /> Active Assignment
          </span>
        </div>
      </div>
    </div>
  );
}

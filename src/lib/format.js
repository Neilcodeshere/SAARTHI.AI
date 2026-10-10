const IST = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});

/** DD/MM/YYYY, HH:MM:SS IST */
export function formatIST(iso) {
  if (!iso) return '—';
  return `${IST.format(new Date(iso))} IST`;
}

export const STATUS_STYLE = {
  Assigned: { badge: 'bg-sky-50 text-sky-800 ring-sky-200', color: '#0284c7' },
  'In Progress': { badge: 'bg-amber-50 text-amber-800 ring-amber-200', color: '#d97706' },
  'Awaiting Parts': { badge: 'bg-violet-50 text-violet-800 ring-violet-200', color: '#7c3aed' },
  Completed: { badge: 'bg-emerald-50 text-emerald-800 ring-emerald-200', color: '#059669' },
  'Requires Supervisor Review': { badge: 'bg-rose-50 text-rose-800 ring-rose-200', color: '#e11d48' },
};

export const OUTCOME_STYLE = {
  APPLIED: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  MERGED: 'bg-teal-50 text-teal-800 ring-teal-200',
  DUPLICATE: 'bg-slate-100 text-slate-700 ring-slate-200',
  REJECTED: 'bg-rose-50 text-rose-800 ring-rose-200',
  HELD_FOR_REVIEW: 'bg-orange-50 text-orange-800 ring-orange-200',
  FLAGGED: 'bg-yellow-50 text-yellow-800 ring-yellow-300',
  RESOLVED: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  INFO: 'bg-slate-100 text-slate-700 ring-slate-200',
};

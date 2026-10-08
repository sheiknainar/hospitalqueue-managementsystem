import React from 'react';
import { QueueStatus, AppointmentStatus } from '../../types/database';

interface StatusBadgeProps {
  status: QueueStatus | AppointmentStatus;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; dot: string; pulse?: boolean }
> = {
  waiting: {
    label: 'Waiting',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  called: {
    label: 'Called (Now)',
    bg: 'bg-sky-50 border-sky-300',
    text: 'text-sky-700 font-semibold',
    dot: 'bg-sky-500',
    pulse: true,
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-indigo-50 border-indigo-200',
    text: 'text-indigo-700 font-semibold',
    dot: 'bg-indigo-500',
    pulse: true,
  },
  completed: {
    label: 'Completed',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  skipped: {
    label: 'Skipped',
    bg: 'bg-orange-50 border-orange-200',
    text: 'text-orange-700',
    dot: 'bg-orange-400',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-rose-50 border-rose-200',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
  },
  booked: {
    label: 'Booked',
    bg: 'bg-slate-100 border-slate-200',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = statusConfig[status] || statusConfig.booked;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.bg} ${config.text} ${sizeClasses[size]}`}
    >
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dot}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
      </span>
      {config.label}
    </span>
  );
};

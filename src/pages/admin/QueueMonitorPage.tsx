import React, { useState, useEffect } from 'react';
import { Layers, Stethoscope, Clock, Users, ArrowRight, RefreshCw } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { queueService } from '../../services/queueService';
import { hospitalService } from '../../services/hospitalService';
import { QueueEntry, Doctor } from '../../types/database';

export const QueueMonitorPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [entries, docs] = await Promise.all([
        queueService.getHospitalQueue(selectedDate),
        hospitalService.getDoctors(),
      ]);
      setQueueEntries(entries);
      setDoctors(docs);
    } catch (err) {
      console.error('Failed to load queue monitor data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to realtime queue events
    const unsubscribe = queueService.subscribeToQueueChanges(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [selectedDate]);

  // Group entries by doctor
  const doctorQueues = doctors.map(doctor => {
    const entries = queueEntries.filter(e => e.doctor_id === doctor.id);
    const currentEntry = entries.find(e => e.status === 'in_progress' || e.status === 'called');
    const waitingEntries = entries.filter(e => e.status === 'waiting');
    const completedEntries = entries.filter(e => e.status === 'completed');

    return {
      doctor,
      entries,
      currentEntry,
      waitingEntries,
      completedEntries,
      nextEntry: waitingEntries[0] || null,
    };
  });

  if (loading) {
    return <LoadingSpinner message="Loading hospital live queue board..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header & Date picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold mb-2 border border-brand-200">
            <span className="w-2 h-2 rounded-full bg-brand-600 animate-ping" />
            Live Queue Monitor
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Hospital Queue Board</h2>
          <p className="text-sm text-slate-500">
            Real-time OPD token display for outpatient waiting areas and department monitors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 shadow-xs"
          />
          <button
            onClick={loadData}
            className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 shadow-xs"
            title="Refresh Board"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Doctor Queue Cards */}
      {doctors.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No doctors configured"
          description="Add doctors to the hospital to activate queue monitoring."
          actionText="Add Doctor"
          onAction={() => (window.location.href = '/admin/doctors')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctorQueues.map(({ doctor, currentEntry, waitingEntries, completedEntries, nextEntry, entries }) => (
            <div
              key={doctor.id}
              className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col"
            >
              {/* Doctor header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-800">
                      Dr. {doctor.profile?.full_name}
                    </h3>
                    <p className="text-xs font-semibold text-brand-600">{doctor.specialization}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{doctor.department?.name}</p>
                  </div>
                  <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                    {entries.length} booked
                  </span>
                </div>
              </div>

              {/* Central Token Highlight */}
              <div className="p-6 text-center bg-gradient-to-b from-white to-slate-50/50 flex-1 flex flex-col items-center justify-center border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Current Token Serving
                </span>

                {currentEntry ? (
                  <div className="my-2">
                    <div className="text-5xl font-black text-brand-600 tracking-tight animate-token-pulse inline-block px-6 py-2 rounded-2xl bg-brand-50 border border-brand-200">
                      #{currentEntry.token_number}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mt-2">
                      {currentEntry.patient?.profile?.full_name}
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={currentEntry.status} size="sm" />
                    </div>
                  </div>
                ) : (
                  <div className="my-4 py-4 text-slate-400 text-sm font-medium">
                    No patient currently called
                  </div>
                )}
              </div>

              {/* Next in Queue & Stats */}
              <div className="p-4 bg-white text-xs space-y-2">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 font-medium">Next Patient:</span>
                  <span className="font-bold text-slate-800">
                    {nextEntry
                      ? `#${nextEntry.token_number} (${nextEntry.patient?.profile?.full_name})`
                      : 'None waiting'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center pt-1">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-100">
                    <span className="block font-bold text-base">{waitingEntries.length}</span>
                    <span className="text-[10px] uppercase font-semibold">Waiting</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100">
                    <span className="block font-bold text-base">{completedEntries.length}</span>
                    <span className="text-[10px] uppercase font-semibold">Completed</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

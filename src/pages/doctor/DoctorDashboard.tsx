import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  PhoneCall,
  Play,
  CheckCircle2,
  SkipForward,
  Clock,
  User,
  Phone,
  Calendar,
  AlertCircle,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { EmptyState } from '../../components/common/EmptyState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { queueService } from '../../services/queueService';
import { hospitalService } from '../../services/hospitalService';
import { QueueEntry, Doctor } from '../../types/database';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [currentDoctor, setCurrentDoctor] = useState<Doctor | null>(null);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'waiting' | 'completed' | 'skipped'>('waiting');
  const [actionLoading, setActionLoading] = useState(false);
  const [todayDate] = useState(new Date().toISOString().split('T')[0]);

  const loadDoctorAndQueue = async () => {
    try {
      // Find doctor record matching logged in profile
      const doctors = await hospitalService.getDoctors();
      const matched = doctors.find(d => d.profile_id === user?.id) || doctors[0] || null;
      setCurrentDoctor(matched);

      if (matched) {
        const queue = await queueService.getDoctorQueue(matched.id, todayDate);
        setQueueEntries(queue);
      }
    } catch (err) {
      console.error('Failed to load doctor queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorAndQueue();

    // Subscribe to realtime updates
    const unsubscribe = queueService.subscribeToQueueChanges(() => {
      if (currentDoctor) {
        queueService.getDoctorQueue(currentDoctor.id, todayDate).then(setQueueEntries);
      }
    });
    return () => unsubscribe();
  }, [user, todayDate]);

  // Derived queue lists
  const currentPatient = queueEntries.find(
    e => e.status === 'in_progress' || e.status === 'called'
  );
  const waitingPatients = queueEntries.filter(e => e.status === 'waiting');
  const completedPatients = queueEntries.filter(e => e.status === 'completed');
  const skippedPatients = queueEntries.filter(e => e.status === 'skipped');

  // Next patient to call
  const nextPatient = waitingPatients[0] || null;

  // Queue actions
  const handleCallNext = async () => {
    if (!nextPatient) return;
    setActionLoading(true);
    try {
      await queueService.updateQueueStatus(nextPatient.id, 'called');
      await loadDoctorAndQueue();
    } catch (err) {
      console.error('Failed to call next patient', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartConsultation = async () => {
    if (!currentPatient) return;
    setActionLoading(true);
    try {
      await queueService.updateQueueStatus(currentPatient.id, 'in_progress');
      await loadDoctorAndQueue();
    } catch (err) {
      console.error('Failed to start consultation', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteConsultation = async () => {
    if (!currentPatient) return;
    setActionLoading(true);
    try {
      await queueService.updateQueueStatus(
        currentPatient.id,
        'completed',
        currentPatient.appointment_id
      );
      await loadDoctorAndQueue();
    } catch (err) {
      console.error('Failed to complete consultation', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkipPatient = async () => {
    if (!currentPatient) return;
    if (!window.confirm(`Skip Token #${currentPatient.token_number}?`)) return;
    setActionLoading(true);
    try {
      await queueService.updateQueueStatus(currentPatient.id, 'skipped');
      await loadDoctorAndQueue();
    } catch (err) {
      console.error('Failed to skip patient', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading doctor OPD console..." />;
  }

  if (!currentDoctor) {
    return (
      <EmptyState
        icon={Stethoscope}
        title="Doctor Profile Not Found"
        description="No active doctor record is assigned to your account. Please ask the Hospital Admin to create your doctor profile."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Doctor Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-500 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
            {currentDoctor.profile?.full_name?.charAt(0) || 'D'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800">
                Dr. {currentDoctor.profile?.full_name}
              </h2>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
                Active OPD
              </span>
            </div>
            <p className="text-xs text-brand-600 font-semibold mt-0.5">
              {currentDoctor.specialization} &bull; {currentDoctor.department?.name || 'General OPD'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDoctorAndQueue}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shadow-xs"
            title="Refresh Queue"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
            Today: {new Date(todayDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ACTIVE TOKEN & CURRENT PATIENT CONSOLE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Serving Box */}
        <div className="bg-gradient-to-br from-brand-700 to-primary-800 rounded-2xl p-6 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-200">
                Current Token
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-xs">
                {currentPatient ? currentPatient.status.toUpperCase() : 'IDLE'}
              </span>
            </div>

            <div className="my-6 text-center">
              {currentPatient ? (
                <div>
                  <div className="text-6xl font-black tracking-tight text-white drop-shadow-sm">
                    #{currentPatient.token_number}
                  </div>
                  <p className="text-lg font-bold text-brand-100 mt-2">
                    {currentPatient.patient?.profile?.full_name}
                  </p>
                  <p className="text-xs text-brand-200 mt-0.5">
                    Appointment: {currentPatient.appointment?.appointment_time}
                  </p>
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/15 text-white backdrop-blur-xs border border-white/20">
                    <MessageSquare className="w-3 h-3 text-emerald-300" />
                    <span>SMS & WhatsApp Alert Sent</span>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-brand-200 text-sm">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-60" />
                  No patient currently called. Ready for next patient.
                </div>
              )}
            </div>
          </div>

          {/* Action Control Buttons */}
          <div className="space-y-2 pt-4 border-t border-white/20">
            {currentPatient ? (
              <div className="grid grid-cols-2 gap-2">
                {currentPatient.status === 'called' ? (
                  <button
                    onClick={handleStartConsultation}
                    disabled={actionLoading}
                    className="col-span-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Consultation</span>
                  </button>
                ) : (
                  <button
                    onClick={handleCompleteConsultation}
                    disabled={actionLoading}
                    className="col-span-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Complete Consultation</span>
                  </button>
                )}

                <button
                  onClick={handleSkipPatient}
                  disabled={actionLoading}
                  className="col-span-2 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>Skip Patient</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleCallNext}
                disabled={!nextPatient || actionLoading}
                className="w-full py-3.5 bg-white text-brand-800 hover:bg-brand-50 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-colors"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Next Patient ({nextPatient ? `#${nextPatient.token_number}` : 'None'})</span>
              </button>
            )}
          </div>
        </div>

        {/* Patient Details & Queue Stats */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-brand-600" />
              Patient Consultation Information
            </h3>

            {currentPatient ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block uppercase tracking-wider font-semibold">
                    Patient Name
                  </span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">
                    {currentPatient.patient?.profile?.full_name}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 block uppercase tracking-wider font-semibold">
                    Contact Phone
                  </span>
                  <p className="text-sm font-medium text-slate-700 mt-0.5">
                    {currentPatient.patient?.phone || currentPatient.patient?.profile?.phone || 'N/A'}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 block uppercase tracking-wider font-semibold">
                    Gender & DOB
                  </span>
                  <p className="text-sm font-medium text-slate-700 mt-0.5">
                    {currentPatient.patient?.gender || 'Not specified'} &bull;{' '}
                    {currentPatient.patient?.date_of_birth || 'N/A'}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 block uppercase tracking-wider font-semibold">
                    Consultation Slot
                  </span>
                  <p className="text-sm font-medium text-slate-700 mt-0.5">
                    {currentPatient.appointment?.appointment_time}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                No active consultation. Click "Call Next Patient" to bring in the next token.
              </div>
            )}
          </div>

          {/* OPD Queue Quick Counters */}
          <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-100 mt-4">
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-center">
              <span className="text-xl font-bold text-amber-700">{waitingPatients.length}</span>
              <span className="block text-[11px] font-semibold text-amber-800 uppercase mt-0.5">
                Waiting
              </span>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
              <span className="text-xl font-bold text-emerald-700">{completedPatients.length}</span>
              <span className="block text-[11px] font-semibold text-emerald-800 uppercase mt-0.5">
                Completed
              </span>
            </div>

            <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl text-center">
              <span className="text-xl font-bold text-orange-700">{skippedPatients.length}</span>
              <span className="block text-[11px] font-semibold text-orange-800 uppercase mt-0.5">
                Skipped
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* QUEUE PATIENTS TABS */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('waiting')}
            className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'waiting'
                ? 'border-brand-600 text-brand-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Waiting List ({waitingPatients.length})
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'completed'
                ? 'border-brand-600 text-brand-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Completed ({completedPatients.length})
          </button>

          <button
            onClick={() => setActiveTab('skipped')}
            className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'skipped'
                ? 'border-brand-600 text-brand-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Skipped ({skippedPatients.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6">
          {activeTab === 'waiting' && (
            <div>
              {waitingPatients.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="No waiting patients"
                  description="All scheduled patients for today have either been attended or there are no further bookings."
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {waitingPatients.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="py-3 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 font-bold flex items-center justify-center text-sm border border-brand-100">
                          #{entry.token_number}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-800 text-sm">
                              {entry.patient?.profile?.full_name}
                            </p>
                            {idx === 2 && (
                              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <MessageSquare className="w-2.5 h-2.5" />
                                3-Away Alert Sent
                              </span>
                            )}
                            {idx === 0 && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                                Next Up
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            Time: {entry.appointment?.appointment_time} &bull; Position: {idx + 1}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status="waiting" size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'completed' && (
            <div>
              {completedPatients.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="No completed appointments yet"
                  description="As you attend to and complete patient consultations, they will be listed here."
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {completedPatients.map(entry => (
                    <div
                      key={entry.id}
                      className="py-3 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-sm border border-emerald-100">
                          #{entry.token_number}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">
                            {entry.patient?.profile?.full_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            Completed at:{' '}
                            {entry.completed_at
                              ? new Date(entry.completed_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Done'}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status="completed" size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'skipped' && (
            <div>
              {skippedPatients.length === 0 ? (
                <EmptyState
                  icon={SkipForward}
                  title="No skipped patients"
                  description="Patients who are absent or skipped will appear here."
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {skippedPatients.map(entry => (
                    <div
                      key={entry.id}
                      className="py-3 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-700 font-bold flex items-center justify-center text-sm border border-orange-100">
                          #{entry.token_number}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">
                            {entry.patient?.profile?.full_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            Status: Skipped from active call
                          </p>
                        </div>
                      </div>
                      <StatusBadge status="skipped" size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

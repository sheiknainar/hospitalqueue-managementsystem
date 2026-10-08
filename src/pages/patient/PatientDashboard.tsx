import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Building2,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Bell,
  MessageSquare,
  Smartphone,
  ExternalLink,
  Send,
  CheckCheck,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { EmptyState } from '../../components/common/EmptyState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { queueService } from '../../services/queueService';
import { hospitalService } from '../../services/hospitalService';
import { notificationService } from '../../services/notificationService';
import { smsService, normalizePhoneNumber } from '../../services/smsService';
import { QueueEntry, Appointment, Patient } from '../../types/database';

export const PatientDashboard: React.FC = () => {
  const { user, patientRecord } = useAuth();
  const [activeQueue, setActiveQueue] = useState<QueueEntry | null>(null);
  const [currentServingToken, setCurrentServingToken] = useState<number | null>(null);
  const [patientsAhead, setPatientsAhead] = useState<number>(0);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayDate] = useState(new Date().toISOString().split('T')[0]);

  const loadPatientData = async () => {
    try {
      // Find patient record
      let pt = patientRecord;
      if (!pt && user) {
        pt = await hospitalService.getPatientByProfileId(user.id);
      }

      if (pt) {
        // 1. Get active queue token for today
        const queueEntry = await queueService.getPatientActiveQueue(pt.id, todayDate);
        setActiveQueue(queueEntry);

        if (queueEntry) {
          // 2. Query doctor's whole queue for today to determine current token & patients ahead
          const docQueue = await queueService.getDoctorQueue(queueEntry.doctor_id, todayDate);

          // Find current token being called or in progress
          const currentEntry = docQueue.find(
            e => e.status === 'in_progress' || e.status === 'called'
          );
          setCurrentServingToken(currentEntry ? currentEntry.token_number : null);

          // Count how many waiting patients have a token number less than this patient's token
          const ahead = docQueue.filter(
            e => e.status === 'waiting' && e.token_number < queueEntry.token_number
          ).length;
          setPatientsAhead(ahead);
        }

        // 3. Get recent appointments
        const appts = await hospitalService.getAppointments({ patientId: pt.id });
        setRecentAppointments(appts.slice(0, 5));

        // 4. Load SMS logs for patient
        const logs = smsService.getSmsLogs();
        setSmsLogs(logs);
      }
    } catch (err) {
      console.error('Failed to load patient queue status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatientData();

    // Subscribe to realtime queue changes
    const unsubscribe = queueService.subscribeToQueueChanges(() => {
      loadPatientData();
    });

    const handleSmsDispatched = () => {
      setSmsLogs(smsService.getSmsLogs());
    };
    window.addEventListener('carequeue_sms_dispatched', handleSmsDispatched);
    window.addEventListener('carequeue_new_alert', handleSmsDispatched);

    return () => {
      unsubscribe();
      window.removeEventListener('carequeue_sms_dispatched', handleSmsDispatched);
      window.removeEventListener('carequeue_new_alert', handleSmsDispatched);
    };
  }, [user, patientRecord, todayDate]);

  if (loading) {
    return <LoadingSpinner message="Checking your live queue token..." />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-brand-600 uppercase tracking-widest">
            Patient Portal
          </span>
          <h2 className="text-2xl font-bold text-slate-800 mt-0.5">
            Welcome, {user?.full_name}
          </h2>
          <p className="text-sm text-slate-500">
            Track your appointment queue in real-time and consult without physical waiting lines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadPatientData}
            className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shadow-xs"
            title="Refresh Token"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            to="/patient/book"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Book Appointment</span>
          </Link>
        </div>
      </div>

      {/* ACTIVE QUEUE TOKEN TRACKER CARD */}
      {activeQueue ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Header notice */}
          <div className="bg-gradient-to-r from-brand-600 to-primary-600 p-4 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-brand-100">
                  Live Queue Tracker
                </span>
                <h3 className="text-lg font-bold">
                  Consultation with Dr. {activeQueue.doctor?.profile?.full_name}
                </h3>
              </div>
            </div>

            <div>
              <StatusBadge status={activeQueue.status} size="lg" />
            </div>
          </div>

          {/* If Called: Urgent Prompt */}
          {activeQueue.status === 'called' && (
            <div className="bg-sky-50 border-b border-sky-200 p-4 text-sky-900 flex items-center gap-3 animate-pulse">
              <Bell className="w-5 h-5 text-sky-600 shrink-0" />
              <div className="text-sm font-semibold">
                Your Token #{activeQueue.token_number} is being called right now! Please proceed to Dr.{' '}
                {activeQueue.doctor?.profile?.full_name}'s consultation room.
              </div>
            </div>
          )}

          {/* Metrics Grid */}
          <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            {/* Your Token */}
            <div className="pt-2 sm:pt-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Your Token Number
              </span>
              <div className="text-5xl font-black text-brand-600 mt-2">
                #{activeQueue.token_number}
              </div>
              <p className="text-xs text-slate-500 mt-1">Guaranteed sequential token</p>
            </div>

            {/* Current Token Serving */}
            <div className="pt-4 sm:pt-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Current Token Serving
              </span>
              <div className="text-5xl font-black text-slate-800 mt-2">
                {currentServingToken ? `#${currentServingToken}` : '--'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {currentServingToken ? 'Doctor is attending this token' : 'No patient currently called'}
              </p>
            </div>

            {/* Patients Ahead */}
            <div className="pt-4 sm:pt-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Patients Ahead of You
              </span>
              <div className="text-5xl font-black text-amber-600 mt-2">{patientsAhead}</div>
              <p className="text-xs text-slate-500 mt-1">
                {patientsAhead === 0 ? 'You are next in line!' : `${patientsAhead} patient(s) waiting ahead`}
              </p>
            </div>
          </div>

          {/* Appointment Meta Footer */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>Department: <strong>{activeQueue.doctor?.department?.name || 'OPD'}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Date: <strong>{activeQueue.queue_date}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Booked Slot: <strong>{activeQueue.appointment?.appointment_time}</strong></span>
            </div>
          </div>

          {/* SMS & WhatsApp Live Proximity Alerts Section */}
          {(() => {
            const rawPhone =
              patientRecord?.phone ||
              user?.phone ||
              notificationService.getPreferences(patientRecord?.id || user?.id || '').phoneNumber ||
              '9876543210';
            const { international, clean10Digit } = normalizePhoneNumber(rawPhone);
            const nativeSmsLink = `sms:${international}?body=${encodeURIComponent(
              `[Bharathiar Hospital OPD] Live Token Status: Token #${activeQueue.token_number} with Dr. ${activeQueue.doctor?.profile?.full_name}. Patients waiting ahead: ${patientsAhead}. Link: ${window.location.origin}/patient`
            )}`;
            const waLink = `https://wa.me/91${clean10Digit}?text=${encodeURIComponent(
              `[Bharathiar Hospital OPD] Live Alert: Token #${activeQueue.token_number} with Dr. ${activeQueue.doctor?.profile?.full_name}. Patients ahead: ${patientsAhead}. Track: ${window.location.origin}/patient`
            )}`;

            return (
              <div className="p-5 bg-gradient-to-r from-emerald-50/60 via-teal-50/50 to-sky-50/60 border-t border-slate-100 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-800">
                          Automated SMS & WhatsApp Alerts
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                          Live Connected to {international}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1">
                        {patientsAhead === 3 ? (
                          <span className="text-amber-800 font-bold bg-amber-100/90 px-2 py-0.5 rounded-md">
                            ⚠️ 3-Positions-Away Alert Dispatched! Please make your way toward Dr.{' '}
                            {activeQueue.doctor?.profile?.full_name}'s OPD room.
                          </span>
                        ) : patientsAhead < 3 && patientsAhead > 0 ? (
                          <span className="text-emerald-800 font-bold">
                            ⚡ Turn approaching: Only {patientsAhead} patient(s) ahead. Stay near the consultation counter.
                          </span>
                        ) : activeQueue.status === 'called' ? (
                          <span className="text-sky-800 font-bold animate-pulse">
                            🔔 Call Alert Sent: Your token is CALLED! Enter consultation room immediately.
                          </span>
                        ) : (
                          <span>
                            Token confirmation was sent upon booking. Proximity SMS fires automatically at <strong>3 patients ahead</strong> and when <strong>called</strong>.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        notificationService.dispatchAlert({
                          type: 'booking_confirmed',
                          recipientPhone: international,
                          recipientName: user?.full_name || 'Patient',
                          tokenNumber: activeQueue.token_number,
                          doctorName: activeQueue.doctor?.profile?.full_name || 'Doctor',
                          departmentName: activeQueue.doctor?.department?.name || 'OPD',
                          appointmentTime: activeQueue.appointment?.appointment_time,
                          appointmentDate: activeQueue.queue_date,
                          forceSend: true,
                        });
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1 transition-colors"
                      title="Send Token Confirmation SMS"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Confirm SMS</span>
                    </button>

                    <button
                      onClick={() => {
                        notificationService.dispatchAlert({
                          type: 'three_away',
                          recipientPhone: international,
                          recipientName: user?.full_name || 'Patient',
                          tokenNumber: activeQueue.token_number,
                          doctorName: activeQueue.doctor?.profile?.full_name || 'Doctor',
                          departmentName: activeQueue.doctor?.department?.name || 'OPD',
                          appointmentTime: activeQueue.appointment?.appointment_time,
                          patientsAhead: 3,
                          forceSend: true,
                        });
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1 transition-colors"
                      title="Send 3-Positions-Away Proximity Alert"
                    >
                      <Send className="w-3.5 h-3.5 text-amber-600" />
                      <span>3-Ahead SMS</span>
                    </button>

                    <button
                      onClick={() => {
                        notificationService.dispatchAlert({
                          type: 'called',
                          recipientPhone: international,
                          recipientName: user?.full_name || 'Patient',
                          tokenNumber: activeQueue.token_number,
                          doctorName: activeQueue.doctor?.profile?.full_name || 'Doctor',
                          departmentName: activeQueue.doctor?.department?.name || 'OPD',
                          appointmentTime: activeQueue.appointment?.appointment_time,
                          forceSend: true,
                        });
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1 transition-colors"
                      title="Send Called Alert SMS"
                    >
                      <Bell className="w-3.5 h-3.5 text-sky-600" />
                      <span>Called SMS</span>
                    </button>

                    <a
                      href={nativeSmsLink}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
                      title="Open in native SMS messaging app"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>SMS App</span>
                    </a>

                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>

                {/* Sub-bar showing registered mobile number connection info */}
                <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>
                      Registered Mobile: <strong className="font-mono text-slate-900">{international}</strong>
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-500">Gateway: Fast2SMS / Twilio / Direct SMS Enabled</span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
                    ✓ Automatic Delivery Enabled
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <EmptyState
            icon={Clock}
            title="No Active Queue Token Today"
            description="You don't have any appointments scheduled for today. Book an appointment with a doctor to get your sequential queue token."
            actionText="Book Appointment Now"
            onAction={() => (window.location.href = '/patient/book')}
          />
        </div>
      )}

      {/* AUTOMATED SMS ALERTS DISPATCHED TO REGISTERED MOBILE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Automated SMS Alerts Log
              </h3>
              <p className="text-xs text-slate-500">
                Live stream of SMS confirmations and queue alerts dispatched to your registered phone.
              </p>
            </div>
          </div>

          <span className="text-[11px] font-bold text-sky-800 bg-sky-50 px-3 py-1 rounded-full border border-sky-200 self-start sm:self-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            Active Registered Handset
          </span>
        </div>

        {smsLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No SMS alerts dispatched yet</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-0.5">
              Confirming a token booking or advancing the doctor queue automatically triggers sequential SMS messages to your registered number.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {smsLogs.slice(0, 6).map((log: any) => (
              <div
                key={log.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-start justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        log.type === 'called'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : log.type === 'three_away'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : log.type === 'token_confirmation'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-sky-100 text-sky-800 border border-sky-200'
                      }`}
                    >
                      {log.type === 'called'
                        ? 'Token Called'
                        : log.type === 'three_away'
                        ? '3 Ahead Proximity'
                        : log.type === 'token_confirmation'
                        ? 'Token Confirmed'
                        : log.type === 'next_in_line'
                        ? 'Next in Line'
                        : 'Live Status'}
                    </span>

                    <span className="text-xs font-bold text-slate-800 font-mono">
                      Token #{log.tokenNumber}
                    </span>

                    <span className="text-[11px] text-slate-400">
                      • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      ✓ Delivered to {log.formattedPhone || log.recipientPhone}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-mono bg-white p-2.5 rounded-lg border border-slate-200/80 break-words">
                    {log.messageText}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-1 md:pt-0">
                  {log.nativeSmsUri && (
                    <a
                      href={log.nativeSmsUri}
                      className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition-colors"
                      title="Open in native SMS messaging app"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>SMS App</span>
                    </a>
                  )}
                  {log.whatsappUri && (
                    <a
                      href={log.whatsappUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RECENT APPOINTMENTS LIST */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-600" />
            Recent Appointment History
          </h3>
          <Link
            to="/patient/history"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            View All History &rarr;
          </Link>
        </div>

        {recentAppointments.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">
            You have not booked any appointments yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentAppointments.map(appt => (
              <div key={appt.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-slate-800">
                    Dr. {appt.doctor?.profile?.full_name} ({appt.doctor?.specialization})
                  </p>
                  <p className="text-xs text-slate-400">
                    {appt.appointment_date} at {appt.appointment_time}
                  </p>
                </div>
                <div>
                  <StatusBadge status={appt.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

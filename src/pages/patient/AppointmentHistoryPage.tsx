import React, { useState, useEffect } from 'react';
import { Calendar, Stethoscope, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { EmptyState } from '../../components/common/EmptyState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { hospitalService } from '../../services/hospitalService';
import { localDB } from '../../services/storageService';
import { Appointment, QueueEntry } from '../../types/database';

export const AppointmentHistoryPage: React.FC = () => {
  const { user, patientRecord } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    try {
      let pt = patientRecord;
      if (!pt && user) {
        pt = await hospitalService.getPatientByProfileId(user.id);
      }

      if (pt) {
        const appts = await hospitalService.getAppointments({ patientId: pt.id });
        setAppointments(appts);
      }
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [user, patientRecord]);

  if (loading) {
    return <LoadingSpinner message="Loading your appointment history..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">My Consultation History</h2>
        <p className="text-sm text-slate-500">
          Review all your past and upcoming hospital appointments and clinical visit statuses.
        </p>
      </div>

      {appointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No appointment history found"
          description="You haven't scheduled any doctor consultations yet. Book an appointment to get started."
          actionText="Book Appointment"
          onAction={() => (window.location.href = '/patient/book')}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Doctor & Specialization</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Date & Time</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map(appt => (
                  <tr key={appt.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 font-bold flex items-center justify-center text-xs">
                          {appt.doctor?.profile?.full_name?.charAt(0) || 'D'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">
                            Dr. {appt.doctor?.profile?.full_name}
                          </p>
                          <p className="text-xs text-brand-600 font-medium">
                            {appt.doctor?.specialization}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs font-medium text-slate-700">
                      {appt.doctor?.department?.name || 'General OPD'}
                    </td>

                    <td className="px-6 py-4 text-xs">
                      <p className="font-semibold text-slate-700">{appt.appointment_date}</p>
                      <p className="text-slate-400 mt-0.5">{appt.appointment_time}</p>
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={appt.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

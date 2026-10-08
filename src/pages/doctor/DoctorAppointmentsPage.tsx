import React, { useState, useEffect } from 'react';
import { Calendar, Stethoscope, Clock, User, Phone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { EmptyState } from '../../components/common/EmptyState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { hospitalService } from '../../services/hospitalService';
import { Appointment, Doctor } from '../../types/database';

export const DoctorAppointmentsPage: React.FC = () => {
  const { user } = useAuth();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');

  const loadAppointments = async () => {
    try {
      const doctors = await hospitalService.getDoctors();
      const currentDoc = doctors.find(d => d.profile_id === user?.id) || doctors[0] || null;
      setDoctor(currentDoc);

      if (currentDoc) {
        const appts = await hospitalService.getAppointments({
          doctorId: currentDoc.id,
          date: filterDate || undefined,
        });
        setAppointments(appts);
      }
    } catch (err) {
      console.error('Failed to load appointments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [user, filterDate]);

  if (loading) {
    return <LoadingSpinner message="Loading doctor appointments..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">My Consultation Schedule</h2>
          <p className="text-sm text-slate-500">
            Overview of all patient appointments booked under Dr. {doctor?.profile?.full_name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="text-xs text-brand-600 hover:text-brand-700 font-semibold px-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {appointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No appointments booked"
          description="There are currently no patient consultations scheduled for this date."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Patient</th>
                  <th className="px-6 py-3.5">Date & Time</th>
                  <th className="px-6 py-3.5">Contact</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map(appt => (
                  <tr key={appt.id} className="hover:bg-slate-50/80">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 font-bold flex items-center justify-center text-xs">
                          {appt.patient?.profile?.full_name?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {appt.patient?.profile?.full_name}
                          </p>
                          <p className="text-xs text-slate-400">{appt.patient?.gender || 'Patient'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-xs space-y-0.5">
                        <p className="font-semibold text-slate-700 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{appt.appointment_date}</span>
                        </p>
                        <p className="text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{appt.appointment_time}</span>
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-600">
                      <p>{appt.patient?.phone || appt.patient?.profile?.phone || 'N/A'}</p>
                      <p className="text-slate-400">{appt.patient?.profile?.email}</p>
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

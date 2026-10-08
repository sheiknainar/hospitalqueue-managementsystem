import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Filter, Search, XCircle, CheckCircle2, Clock, Loader2, Stethoscope, User } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { hospitalService } from '../../services/hospitalService';
import { queueService } from '../../services/queueService';
import { Appointment, Doctor, Patient } from '../../types/database';

export const AppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal create
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [apptDate, setApptDate] = useState(new Date().toISOString().split('T')[0]);
  const [apptTime, setApptTime] = useState('09:00 AM');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ token: number } | null>(null);

  const loadData = async () => {
    try {
      const [appts, docs, pts] = await Promise.all([
        hospitalService.getAppointments({
          date: filterDate || undefined,
          doctorId: filterDoctor || undefined,
          status: filterStatus || undefined,
        }),
        hospitalService.getDoctors(),
        hospitalService.getPatients(),
      ]);

      setAppointments(appts);
      setDoctors(docs);
      setPatients(pts);
    } catch (err) {
      console.error('Failed to load appointments data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterDate, filterDoctor, filterStatus]);

  const handleOpenAdd = () => {
    setError('');
    setSuccessInfo(null);
    setSelectedPatientId(patients.length > 0 ? patients[0].id : '');
    setSelectedDoctorId(doctors.length > 0 ? doctors[0].id : '');
    setApptDate(new Date().toISOString().split('T')[0]);
    setApptTime('09:00 AM');
    setModalOpen(true);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setError('Please select a patient.');
      return;
    }
    if (!selectedDoctorId) {
      setError('Please select a doctor.');
      return;
    }
    if (!apptDate) {
      setError('Please select an appointment date.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await queueService.bookAppointmentWithToken({
        patientId: selectedPatientId,
        doctorId: selectedDoctorId,
        appointmentDate: apptDate,
        appointmentTime: apptTime,
      });

      setSuccessInfo({ token: result.tokenNumber });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to book appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAppointment = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment and its queue token?')) {
      return;
    }
    try {
      await hospitalService.cancelAppointment(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment.');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading appointments schedule..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Hospital Appointments</h2>
          <p className="text-sm text-slate-500">
            Schedule OPD consultations, manage booking status, and assign sequential queue tokens.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Appointment</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        {/* Date Filter */}
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
          title="Filter by Date"
        />

        {/* Doctor Filter */}
        <select
          value={filterDoctor}
          onChange={e => setFilterDoctor(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All Doctors</option>
          {doctors.map(d => (
            <option key={d.id} value={d.id}>
              Dr. {d.profile?.full_name} ({d.specialization})
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="booked">Booked</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {(filterDate || filterDoctor || filterStatus) && (
          <button
            onClick={() => {
              setFilterDate('');
              setFilterDoctor('');
              setFilterStatus('');
            }}
            className="text-xs text-rose-600 hover:text-rose-700 font-semibold ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Appointments Table or Empty State */}
      {appointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No appointments found"
          description="There are no scheduled appointments matching your criteria. Click below to create a new appointment."
          actionText="New Appointment"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Patient</th>
                  <th className="px-6 py-3.5">Doctor & Specialization</th>
                  <th className="px-6 py-3.5">Schedule</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map(appt => (
                  <tr key={appt.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                          {appt.patient?.profile?.full_name?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {appt.patient?.profile?.full_name || 'Patient'}
                          </p>
                          <p className="text-xs text-slate-400">{appt.patient?.profile?.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-brand-600 shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-800">
                            Dr. {appt.doctor?.profile?.full_name}
                          </p>
                          <p className="text-xs text-brand-600">{appt.doctor?.specialization}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-xs space-y-0.5">
                        <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{appt.appointment_date}</span>
                        </p>
                        <p className="text-slate-500 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{appt.appointment_time}</span>
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={appt.status} size="sm" />
                    </td>

                    <td className="px-6 py-4 text-right">
                      {appt.status === 'booked' && (
                        <button
                          onClick={() => handleCancelAppointment(appt.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Appointment Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Schedule New Appointment"
        maxWidth="lg"
      >
        {successInfo ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-bold text-slate-800">Appointment Confirmed!</h4>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-w-xs mx-auto">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                Sequential Token Number
              </p>
              <p className="text-4xl font-black text-brand-600 mt-2">#{successInfo.token}</p>
            </div>
            <p className="text-sm text-slate-500">
              The patient has been added to the doctor's queue for this date.
            </p>
            <button
              onClick={() => setModalOpen(false)}
              className="px-6 py-2.5 bg-brand-600 text-white font-semibold rounded-xl text-sm hover:bg-brand-700"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateAppointment} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            {patients.length === 0 ? (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
                No patients found. Please ask patients to register first or register a patient.
              </div>
            ) : doctors.length === 0 ? (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
                No doctors found. Please add a doctor in the Doctors section first.
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Select Patient *
                  </label>
                  <select
                    value={selectedPatientId}
                    onChange={e => setSelectedPatientId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.profile?.full_name} ({p.profile?.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Select Doctor *
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={e => setSelectedDoctorId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.profile?.full_name} - {d.specialization} ({d.department?.name || 'General'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Appointment Date *
                    </label>
                    <input
                      type="date"
                      value={apptDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setApptDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Consultation Time *
                    </label>
                    <select
                      value={apptTime}
                      onChange={e => setApptTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 bg-white"
                    >
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="09:30 AM">09:30 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="10:30 AM">10:30 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="11:30 AM">11:30 AM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="02:30 PM">02:30 PM</option>
                      <option value="03:00 PM">03:00 PM</option>
                      <option value="03:30 PM">03:30 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm & Generate Token</span>
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
};

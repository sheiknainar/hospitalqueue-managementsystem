import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Stethoscope,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  User,
  Sparkles,
  MessageSquare,
  Phone,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AISymptomChecker } from '../../components/ai/AISymptomChecker';
import { hospitalService } from '../../services/hospitalService';
import { queueService } from '../../services/queueService';
import { notificationService } from '../../services/notificationService';
import { Department, Doctor, Patient } from '../../types/database';

export const BookAppointmentPage: React.FC = () => {
  const { user, patientRecord } = useAuth();
  const navigate = useNavigate();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  // Wizard state
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedTime, setSelectedTime] = useState<string>('09:30 AM');

  // Notification state
  const [notificationPhone, setNotificationPhone] = useState<string>('9876543210');
  const [enableSmsAlert, setEnableSmsAlert] = useState<boolean>(true);
  const [enableWhatsAppAlert, setEnableWhatsAppAlert] = useState<boolean>(true);

  // Submission & Result state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmationData, setConfirmationData] = useState<{
    doctorName: string;
    departmentName: string;
    date: string;
    time: string;
    tokenNumber: number;
    phone: string;
    chiefComplaint?: string;
  } | null>(null);
  const [aiChiefComplaint, setAiChiefComplaint] = useState<string>('');

  const timeSlots = [
    '09:00 AM',
    '09:30 AM',
    '10:00 AM',
    '10:30 AM',
    '11:00 AM',
    '11:30 AM',
    '02:00 PM',
    '02:30 PM',
    '03:00 PM',
    '03:30 PM',
    '04:00 PM',
    '04:30 PM',
  ];

  useEffect(() => {
    async function loadData() {
      try {
        const [depts, docs] = await Promise.all([
          hospitalService.getDepartments(),
          hospitalService.getDoctors(),
        ]);
        setDepartments(depts);
        setDoctors(docs);

        let pt = patientRecord;
        if (!pt && user) {
          pt = await hospitalService.getPatientByProfileId(user.id);
        }
        setPatient(pt);

        // Automatically prefill patient's registered mobile phone number
        const registeredMobile =
          pt?.phone ||
          patientRecord?.phone ||
          user?.phone ||
          notificationService.getPreferences(user?.id || pt?.id || '').phoneNumber;
        if (registeredMobile) {
          setNotificationPhone(registeredMobile);
        }

        if (depts.length > 0) setSelectedDeptId(depts[0].id);
      } catch (err) {
        console.error('Failed to load booking data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user, patientRecord]);

  // Filter doctors by selected department if any
  const availableDoctors = doctors.filter(doc => {
    if (!selectedDeptId) return true;
    return doc.department_id === selectedDeptId;
  });

  // Auto-select first available doctor when department changes
  useEffect(() => {
    if (availableDoctors.length > 0 && (!selectedDoctorId || !availableDoctors.some(d => d.id === selectedDoctorId))) {
      setSelectedDoctorId(availableDoctors[0].id);
    }
  }, [selectedDeptId, availableDoctors]);

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!patient) {
      setErrorMessage('Patient profile not linked. Please register as a patient or contact reception.');
      return;
    }
    if (!selectedDoctorId) {
      setErrorMessage('Please choose a doctor for consultation.');
      return;
    }
    if (!selectedDate) {
      setErrorMessage('Please pick an appointment date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const chosenDoctor = doctors.find(d => d.id === selectedDoctorId);
      const chosenDept = departments.find(d => d.id === selectedDeptId);

      // Save alert preferences
      notificationService.savePreferences(patient.id, {
        smsEnabled: enableSmsAlert,
        whatsappEnabled: enableWhatsAppAlert,
        phoneNumber: notificationPhone,
        leadAlertThreshold: 3,
      });

      const result = await queueService.bookAppointmentWithToken({
        patientId: patient.id,
        doctorId: selectedDoctorId,
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
        notificationPhone,
      });

      setConfirmationData({
        doctorName: chosenDoctor?.profile?.full_name || 'Doctor',
        departmentName: chosenDept?.name || chosenDoctor?.department?.name || 'OPD',
        date: selectedDate,
        time: selectedTime,
        tokenNumber: result.tokenNumber,
        phone: notificationPhone,
        chiefComplaint: aiChiefComplaint || undefined,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to book appointment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyRecommendation = (rec: {
    departmentId?: string;
    doctorId?: string;
    chiefComplaint?: string;
  }) => {
    if (rec.departmentId) {
      setSelectedDeptId(rec.departmentId);
    }
    if (rec.doctorId) {
      setSelectedDoctorId(rec.doctorId);
    }
    if (rec.chiefComplaint) {
      setAiChiefComplaint(rec.chiefComplaint);
    }

    // Smoothly scroll down to Step 1 & 2
    const target = document.getElementById('booking-step-1');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading appointment schedule..." />;
  }

  // SUCCESS CONFIRMATION SCREEN
  if (confirmationData) {
    return (
      <div className="max-w-xl mx-auto py-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
              Booking Successful
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-1">
              Appointment Confirmed
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Your consultation has been reserved and your token has been added to the doctor's queue.
            </p>
          </div>

          {/* TOKEN HIGHLIGHT CARD */}
          <div className="bg-gradient-to-tr from-brand-50 to-primary-50 rounded-2xl border border-brand-200 p-6">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
              Your Sequential Token Number
            </span>
            <div className="text-6xl font-black text-brand-600 my-2">
              #{confirmationData.tokenNumber}
            </div>
            <p className="text-xs text-slate-500">
              Present this token number at the consultation room.
            </p>
          </div>

          {/* DETAILS SUMMARY TABLE */}
          <div className="divide-y divide-slate-100 text-sm text-left bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">Doctor</span>
              <span className="font-semibold text-slate-800">Dr. {confirmationData.doctorName}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">Department</span>
              <span className="font-semibold text-slate-800">{confirmationData.departmentName}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">Appointment Date</span>
              <span className="font-semibold text-slate-800">{confirmationData.date}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">Consultation Time</span>
              <span className="font-semibold text-slate-800">{confirmationData.time}</span>
            </div>
            {confirmationData.chiefComplaint && (
              <div className="py-2 flex justify-between gap-4">
                <span className="text-slate-500 shrink-0">AI Visit Summary</span>
                <span className="font-medium text-brand-700 text-right text-xs">
                  {confirmationData.chiefComplaint}
                </span>
              </div>
            )}
          </div>

          {/* SMS & WhatsApp Confirmation Card */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-left">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-xs text-emerald-900">
                    SMS & WhatsApp Alerts Activated
                  </h4>
                  <span className="text-[10px] bg-emerald-200 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full uppercase">
                    Delivered
                  </span>
                </div>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Automated booking pass dispatched to <strong>+91 {confirmationData.phone}</strong>.
                  You will automatically receive an SMS alert when <strong>3 patients are ahead of you</strong>!
                </p>

                <div className="mt-3">
                  <a
                    href={`https://wa.me/91${confirmationData.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
                      `🏥 *CareQueue Booking Confirmation*\n\n👋 Hello!\n🎫 *Token Number:* #${confirmationData.tokenNumber}\n👨‍⚕️ *Doctor:* Dr. ${confirmationData.doctorName}\n🏢 *Department:* ${confirmationData.departmentName}\n📅 *Date:* ${confirmationData.date}\n⏰ *Time:* ${confirmationData.time}\n\n⚠️ Automated SMS & WhatsApp alerts will notify you when 3 patients are ahead.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Booking Pass in WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => navigate('/patient')}
              className="flex-1 py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
            >
              Track Live Token in Dashboard
            </button>
            <button
              onClick={() => {
                setConfirmationData(null);
              }}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
            >
              Book Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/patient"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <h2 className="text-2xl font-bold text-slate-800 mt-2">Book Doctor Consultation</h2>
        <p className="text-sm text-slate-500">
          Follow the steps below to reserve your appointment slot and receive an instant queue token.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* AI SYMPTOM TRIAGE & DOCTOR RECOMMENDER */}
      <AISymptomChecker
        departments={departments}
        doctors={doctors}
        onApplyRecommendation={handleApplyRecommendation}
      />

      <form onSubmit={handleConfirmBooking} className="space-y-6">
        {/* STEP 1: SELECT DEPARTMENT */}
        <div id="booking-step-1" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs scroll-mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">
                1
              </span>
              <h3 className="font-bold text-slate-800 text-base">Select Hospital Department</h3>
            </div>
            {aiChiefComplaint && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                AI Matched
              </span>
            )}
          </div>

          {departments.length === 0 ? (
            <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl">
              No hospital departments configured yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {departments.map(dept => (
                <button
                  type="button"
                  key={dept.id}
                  onClick={() => setSelectedDeptId(dept.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    selectedDeptId === dept.id
                      ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <Building2
                    className={`w-5 h-5 mb-2 ${
                      selectedDeptId === dept.id ? 'text-brand-600' : 'text-slate-400'
                    }`}
                  />
                  <p className="font-bold text-xs text-slate-800 leading-tight">{dept.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* STEP 2: SELECT DOCTOR */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">
              2
            </span>
            <h3 className="font-bold text-slate-800 text-base">Select Doctor</h3>
          </div>

          {availableDoctors.length === 0 ? (
            <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl">
              No doctors available in this department yet. Please select another department.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableDoctors.map(doc => (
                <button
                  type="button"
                  key={doc.id}
                  onClick={() => setSelectedDoctorId(doc.id)}
                  className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    selectedDoctorId === doc.id
                      ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 font-bold text-sm flex items-center justify-center shrink-0">
                    {doc.profile?.full_name?.charAt(0) || 'D'}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800">
                      Dr. {doc.profile?.full_name}
                    </p>
                    <p className="text-xs text-brand-600 font-semibold">{doc.specialization}</p>
                    <span className="inline-block mt-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      {doc.availability || 'Available'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* STEP 3: SELECT DATE & TIME */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">
              3
            </span>
            <h3 className="font-bold text-slate-800 text-base">Select Date & Time Slot</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Consultation Date
              </label>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setSelectedDate(e.target.value)}
                required
                className="w-full sm:w-64 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Available Time Slots
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {timeSlots.map(slot => (
                  <button
                    type="button"
                    key={slot}
                    onClick={() => setSelectedTime(slot)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                      selectedTime === slot
                        ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* STEP 4: SMS & WHATSAPP QUEUE ALERTS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
              4
            </span>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-base">SMS & WhatsApp Queue Alerts</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                Recommended
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Registered Patient Mobile Number
                </label>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Auto-Dispatches SMS & Live Alerts
                </span>
              </div>
              <div className="flex items-center gap-2 max-w-sm">
                <span className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-600">
                  +91
                </span>
                <input
                  type="tel"
                  value={notificationPhone}
                  onChange={e => setNotificationPhone(e.target.value)}
                  placeholder="9876543210"
                  required
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 font-mono font-bold text-slate-800"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5">
                <span>📲</span>
                <span>
                  Sequential Token Confirmation, live tracking link, 3-ahead proximity SMS, and Doctor Call alerts will automatically be dispatched to this number.
                </span>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={enableSmsAlert}
                  onChange={e => setEnableSmsAlert(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-brand-600 rounded-sm focus:ring-brand-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    SMS Proximity Alert (3 Away)
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Sends an automated SMS when 3 patients are waiting ahead of your token.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/60 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={enableWhatsAppAlert}
                  onChange={e => setEnableWhatsAppAlert(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    WhatsApp Digital Pass & Call Alert
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Delivers direct WhatsApp OPD pass and immediate alert when called.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !selectedDoctorId || availableDoctors.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Confirming Booking...</span>
              </>
            ) : (
              <>
                <span>Confirm Appointment & Generate Token</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

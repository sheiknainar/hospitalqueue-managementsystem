import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Stethoscope,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { EmptyState } from '../../components/common/EmptyState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { hospitalService } from '../../services/hospitalService';
import { queueService } from '../../services/queueService';
import { DashboardStats, Appointment, QueueEntry } from '../../types/database';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    totalDoctors: 0,
    totalDepartments: 0,
    todayAppointments: 0,
    waitingPatients: 0,
    completedAppointments: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [todayQueue, setTodayQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [fetchedStats, appts, queue] = await Promise.all([
        hospitalService.getDashboardStats(),
        hospitalService.getAppointments({ date: today }),
        queueService.getHospitalQueue(today),
      ]);

      setStats(fetchedStats);
      setRecentAppointments(appts.slice(0, 5));
      setTodayQueue(queue);
    } catch (err) {
      console.error('Failed to load admin dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to queue updates
    const unsubscribe = queueService.subscribeToQueueChanges(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return <LoadingSpinner message="Loading hospital dashboard..." />;
  }

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Hospital Administration</h2>
          <p className="text-sm text-slate-500">
            Real-time digital overview of hospital departments, medical staff, patients, and queue progress.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/admin/departments"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Department</span>
          </Link>

          <Link
            to="/admin/doctors"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Doctor</span>
          </Link>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Patients"
          value={stats.totalPatients}
          icon={Users}
          color="emerald"
        />
        <StatCard
          title="Total Doctors"
          value={stats.totalDoctors}
          icon={Stethoscope}
          color="brand"
        />
        <StatCard
          title="Departments"
          value={stats.totalDepartments}
          icon={Building2}
          color="sky"
        />
        <StatCard
          title="Today's Appts"
          value={stats.todayAppointments}
          icon={Calendar}
          color="purple"
        />
        <StatCard
          title="Waiting Queue"
          value={stats.waitingPatients}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Completed"
          value={stats.completedAppointments}
          icon={CheckCircle2}
          color="rose"
        />
      </div>

      {/* TWO COLUMN CONTENT: TODAY'S QUEUE & RECENT APPOINTMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* TODAY'S LIVE QUEUE */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-600" />
              <h3 className="font-bold text-slate-800">Today's Live Queue</h3>
            </div>
            <Link
              to="/admin/queue"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              Full Monitor
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {todayQueue.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No patients in queue today"
              description="When appointments are booked for today, sequential tokens will appear here."
              actionText="Create Appointment"
              onAction={() => (window.location.href = '/admin/appointments')}
            />
          ) : (
            <div className="divide-y divide-slate-100 overflow-y-auto max-h-80">
              {todayQueue.map(item => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 font-black text-sm flex items-center justify-center border border-brand-100">
                      #{item.token_number}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {item.patient?.profile?.full_name || 'Patient'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Dr. {item.doctor?.profile?.full_name} ({item.doctor?.specialization})
                      </p>
                    </div>
                  </div>
                  <div>
                    <StatusBadge status={item.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RECENT APPOINTMENTS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-slate-800">Today's Appointments</h3>
            </div>
            <Link
              to="/admin/appointments"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              View All
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentAppointments.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No appointments today"
              description="There are currently no scheduled appointments for today."
              actionText="Book New Appointment"
              onAction={() => (window.location.href = '/admin/appointments')}
            />
          ) : (
            <div className="divide-y divide-slate-100 overflow-y-auto max-h-80">
              {recentAppointments.map(appt => (
                <div key={appt.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {appt.patient?.profile?.full_name || 'Patient'}
                    </p>
                    <p className="text-xs text-slate-500">
                      With Dr. {appt.doctor?.profile?.full_name} &bull; {appt.appointment_time}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={appt.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

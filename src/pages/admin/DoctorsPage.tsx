import React, { useState, useEffect } from 'react';
import { Stethoscope, Plus, Edit2, Trash2, Search, Mail, Phone, Building2, Loader2, CheckCircle, Clock } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { hospitalService } from '../../services/hospitalService';
import { Doctor, Department } from '../../types/database';

export const DoctorsPage: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [availability, setAvailability] = useState('Available');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const [docs, depts] = await Promise.all([
        hospitalService.getDoctors(),
        hospitalService.getDepartments(),
      ]);
      setDoctors(docs);
      setDepartments(depts);
    } catch (err) {
      console.error('Failed to load doctors', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingDoctor(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setDepartmentId(departments.length > 0 ? departments[0].id : '');
    setSpecialization('');
    setAvailability('Available');
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (doc: Doctor) => {
    setEditingDoctor(doc);
    setFullName(doc.profile?.full_name || '');
    setEmail(doc.profile?.email || '');
    setPhone(doc.profile?.phone || '');
    setDepartmentId(doc.department_id || '');
    setSpecialization(doc.specialization);
    setAvailability(doc.availability || 'Available');
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Doctor name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (!specialization.trim()) {
      setError('Specialization is required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      if (editingDoctor) {
        await hospitalService.updateDoctor(editingDoctor.id, {
          department_id: departmentId || undefined,
          specialization: specialization.trim(),
          availability,
        });
      } else {
        await hospitalService.createDoctor({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          departmentId: departmentId || undefined,
          specialization: specialization.trim(),
          availability,
        });
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save doctor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove Dr. ${name}?`)) {
      return;
    }
    try {
      await hospitalService.deleteDoctor(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete doctor.');
    }
  };

  const filteredDoctors = doctors.filter(doc => {
    const name = doc.profile?.full_name?.toLowerCase() || '';
    const spec = doc.specialization?.toLowerCase() || '';
    const dept = doc.department?.name?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    return name.includes(q) || spec.includes(q) || dept.includes(q);
  });

  if (loading) {
    return <LoadingSpinner message="Loading doctors directory..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Hospital Doctors</h2>
          <p className="text-sm text-slate-500">
            Manage medical doctors, assign clinical departments, and configure OPD consultation schedules.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Doctor</span>
        </button>
      </div>

      {/* Search Bar */}
      {doctors.length > 0 && (
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by doctor name, specialty, or department..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
          />
        </div>
      )}

      {/* Doctors List or Empty State */}
      {doctors.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No doctors added yet"
          description="Click the button below to add your first doctor with their specialization and department."
          actionText="Add Doctor"
          onAction={handleOpenAdd}
        />
      ) : filteredDoctors.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
          No doctors matching "{searchQuery}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDoctors.map(doc => (
            <div
              key={doc.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-500 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                      {doc.profile?.full_name?.charAt(0) || 'D'}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-800">
                        Dr. {doc.profile?.full_name}
                      </h3>
                      <p className="text-xs font-semibold text-brand-600">{doc.specialization}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(doc)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                      title="Edit Doctor"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id, doc.profile?.full_name || '')}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      title="Remove Doctor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mt-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-700">
                      {doc.department?.name || 'Unassigned Department'}
                    </span>
                  </div>

                  {doc.profile?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{doc.profile.email}</span>
                    </div>
                  )}

                  {doc.profile?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{doc.profile.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Status</span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium ${
                    doc.availability === 'Available'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      doc.availability === 'Available' ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                  {doc.availability || 'Available'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Doctor Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDoctor ? 'Edit Doctor Profile' : 'Add New Doctor'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Robert Williams"
              disabled={!!editingDoctor}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="doctor@hospital.org"
                disabled={!!editingDoctor}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 555-0122"
                disabled={!!editingDoctor}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Department
              </label>
              <select
                value={departmentId}
                onChange={e => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="">-- Select Department --</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              {departments.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-1">
                  Tip: Add departments first to link doctors.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Specialization *
              </label>
              <input
                type="text"
                value={specialization}
                onChange={e => setSpecialization(e.target.value)}
                placeholder="e.g. Cardiologist, Pediatrician"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Availability Status
            </label>
            <select
              value={availability}
              onChange={e => setAvailability(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="Available">Available (Accepting appointments)</option>
              <option value="On Leave">On Leave</option>
              <option value="Emergency Only">Emergency Only</option>
            </select>
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
              <span>{editingDoctor ? 'Update Doctor' : 'Add Doctor'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

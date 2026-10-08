import React, { useState, useEffect } from 'react';
import { Users, Search, Phone, Mail, Calendar, User, Eye } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { hospitalService } from '../../services/hospitalService';
import { Patient } from '../../types/database';

export const PatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const loadPatients = async () => {
    try {
      const data = await hospitalService.getPatients();
      setPatients(data);
    } catch (err) {
      console.error('Failed to load patients', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const filteredPatients = patients.filter(pt => {
    const name = pt.profile?.full_name?.toLowerCase() || '';
    const email = pt.profile?.email?.toLowerCase() || '';
    const phone = (pt.phone || pt.profile?.phone || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || email.includes(q) || phone.includes(q);
  });

  if (loading) {
    return <LoadingSpinner message="Loading patients list..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Patients Directory</h2>
        <p className="text-sm text-slate-500">
          View registered hospital patients and manage patient medical records.
        </p>
      </div>

      {/* Search Filter */}
      {patients.length > 0 && (
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by patient name, phone, or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
          />
        </div>
      )}

      {/* Patients List or Empty State */}
      {patients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No patients registered yet"
          description="Patients will appear here as they register on the patient portal or book appointments."
        />
      ) : filteredPatients.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
          No patients matching "{searchQuery}".
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Patient</th>
                  <th className="px-6 py-3.5">Contact Details</th>
                  <th className="px-6 py-3.5">Gender & DOB</th>
                  <th className="px-6 py-3.5">Registered Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map(pt => (
                  <tr key={pt.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                          {pt.profile?.full_name?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{pt.profile?.full_name}</p>
                          <p className="text-xs text-slate-400">ID: {pt.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{pt.profile?.email}</span>
                        </div>
                        {(pt.phone || pt.profile?.phone) && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{pt.phone || pt.profile?.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <p className="font-medium text-slate-700">{pt.gender || 'Not specified'}</p>
                        <p className="text-slate-400 mt-0.5">
                          {pt.date_of_birth
                            ? new Date(pt.date_of_birth).toLocaleDateString()
                            : 'DOB not provided'}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(pt.created_at).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedPatient(pt)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Patient Details Modal */}
      <Modal
        isOpen={!!selectedPatient}
        onClose={() => setSelectedPatient(null)}
        title="Patient Information"
      >
        {selectedPatient && (
          <div className="space-y-4 text-sm text-slate-700">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-lg">
                {selectedPatient.profile?.full_name?.charAt(0) || 'P'}
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-800">
                  {selectedPatient.profile?.full_name}
                </h4>
                <p className="text-xs text-slate-500">{selectedPatient.profile?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
              <div>
                <span className="text-slate-400 block">Phone</span>
                <span className="font-medium text-slate-700">
                  {selectedPatient.phone || selectedPatient.profile?.phone || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Gender</span>
                <span className="font-medium text-slate-700">{selectedPatient.gender || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Date of Birth</span>
                <span className="font-medium text-slate-700">
                  {selectedPatient.date_of_birth || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Member Since</span>
                <span className="font-medium text-slate-700">
                  {new Date(selectedPatient.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

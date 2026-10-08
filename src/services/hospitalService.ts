import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { localDB } from './storageService';
import { Department, Doctor, Patient, Appointment, DashboardStats } from '../types/database';

export const hospitalService = {
  // DASHBOARD METRICS
  // DASHBOARD METRICS
  async getDashboardStats(): Promise<DashboardStats> {
    const today = new Date().toISOString().split('T')[0];

    if (!isSupabaseConfigured()) {
      const patients = localDB.getPatients();
      const doctors = localDB.getDoctors();
      const departments = localDB.getDepartments();
      const appointments = localDB.getAppointments();
      const queues = localDB.getQueueEntries();

      const todayAppts = appointments.filter(a => a.appointment_date === today);
      const waiting = queues.filter(q => q.queue_date === today && (q.status === 'waiting' || q.status === 'called'));
      const completed = appointments.filter(a => a.status === 'completed');

      return {
        totalPatients: patients.length,
        totalDoctors: doctors.length,
        totalDepartments: departments.length,
        todayAppointments: todayAppts.length,
        waitingPatients: waiting.length,
        completedAppointments: completed.length,
      };
    }

    try {
      const [patientsRes, doctorsRes, deptsRes, todayApptsRes, waitingRes, completedRes] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact', head: true }),
        supabase.from('doctors').select('id', { count: 'exact', head: true }),
        supabase.from('departments').select('id', { count: 'exact', head: true }),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('appointment_date', today),
        supabase.from('queue_entries').select('id', { count: 'exact', head: true }).eq('queue_date', today).in('status', ['waiting', 'called']),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      ]);

      const localDocs = localDB.getDoctors();
      const localDepts = localDB.getDepartments();

      return {
        totalPatients: patientsRes.count || 0,
        totalDoctors: Math.max(doctorsRes.count || 0, localDocs.length),
        totalDepartments: Math.max(deptsRes.count || 0, localDepts.length),
        todayAppointments: todayApptsRes.count || 0,
        waitingPatients: waitingRes.count || 0,
        completedAppointments: completedRes.count || 0,
      };
    } catch (err) {
      console.error('Failed to fetch dashboard stats from Supabase:', err);
      const doctors = localDB.getDoctors();
      const departments = localDB.getDepartments();
      return {
        totalPatients: 0,
        totalDoctors: doctors.length,
        totalDepartments: departments.length,
        todayAppointments: 0,
        waitingPatients: 0,
        completedAppointments: 0,
      };
    }
  },

  // DEPARTMENTS
  async getDepartments(): Promise<Department[]> {
    const localDepts = localDB.getDepartments();
    if (!isSupabaseConfigured()) {
      return localDepts;
    }
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.warn('Supabase getDepartments error, using localDB:', error.message);
        return localDepts;
      }

      const supabaseDeptIds = new Set((data || []).map(d => d.id));
      const supabaseDeptNames = new Set((data || []).map(d => d.name.toLowerCase()));
      const combined = [...(data || [])];
      for (const ld of localDepts) {
        if (!supabaseDeptIds.has(ld.id) && !supabaseDeptNames.has(ld.name.toLowerCase())) {
          combined.push(ld);
        }
      }
      return combined;
    } catch (err) {
      console.warn('Error reading departments from Supabase:', err);
      return localDepts;
    }
  },

  async createDepartment(name: string, description: string): Promise<Department> {
    const localDept: Department = {
      id: crypto.randomUUID(),
      name,
      description,
      created_at: new Date().toISOString(),
    };
    localDB.addDepartment(localDept);

    if (!isSupabaseConfigured()) {
      return localDept;
    }

    try {
      const { data, error } = await supabase
        .from('departments')
        .insert([{ name, description }])
        .select()
        .maybeSingle();

      if (error || !data) {
        console.warn('Supabase createDepartment notice:', error?.message);
        return localDept;
      }
      return data;
    } catch (err) {
      console.warn('createDepartment exception, using local store:', err);
      return localDept;
    }
  },

  async updateDepartment(id: string, name: string, description: string): Promise<Department> {
    const localUpdated = localDB.updateDepartment(id, { name, description });

    if (!isSupabaseConfigured()) {
      if (!localUpdated) throw new Error('Department not found');
      return localUpdated;
    }

    try {
      const { data, error } = await supabase
        .from('departments')
        .update({ name, description })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error || !data) {
        if (localUpdated) return localUpdated;
        throw error || new Error('Failed to update department');
      }
      return data;
    } catch (err) {
      if (localUpdated) return localUpdated;
      throw err;
    }
  },

  async deleteDepartment(id: string): Promise<void> {
    localDB.deleteDepartment(id);

    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      await supabase.from('departments').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase deleteDepartment error:', err);
    }
  },

  // DOCTORS
  async getDoctors(): Promise<Doctor[]> {
    const localDocs = localDB.getDoctors();
    if (!isSupabaseConfigured()) {
      return localDocs;
    }

    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          *,
          profile:profiles(*),
          department:departments(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase getDoctors error, falling back to localDB:', error.message);
        return localDocs;
      }

      // Merge Supabase doctors with any local doctors
      const supabaseDocIds = new Set((data || []).map(d => d.id));
      const supabaseEmails = new Set(
        (data || [])
          .map(d => d.profile?.email?.toLowerCase())
          .filter(Boolean)
      );

      const merged = [...(data || [])];
      for (const ld of localDocs) {
        const email = ld.profile?.email?.toLowerCase();
        if (!supabaseDocIds.has(ld.id) && (!email || !supabaseEmails.has(email))) {
          merged.push(ld);
        }
      }
      return merged;
    } catch (err) {
      console.warn('Error fetching doctors from Supabase:', err);
      return localDocs;
    }
  },

  async createDoctor(params: {
    fullName: string;
    email: string;
    phone?: string;
    departmentId?: string;
    specialization: string;
    availability?: string;
  }): Promise<Doctor> {
    const cleanDeptId =
      params.departmentId && params.departmentId.trim() !== ''
        ? params.departmentId.trim()
        : undefined;

    const localProfileId = crypto.randomUUID();
    const localDocId = crypto.randomUUID();

    // 1. Create in local database first so it is instantly available
    const localProf = localDB.addProfile({
      id: localProfileId,
      full_name: params.fullName,
      email: params.email,
      phone: params.phone || '',
      role: 'doctor',
      created_at: new Date().toISOString(),
    });

    const localDoc = localDB.addDoctor({
      id: localDocId,
      profile_id: localProfileId,
      department_id: cleanDeptId,
      specialization: params.specialization,
      availability: params.availability || 'Available',
      created_at: new Date().toISOString(),
    });

    const localResult: Doctor = {
      ...localDoc,
      profile: localProf,
      department: localDB.getDepartments().find(d => d.id === cleanDeptId),
    };

    if (!isSupabaseConfigured()) {
      return localResult;
    }

    // 2. Persist to Supabase
    try {
      let profileId: any = localProfileId;

      // Check if profile already exists for this email
      const { data: existingProf } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', params.email)
        .maybeSingle();

      if (existingProf?.id) {
        profileId = existingProf.id;
      } else {
        // Attempt auth user creation to satisfy foreign key constraint if active
        try {
          const { data: authData } = await supabase.auth.signUp({
            email: params.email,
            password: 'Doctor@123',
            options: {
              data: {
                full_name: params.fullName,
                role: 'doctor',
              },
            },
          });
          if (authData?.user?.id) {
            profileId = authData.user.id;
          }
        } catch (authErr) {
          console.warn('Doctor auth.signUp notice:', authErr);
        }

        const { error: profError } = await supabase.from('profiles').insert([
          {
            id: profileId,
            full_name: params.fullName,
            email: params.email,
            phone: params.phone || '',
            role: 'doctor',
          },
        ]);

        if (profError) {
          console.warn('Supabase doctor profile insertion warning:', profError.message);
          return localResult;
        }
      }

      // Verify departmentId exists in Supabase
      let validDeptId: string | null = cleanDeptId || null;
      if (validDeptId) {
        const { data: deptExists } = await supabase
          .from('departments')
          .select('id')
          .eq('id', validDeptId)
          .maybeSingle();
        if (!deptExists) {
          validDeptId = null;
        }
      }

      const { data, error } = await supabase
        .from('doctors')
        .insert([
          {
            profile_id: profileId,
            department_id: validDeptId,
            specialization: params.specialization,
            availability: params.availability || 'Available',
          },
        ])
        .select(`
          *,
          profile:profiles(*),
          department:departments(*)
        `)
        .maybeSingle();

      if (error || !data) {
        console.warn('Supabase doctor insert notice:', error?.message);
        return localResult;
      }

      // Sync localDoc with Supabase id
      localDB.updateDoctor(localDocId, { id: data.id, profile_id: profileId });
      return data;
    } catch (err) {
      console.warn('createDoctor exception, using local store:', err);
      return localResult;
    }
  },

  async updateDoctor(id: string, updates: Partial<Doctor>): Promise<Doctor> {
    const localUpdated = localDB.updateDoctor(id, updates);

    if (!isSupabaseConfigured()) {
      if (!localUpdated) throw new Error('Doctor not found');
      return localUpdated;
    }

    try {
      const { data, error } = await supabase
        .from('doctors')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          profile:profiles(*),
          department:departments(*)
        `)
        .maybeSingle();

      if (error || !data) {
        if (localUpdated) return localUpdated;
        throw error || new Error('Failed to update doctor');
      }
      return data;
    } catch (err) {
      if (localUpdated) return localUpdated;
      throw err;
    }
  },

  async deleteDoctor(id: string): Promise<void> {
    localDB.deleteDoctor(id);

    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      await supabase.from('doctors').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase deleteDoctor error:', err);
    }
  },

  // PATIENTS
  // PATIENTS
  async getPatients(): Promise<Patient[]> {
    const localPatients = localDB.getPatients();
    if (!isSupabaseConfigured()) {
      return localPatients;
    }
    try {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          profile:profiles(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase getPatients error, returning localDB patients:', error.message);
        return localPatients;
      }

      const remotePatients = data || [];
      const remoteIds = new Set(remotePatients.map(p => p.id));
      const merged = [...remotePatients];
      for (const lp of localPatients) {
        if (!remoteIds.has(lp.id)) {
          merged.push(lp);
        }
      }
      return merged;
    } catch (err) {
      console.warn('getPatients exception, returning local:', err);
      return localPatients;
    }
  },

  async getPatientByProfileId(profileId: string): Promise<Patient | null> {
    const localPatient = localDB.findPatientByProfileId(profileId);
    if (!isSupabaseConfigured()) {
      return localPatient || null;
    }
    try {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('profile_id', profileId)
        .maybeSingle();

      if (error) {
        console.warn('Supabase getPatientByProfileId error, checking localDB:', error.message);
        return localPatient || null;
      }
      return data || localPatient || null;
    } catch (err) {
      return localPatient || null;
    }
  },

  // APPOINTMENTS
  async getAppointments(filters?: {
    date?: string;
    doctorId?: string;
    status?: string;
    patientId?: string;
  }): Promise<Appointment[]> {
    const getLocalAppointments = () => {
      let list = localDB.getAppointments();
      if (filters?.date) list = list.filter(a => a.appointment_date === filters.date);
      if (filters?.doctorId) list = list.filter(a => a.doctor_id === filters.doctorId);
      if (filters?.status) list = list.filter(a => a.status === filters.status);
      if (filters?.patientId) list = list.filter(a => a.patient_id === filters.patientId);
      return list;
    };

    const localList = getLocalAppointments();

    if (!isSupabaseConfigured()) {
      return localList.sort((a, b) => (a.appointment_date > b.appointment_date ? -1 : 1));
    }

    try {
      let query = supabase.from('appointments').select(`
        *,
        doctor:doctors(*, profile:profiles(*), department:departments(*)),
        patient:patients(*, profile:profiles(*))
      `);

      if (filters?.date) query = query.eq('appointment_date', filters.date);
      if (filters?.doctorId) query = query.eq('doctor_id', filters.doctorId);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.patientId) query = query.eq('patient_id', filters.patientId);

      query = query.order('appointment_date', { ascending: false });

      const { data, error } = await query;
      if (error) {
        console.warn('Supabase getAppointments notice, returning local records:', error.message);
        return localList.sort((a, b) => (a.appointment_date > b.appointment_date ? -1 : 1));
      }

      const remoteList = data || [];
      const remoteIds = new Set(remoteList.map(a => a.id));
      const merged = [...remoteList];

      for (const la of localList) {
        if (!remoteIds.has(la.id)) {
          merged.push(la);
        }
      }

      return merged.sort((a, b) => (a.appointment_date > b.appointment_date ? -1 : 1));
    } catch (err) {
      console.warn('getAppointments exception:', err);
      return localList.sort((a, b) => (a.appointment_date > b.appointment_date ? -1 : 1));
    }
  },

  async cancelAppointment(id: string): Promise<void> {
    localDB.updateAppointment(id, { status: 'cancelled' });
    const queues = localDB.getQueueEntries().filter(q => q.appointment_id === id);
    queues.forEach(q => localDB.updateQueueEntry(q.id, { status: 'cancelled' }));

    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id);

      await supabase
        .from('queue_entries')
        .update({ status: 'cancelled' })
        .eq('appointment_id', id);
    } catch (err) {
      console.warn('Supabase cancelAppointment warning:', err);
    }
  },
};

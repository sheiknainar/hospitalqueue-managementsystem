import { Department, Doctor, Patient, Appointment, QueueEntry, Profile } from '../types/database';

// Local storage keys
const STORAGE_KEYS = {
  PROFILES: 'carequeue_profiles',
  DEPARTMENTS: 'carequeue_departments',
  DOCTORS: 'carequeue_doctors',
  PATIENTS: 'carequeue_patients',
  APPOINTMENTS: 'carequeue_appointments',
  QUEUE: 'carequeue_queue_entries',
  SESSION: 'carequeue_active_session',
};

// Helper to get items from localStorage (starts empty: [])
function getItem<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setItem<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('carequeue_storage_change', { detail: { key } }));
  } catch (err) {
    console.error('Error saving to storage', err);
  }
}

export const localDB = {
  // Profiles
  getProfiles: (): Profile[] => getItem<Profile>(STORAGE_KEYS.PROFILES),
  addProfile: (profile: Profile): Profile => {
    const items = getItem<Profile>(STORAGE_KEYS.PROFILES);
    items.push(profile);
    setItem(STORAGE_KEYS.PROFILES, items);
    return profile;
  },
  findProfileByEmail: (email: string): Profile | undefined => {
    return getItem<Profile>(STORAGE_KEYS.PROFILES).find(p => p.email.toLowerCase() === email.toLowerCase());
  },
  findProfileById: (id: string): Profile | undefined => {
    return getItem<Profile>(STORAGE_KEYS.PROFILES).find(p => p.id === id);
  },

  // Departments
  getDepartments: (): Department[] => getItem<Department>(STORAGE_KEYS.DEPARTMENTS),
  addDepartment: (dept: Department): Department => {
    const items = getItem<Department>(STORAGE_KEYS.DEPARTMENTS);
    items.push(dept);
    setItem(STORAGE_KEYS.DEPARTMENTS, items);
    return dept;
  },
  updateDepartment: (id: string, updates: Partial<Department>): Department | null => {
    const items = getItem<Department>(STORAGE_KEYS.DEPARTMENTS);
    const idx = items.findIndex(d => d.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates };
    setItem(STORAGE_KEYS.DEPARTMENTS, items);
    return items[idx];
  },
  deleteDepartment: (id: string): void => {
    const items = getItem<Department>(STORAGE_KEYS.DEPARTMENTS).filter(d => d.id !== id);
    setItem(STORAGE_KEYS.DEPARTMENTS, items);
  },

  // Doctors
  getDoctors: (): Doctor[] => {
    const docs = getItem<Doctor>(STORAGE_KEYS.DOCTORS);
    const profiles = getItem<Profile>(STORAGE_KEYS.PROFILES);
    const depts = getItem<Department>(STORAGE_KEYS.DEPARTMENTS);
    return docs.map(doc => ({
      ...doc,
      profile: profiles.find(p => p.id === doc.profile_id),
      department: depts.find(d => d.id === doc.department_id),
    }));
  },
  addDoctor: (doc: Doctor): Doctor => {
    const items = getItem<Doctor>(STORAGE_KEYS.DOCTORS);
    items.push(doc);
    setItem(STORAGE_KEYS.DOCTORS, items);
    return doc;
  },
  updateDoctor: (id: string, updates: Partial<Doctor>): Doctor | null => {
    const items = getItem<Doctor>(STORAGE_KEYS.DOCTORS);
    const idx = items.findIndex(d => d.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates };
    setItem(STORAGE_KEYS.DOCTORS, items);
    return items[idx];
  },
  deleteDoctor: (id: string): void => {
    const items = getItem<Doctor>(STORAGE_KEYS.DOCTORS).filter(d => d.id !== id);
    setItem(STORAGE_KEYS.DOCTORS, items);
  },

  // Patients
  getPatients: (): Patient[] => {
    const pts = getItem<Patient>(STORAGE_KEYS.PATIENTS);
    const profiles = getItem<Profile>(STORAGE_KEYS.PROFILES);
    return pts.map(p => ({
      ...p,
      profile: profiles.find(prof => prof.id === p.profile_id),
    }));
  },
  addPatient: (pt: Patient): Patient => {
    const items = getItem<Patient>(STORAGE_KEYS.PATIENTS);
    items.push(pt);
    setItem(STORAGE_KEYS.PATIENTS, items);
    return pt;
  },
  findPatientByProfileId: (profileId: string): Patient | undefined => {
    const pts = localDB.getPatients();
    return pts.find(p => p.profile_id === profileId);
  },

  // Appointments
  getAppointments: (): Appointment[] => {
    const appts = getItem<Appointment>(STORAGE_KEYS.APPOINTMENTS);
    const patients = localDB.getPatients();
    const doctors = localDB.getDoctors();
    return appts.map(a => ({
      ...a,
      patient: patients.find(p => p.id === a.patient_id),
      doctor: doctors.find(d => d.id === a.doctor_id),
    }));
  },
  addAppointment: (appt: Appointment): Appointment => {
    const items = getItem<Appointment>(STORAGE_KEYS.APPOINTMENTS);
    items.push(appt);
    setItem(STORAGE_KEYS.APPOINTMENTS, items);
    return appt;
  },
  updateAppointment: (id: string, updates: Partial<Appointment>): Appointment | null => {
    const items = getItem<Appointment>(STORAGE_KEYS.APPOINTMENTS);
    const idx = items.findIndex(a => a.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates };
    setItem(STORAGE_KEYS.APPOINTMENTS, items);
    return items[idx];
  },

  // Queue Entries
  getQueueEntries: (): QueueEntry[] => {
    const q = getItem<QueueEntry>(STORAGE_KEYS.QUEUE);
    const appts = localDB.getAppointments();
    const patients = localDB.getPatients();
    const doctors = localDB.getDoctors();
    return q.map(entry => ({
      ...entry,
      appointment: appts.find(a => a.id === entry.appointment_id),
      patient: patients.find(p => p.id === entry.patient_id),
      doctor: doctors.find(d => d.id === entry.doctor_id),
    }));
  },
  addQueueEntry: (entry: QueueEntry): QueueEntry => {
    const items = getItem<QueueEntry>(STORAGE_KEYS.QUEUE);
    items.push(entry);
    setItem(STORAGE_KEYS.QUEUE, items);
    return entry;
  },
  updateQueueEntry: (id: string, updates: Partial<QueueEntry>): QueueEntry | null => {
    const items = getItem<QueueEntry>(STORAGE_KEYS.QUEUE);
    const idx = items.findIndex(e => e.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates };
    setItem(STORAGE_KEYS.QUEUE, items);
    return items[idx];
  },
  getNextTokenNumber: (doctorId: string, queueDate: string): number => {
    const entries = getItem<QueueEntry>(STORAGE_KEYS.QUEUE).filter(
      e => e.doctor_id === doctorId && e.queue_date === queueDate
    );
    if (entries.length === 0) return 1;
    const maxToken = Math.max(...entries.map(e => e.token_number));
    return maxToken + 1;
  },

  // Session
  getSession: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSION);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  setSession: (session: any) => {
    if (session) {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    }
  },
};

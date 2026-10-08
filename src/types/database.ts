export type UserRole = 'admin' | 'doctor' | 'patient';

export type QueueStatus =
  | 'booked'
  | 'waiting'
  | 'called'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'cancelled';

export type AppointmentStatus = 'booked' | 'completed' | 'cancelled';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Doctor {
  id: string;
  profile_id: string;
  department_id?: string;
  specialization: string;
  availability: string;
  created_at: string;
  profile?: Profile;
  department?: Department;
}

export interface Patient {
  id: string;
  profile_id: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  created_at: string;
  profile?: Profile;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  created_at: string;
  patient?: Patient;
  doctor?: Doctor;
}

export interface QueueEntry {
  id: string;
  appointment_id: string;
  doctor_id: string;
  patient_id: string;
  queue_date: string;
  token_number: number;
  status: QueueStatus;
  created_at: string;
  called_at?: string;
  completed_at?: string;
  appointment?: Appointment;
  patient?: Patient;
  doctor?: Doctor;
}

export interface DashboardStats {
  totalPatients: number;
  totalDoctors: number;
  totalDepartments: number;
  todayAppointments: number;
  waitingPatients: number;
  completedAppointments: number;
}

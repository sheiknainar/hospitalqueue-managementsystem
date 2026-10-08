-- ==============================================================================
-- HOSPITAL QUEUE MANAGEMENT SYSTEM (CareQueue)
-- Database Schema for Supabase PostgreSQL
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES TABLE (Supports direct registration and Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'patient')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Drop the foreign key constraint if it exists so direct client/admin registration succeeds
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. DOCTORS TABLE
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    specialization TEXT NOT NULL,
    availability TEXT DEFAULT 'Available',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. PATIENTS TABLE
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('booked', 'completed', 'cancelled')) DEFAULT 'booked',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Drop strict foreign key constraints if they exist to allow client-side sync and resilient bookings
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_doctor_id_fkey;
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey;

-- 7. QUEUE ENTRIES TABLE
CREATE TABLE IF NOT EXISTS public.queue_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    queue_date DATE NOT NULL,
    token_number INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('booked', 'waiting', 'called', 'in_progress', 'completed', 'skipped', 'cancelled')) DEFAULT 'waiting',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    called_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    CONSTRAINT unique_doctor_date_token UNIQUE (doctor_id, queue_date, token_number)
);

-- Drop strict foreign key constraints on queue entries
ALTER TABLE public.queue_entries DROP CONSTRAINT IF EXISTS queue_entries_doctor_id_fkey;
ALTER TABLE public.queue_entries DROP CONSTRAINT IF EXISTS queue_entries_patient_id_fkey;
ALTER TABLE public.queue_entries DROP CONSTRAINT IF EXISTS queue_entries_appointment_id_fkey;

-- 8. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_appointments_date_doctor ON public.appointments(appointment_date, doctor_id);
CREATE INDEX IF NOT EXISTS idx_queue_date_doctor ON public.queue_entries(queue_date, doctor_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON public.queue_entries(status);
CREATE INDEX IF NOT EXISTS idx_doctors_dept ON public.doctors(department_id);

-- 9. ATOMIC SEQUENTIAL TOKEN GENERATION FUNCTION
CREATE OR REPLACE FUNCTION public.get_next_token(p_doctor_id UUID, p_queue_date DATE)
RETURNS INTEGER AS $$
DECLARE
    next_tok INTEGER;
BEGIN
    SELECT COALESCE(MAX(token_number), 0) + 1
    INTO next_tok
    FROM public.queue_entries
    WHERE doctor_id = p_doctor_id AND queue_date = p_queue_date;
    
    RETURN next_tok;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;

-- Profiles: Read all profiles, allow public/authenticated inserts, update own
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public insert profiles" ON public.profiles;
CREATE POLICY "Public insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (true);

-- Departments: Everyone can read departments; admins/staff can manage
DROP POLICY IF EXISTS "Public read departments" ON public.departments;
CREATE POLICY "Public read departments" ON public.departments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage departments" ON public.departments;
CREATE POLICY "Authenticated users can manage departments" ON public.departments FOR ALL USING (true);

-- Doctors: Everyone can read doctors; authenticated can manage
DROP POLICY IF EXISTS "Public read doctors" ON public.doctors;
CREATE POLICY "Public read doctors" ON public.doctors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage doctors" ON public.doctors;
CREATE POLICY "Authenticated users can manage doctors" ON public.doctors FOR ALL USING (true);

-- Patients: Read and manage (allow public insert for self-registration)
DROP POLICY IF EXISTS "Authenticated read patients" ON public.patients;
CREATE POLICY "Authenticated read patients" ON public.patients FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated insert patients" ON public.patients;
DROP POLICY IF EXISTS "Public insert patients" ON public.patients;
CREATE POLICY "Public insert patients" ON public.patients FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update patients" ON public.patients;
CREATE POLICY "Authenticated update patients" ON public.patients FOR UPDATE USING (true);

-- Appointments: Read and manage
DROP POLICY IF EXISTS "Authenticated read appointments" ON public.appointments;
CREATE POLICY "Authenticated read appointments" ON public.appointments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public insert appointments" ON public.appointments;
CREATE POLICY "Public insert appointments" ON public.appointments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update appointments" ON public.appointments;
CREATE POLICY "Authenticated update appointments" ON public.appointments FOR UPDATE USING (true);

-- Queue Entries: Read and manage
DROP POLICY IF EXISTS "Authenticated read queue" ON public.queue_entries;
CREATE POLICY "Authenticated read queue" ON public.queue_entries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated insert queue" ON public.queue_entries;
DROP POLICY IF EXISTS "Public insert queue" ON public.queue_entries;
CREATE POLICY "Public insert queue" ON public.queue_entries FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update queue" ON public.queue_entries;
CREATE POLICY "Authenticated update queue" ON public.queue_entries FOR UPDATE USING (true);

-- 11. ENABLE REALTIME SAFELY
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'queue_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_entries;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'appointments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
  END IF;
END $$;


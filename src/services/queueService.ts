import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { localDB } from './storageService';
import { QueueEntry, QueueStatus } from '../types/database';
import { notificationService } from './notificationService';

export const queueService = {
  // BOOK APPOINTMENT & GENERATE SEQUENTIAL TOKEN
  async bookAppointmentWithToken(params: {
    patientId: string;
    doctorId: string;
    appointmentDate: string;
    appointmentTime: string;
    notificationPhone?: string;
  }): Promise<{ appointmentId: string; tokenNumber: number; queueEntryId: string }> {
    const { patientId, doctorId, appointmentDate, appointmentTime, notificationPhone } = params;

    // Helper: persist locally and return token information
    const bookLocally = (forcedToken?: number) => {
      const apptId = crypto.randomUUID();
      const tokenNumber = forcedToken ?? localDB.getNextTokenNumber(doctorId, appointmentDate);

      localDB.addAppointment({
        id: apptId,
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        status: 'booked',
        created_at: new Date().toISOString(),
      });

      const queueEntry = localDB.addQueueEntry({
        id: crypto.randomUUID(),
        appointment_id: apptId,
        doctor_id: doctorId,
        patient_id: patientId,
        queue_date: appointmentDate,
        token_number: tokenNumber,
        status: 'waiting',
        created_at: new Date().toISOString(),
      });

      // Send instant booking confirmation alert (SMS & WhatsApp)
      this.sendBookingAlert({
        patientId,
        doctorId,
        tokenNumber,
        appointmentDate,
        appointmentTime,
        queueEntryId: queueEntry.id,
        notificationPhone,
      });

      return {
        appointmentId: apptId,
        tokenNumber,
        queueEntryId: queueEntry.id,
      };
    };

    if (!isSupabaseConfigured()) {
      return bookLocally();
    }

    try {
      // 1. Verify doctor & patient exist in Supabase database tables
      // This prevents foreign key constraint violation "appointments_doctor_id_fkey"
      // or "appointments_patient_id_fkey" when either record only exists in local storage.
      let supabaseDoctorId: string | null = null;
      let supabasePatientId: string | null = null;

      // Verify doctor
      const { data: dbDoc } = await supabase
        .from('doctors')
        .select('id')
        .eq('id', doctorId)
        .maybeSingle();

      if (dbDoc?.id) {
        supabaseDoctorId = dbDoc.id;
      } else {
        const localDoc = localDB.getDoctors().find(d => d.id === doctorId);
        if (localDoc?.profile?.email) {
          const { data: matchedDoc } = await supabase
            .from('doctors')
            .select('id, profile:profiles!inner(email)')
            .eq('profile.email', localDoc.profile.email)
            .maybeSingle();
          if (matchedDoc?.id) {
            supabaseDoctorId = matchedDoc.id;
          }
        }
      }

      // Verify patient
      const { data: dbPat } = await supabase
        .from('patients')
        .select('id')
        .eq('id', patientId)
        .maybeSingle();

      if (dbPat?.id) {
        supabasePatientId = dbPat.id;
      } else {
        const localPat = localDB.getPatients().find(p => p.id === patientId);
        if (localPat?.profile_id) {
          const { data: matchedPat } = await supabase
            .from('patients')
            .select('id')
            .eq('profile_id', localPat.profile_id)
            .maybeSingle();
          if (matchedPat?.id) {
            supabasePatientId = matchedPat.id;
          }
        }
      }

      // If either doctor or patient is not found in remote Supabase tables,
      // gracefully record in local storage so the user's booking never crashes.
      if (!supabaseDoctorId || !supabasePatientId) {
        console.info(
          `Doctor (${supabaseDoctorId ? 'found' : 'missing'}) or Patient (${supabasePatientId ? 'found' : 'missing'}) not in Supabase. Booking locally with full live queue token support.`
        );
        return bookLocally();
      }

      // 2. Query next sequential token for this doctor on this date
      let tokenNumber = 1;
      const { data: maxTokData, error: maxTokError } = await supabase
        .from('queue_entries')
        .select('token_number')
        .eq('doctor_id', supabaseDoctorId)
        .eq('queue_date', appointmentDate)
        .order('token_number', { ascending: false })
        .limit(1);

      if (maxTokError) {
        console.warn('Could not query max token from Supabase, computing local fallback:', maxTokError);
        tokenNumber = localDB.getNextTokenNumber(doctorId, appointmentDate);
      } else if (maxTokData && maxTokData.length > 0) {
        tokenNumber = maxTokData[0].token_number + 1;
      }

      // 3. Create appointment in Supabase
      const { data: apptData, error: apptError } = await supabase
        .from('appointments')
        .insert([
          {
            patient_id: supabasePatientId,
            doctor_id: supabaseDoctorId,
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            status: 'booked',
          },
        ])
        .select()
        .single();

      if (apptError) {
        console.warn('Supabase appointment insert failed, using resilient local storage:', apptError.message);
        return bookLocally(tokenNumber);
      }

      // 4. Create queue entry with sequential token in Supabase
      let queueEntryId = '';
      const { data: queueData, error: queueError } = await supabase
        .from('queue_entries')
        .insert([
          {
            appointment_id: apptData.id,
            doctor_id: supabaseDoctorId,
            patient_id: supabasePatientId,
            queue_date: appointmentDate,
            token_number: tokenNumber,
            status: 'waiting',
          },
        ])
        .select()
        .single();

      if (queueError) {
        if (queueError.code === '23505') {
          const fallbackTok = tokenNumber + 1;
          const { data: retryData, error: retryError } = await supabase
            .from('queue_entries')
            .insert([
              {
                appointment_id: apptData.id,
                doctor_id: supabaseDoctorId,
                patient_id: supabasePatientId,
                queue_date: appointmentDate,
                token_number: fallbackTok,
                status: 'waiting',
              },
            ])
            .select()
            .single();

          if (!retryError && retryData) {
            tokenNumber = fallbackTok;
            queueEntryId = retryData.id;
          }
        }
      } else if (queueData) {
        queueEntryId = queueData.id;
      }

      // 5. Always mirror to localDB for fast instant updates and offline resilience
      localDB.addAppointment({
        id: apptData.id,
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        status: 'booked',
        created_at: apptData.created_at || new Date().toISOString(),
      });

      const localQueue = localDB.addQueueEntry({
        id: queueEntryId || crypto.randomUUID(),
        appointment_id: apptData.id,
        doctor_id: doctorId,
        patient_id: patientId,
        queue_date: appointmentDate,
        token_number: tokenNumber,
        status: 'waiting',
        created_at: new Date().toISOString(),
      });

      // Send instant booking confirmation alert (SMS & WhatsApp)
      this.sendBookingAlert({
        patientId,
        doctorId,
        tokenNumber,
        appointmentDate,
        appointmentTime,
        queueEntryId: queueEntryId || localQueue.id,
        notificationPhone,
      });

      return {
        appointmentId: apptData.id,
        tokenNumber,
        queueEntryId: queueEntryId || localQueue.id,
      };
    } catch (err: any) {
      console.warn('Booking transaction exception, falling back to local storage:', err?.message || err);
      return bookLocally();
    }
  },

  // GET QUEUE FOR A DOCTOR ON A GIVEN DATE
  async getDoctorQueue(doctorId: string, date: string): Promise<QueueEntry[]> {
    const localEntries = localDB
      .getQueueEntries()
      .filter(e => e.doctor_id === doctorId && e.queue_date === date);

    if (!isSupabaseConfigured()) {
      return localEntries.sort((a, b) => a.token_number - b.token_number);
    }

    try {
      const { data, error } = await supabase
        .from('queue_entries')
        .select(`
          *,
          patient:patients(*, profile:profiles(*)),
          appointment:appointments(*)
        `)
        .eq('doctor_id', doctorId)
        .eq('queue_date', date)
        .order('token_number', { ascending: true });

      if (error) {
        console.warn('Supabase getDoctorQueue error, falling back to localDB:', error.message);
        return localEntries.sort((a, b) => a.token_number - b.token_number);
      }

      const remoteEntries = data || [];
      const remoteIds = new Set(remoteEntries.map(e => e.id));
      const remoteApptIds = new Set(remoteEntries.map(e => e.appointment_id).filter(Boolean));

      const merged = [...remoteEntries];
      for (const le of localEntries) {
        if (!remoteIds.has(le.id) && !remoteApptIds.has(le.appointment_id)) {
          merged.push(le);
        }
      }

      return merged.sort((a, b) => a.token_number - b.token_number);
    } catch (err) {
      console.warn('getDoctorQueue exception:', err);
      return localEntries.sort((a, b) => a.token_number - b.token_number);
    }
  },

  // GET ALL QUEUE ENTRIES FOR HOSPITAL QUEUE MONITOR
  async getHospitalQueue(date: string): Promise<QueueEntry[]> {
    const localEntries = localDB
      .getQueueEntries()
      .filter(e => e.queue_date === date);

    if (!isSupabaseConfigured()) {
      return localEntries.sort((a, b) => a.token_number - b.token_number);
    }

    try {
      const { data, error } = await supabase
        .from('queue_entries')
        .select(`
          *,
          doctor:doctors(*, profile:profiles(*), department:departments(*)),
          patient:patients(*, profile:profiles(*)),
          appointment:appointments(*)
        `)
        .eq('queue_date', date)
        .order('token_number', { ascending: true });

      if (error) {
        console.warn('Supabase getHospitalQueue error, falling back to localDB:', error.message);
        return localEntries.sort((a, b) => a.token_number - b.token_number);
      }

      const remoteEntries = data || [];
      const remoteIds = new Set(remoteEntries.map(e => e.id));
      const remoteApptIds = new Set(remoteEntries.map(e => e.appointment_id).filter(Boolean));

      const merged = [...remoteEntries];
      for (const le of localEntries) {
        if (!remoteIds.has(le.id) && !remoteApptIds.has(le.appointment_id)) {
          merged.push(le);
        }
      }

      return merged.sort((a, b) => a.token_number - b.token_number);
    } catch (err) {
      console.warn('getHospitalQueue exception:', err);
      return localEntries.sort((a, b) => a.token_number - b.token_number);
    }
  },

  // GET QUEUE ENTRY FOR PATIENT
  async getPatientActiveQueue(patientId: string, date: string): Promise<QueueEntry | null> {
    const getLocalActiveEntry = (): QueueEntry | null => {
      const entries = localDB.getQueueEntries();
      return (
        entries.find(
          e =>
            e.patient_id === patientId &&
            e.queue_date === date &&
            !['completed', 'cancelled'].includes(e.status)
        ) || null
      );
    };

    if (!isSupabaseConfigured()) {
      return getLocalActiveEntry();
    }

    try {
      const { data, error } = await supabase
        .from('queue_entries')
        .select(`
          *,
          doctor:doctors(*, profile:profiles(*), department:departments(*)),
          appointment:appointments(*)
        `)
        .eq('patient_id', patientId)
        .eq('queue_date', date)
        .not('status', 'in', '("completed","cancelled")')
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (error) {
        console.warn('Error fetching active patient queue from Supabase:', error.message);
        return getLocalActiveEntry();
      }

      if (data) {
        return data;
      }

      return getLocalActiveEntry();
    } catch (err) {
      console.warn('getPatientActiveQueue exception:', err);
      return getLocalActiveEntry();
    }
  },

  // UPDATE QUEUE STATUS
  async updateQueueStatus(
    queueEntryId: string,
    status: QueueStatus,
    appointmentId?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    const updates: Partial<QueueEntry> = { status };

    if (status === 'called') {
      updates.called_at = now;
    } else if (status === 'completed') {
      updates.completed_at = now;
    }

    // Always update local storage first
    localDB.updateQueueEntry(queueEntryId, updates);
    if (status === 'completed' && appointmentId) {
      localDB.updateAppointment(appointmentId, { status: 'completed' });
    }

    // Automatically trigger proximity alerts (3 positions away) and call alerts (SMS & WhatsApp)
    this.triggerQueueAlerts(queueEntryId, status);

    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      await supabase
        .from('queue_entries')
        .update(updates)
        .eq('id', queueEntryId);

      if (status === 'completed' && appointmentId) {
        await supabase
          .from('appointments')
          .update({ status: 'completed' })
          .eq('id', appointmentId);
      }
    } catch (err) {
      console.warn('Supabase updateQueueStatus warning:', err);
    }
  },

  // RESOLVE PATIENT REGISTERED MOBILE PHONE NUMBER
  resolvePatientPhone(patientId: string, preferredPhone?: string): string {
    if (preferredPhone && preferredPhone.trim()) {
      return preferredPhone.trim();
    }

    const localPt = localDB.getPatients().find(p => p.id === patientId);
    if (localPt?.phone && localPt.phone.trim()) return localPt.phone.trim();
    if (localPt?.profile?.phone && localPt.profile.phone.trim()) return localPt.profile.phone.trim();

    const prefs = notificationService.getPreferences(patientId);
    if (prefs?.phoneNumber && prefs.phoneNumber.trim()) return prefs.phoneNumber.trim();

    const session = localDB.getSession();
    if (session && (session.id === patientId || session.id === localPt?.profile_id)) {
      if (session.phone && session.phone.trim()) return session.phone.trim();
    }

    const profiles = localDB.getProfiles();
    const matchedProf = profiles.find(p => p.id === localPt?.profile_id || p.id === patientId);
    if (matchedProf?.phone && matchedProf.phone.trim()) return matchedProf.phone.trim();

    return '9876543210';
  },

  // DISPATCH BOOKING CONFIRMATION ALERT (SMS & WhatsApp)
  sendBookingAlert(params: {
    patientId: string;
    doctorId: string;
    tokenNumber: number;
    appointmentDate: string;
    appointmentTime: string;
    queueEntryId: string;
    notificationPhone?: string;
  }): void {
    try {
      const patient = localDB.getPatients().find(p => p.id === params.patientId);
      const doctor = localDB.getDoctors().find(d => d.id === params.doctorId);
      const phone = this.resolvePatientPhone(params.patientId, params.notificationPhone);
      const patientName = patient?.profile?.full_name || 'Patient';
      const doctorName = doctor?.profile?.full_name || 'Attending Doctor';
      const departmentName = doctor?.department?.name || 'General OPD';

      notificationService.dispatchAlert({
        type: 'booking_confirmed',
        recipientPhone: phone,
        recipientName: patientName,
        tokenNumber: params.tokenNumber,
        doctorName,
        departmentName,
        appointmentDate: params.appointmentDate,
        appointmentTime: params.appointmentTime,
        queueEntryId: params.queueEntryId,
      });
    } catch (e) {
      console.warn('Could not dispatch booking alert:', e);
    }
  },

  // EVALUATE & TRIGGER AUTOMATIC QUEUE ALERTS TO PATIENT'S REGISTERED PHONE
  async triggerQueueAlerts(queueEntryId: string, updatedStatus: QueueStatus): Promise<void> {
    try {
      const allEntries = localDB.getQueueEntries();
      const targetEntry = allEntries.find(e => e.id === queueEntryId);
      if (!targetEntry) return;

      const doctorId = targetEntry.doctor_id;
      const queueDate = targetEntry.queue_date;
      const patient = targetEntry.patient || localDB.getPatients().find(p => p.id === targetEntry.patient_id);
      const doctor = targetEntry.doctor || localDB.getDoctors().find(d => d.id === doctorId);
      const phone = this.resolvePatientPhone(targetEntry.patient_id, patient?.phone || patient?.profile?.phone);
      const patientName = patient?.profile?.full_name || 'Patient';
      const doctorName = doctor?.profile?.full_name || 'Doctor';
      const departmentName = doctor?.department?.name || 'OPD';

      // 1. Direct status change alerts for target patient
      if (updatedStatus === 'called') {
        notificationService.dispatchAlert({
          type: 'called',
          recipientPhone: phone,
          recipientName: patientName,
          tokenNumber: targetEntry.token_number,
          doctorName,
          departmentName,
          appointmentTime: targetEntry.appointment?.appointment_time,
          queueEntryId: targetEntry.id,
        });
      } else if (updatedStatus === 'in_progress') {
        notificationService.dispatchAlert({
          type: 'in_progress',
          recipientPhone: phone,
          recipientName: patientName,
          tokenNumber: targetEntry.token_number,
          doctorName,
          departmentName,
          queueEntryId: targetEntry.id,
        });
      } else if (updatedStatus === 'completed') {
        notificationService.dispatchAlert({
          type: 'completed',
          recipientPhone: phone,
          recipientName: patientName,
          tokenNumber: targetEntry.token_number,
          doctorName,
          departmentName,
          queueEntryId: targetEntry.id,
        });
      }

      // 2. Evaluate all waiting patients in this doctor's queue for live proximity status
      const docEntries = allEntries
        .filter(e => e.doctor_id === doctorId && e.queue_date === queueDate)
        .sort((a, b) => a.token_number - b.token_number);

      const waitingEntries = docEntries.filter(e => e.status === 'waiting');

      for (let i = 0; i < waitingEntries.length; i++) {
        const entry = waitingEntries[i];
        const patientsAhead = i; // 0 = next in line, 3 = exactly 3 ahead
        const waitingPt = entry.patient || localDB.getPatients().find(p => p.id === entry.patient_id);
        const waitingDoc = entry.doctor || localDB.getDoctors().find(d => d.id === doctorId);
        const waitingPhone = this.resolvePatientPhone(entry.patient_id, waitingPt?.phone || waitingPt?.profile?.phone);
        const waitingName = waitingPt?.profile?.full_name || 'Patient';

        // Proximity alert: 3 positions away
        if (patientsAhead === 3) {
          notificationService.dispatchAlert({
            type: 'three_away',
            recipientPhone: waitingPhone,
            recipientName: waitingName,
            tokenNumber: entry.token_number,
            doctorName: waitingDoc?.profile?.full_name || doctorName,
            departmentName: waitingDoc?.department?.name || departmentName,
            patientsAhead,
            queueEntryId: entry.id,
          });
        }
        // Next in line alert: exactly 1 ahead (or 0 ahead)
        else if (patientsAhead === 1) {
          notificationService.dispatchAlert({
            type: 'next_in_line',
            recipientPhone: waitingPhone,
            recipientName: waitingName,
            tokenNumber: entry.token_number,
            doctorName: waitingDoc?.profile?.full_name || doctorName,
            departmentName: waitingDoc?.department?.name || departmentName,
            patientsAhead,
            queueEntryId: entry.id,
          });
        }
      }
    } catch (err) {
      console.warn('Queue automated alerts check error:', err);
    }
  },

  // REAL-TIME SUBSCRIPTION
  subscribeToQueueChanges(callback: () => void): () => void {
    const localHandler = (e: any) => {
      if (
        e.detail?.key === 'carequeue_queue_entries' ||
        e.detail?.key === 'carequeue_appointments'
      ) {
        callback();
      }
    };
    window.addEventListener('carequeue_storage_change', localHandler);

    if (!isSupabaseConfigured()) {
      return () => window.removeEventListener('carequeue_storage_change', localHandler);
    }

    const channel = supabase
      .channel('queue-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_entries' },
        () => {
          callback();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          callback();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('carequeue_storage_change', localHandler);
      supabase.removeChannel(channel);
    };
  },
};

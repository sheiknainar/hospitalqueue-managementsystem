/**
 * CareQueue SMS & WhatsApp Alert Service
 * Handles dispatching, scheduling, simulating, and tracking SMS and WhatsApp alerts.
 * Features:
 * - Proximity alerts when a patient is 3 positions away in the OPD queue.
 * - Call alerts when a patient's token is called into the consultation room.
 * - Instant booking confirmation alerts with sequential token and slot details.
 * - Patient preference management (phone number, SMS toggle, WhatsApp toggle).
 * - Direct WhatsApp Web/App link generation (`https://wa.me/...`).
 */

import { smsService, SmsAlertType, normalizePhoneNumber } from './smsService';

export type AlertType =
  | 'three_away'
  | 'called'
  | 'booking_confirmed'
  | 'live_status'
  | 'next_in_line'
  | 'in_progress'
  | 'completed'
  | 'reminder';

export type AlertChannel = 'sms' | 'whatsapp';

export interface AlertNotification {
  id: string;
  recipientPhone: string;
  recipientName: string;
  channel: AlertChannel;
  type: AlertType;
  title: string;
  message: string;
  tokenNumber: number;
  doctorName: string;
  departmentName: string;
  timestamp: string;
  read: boolean;
  deliveryStatus: 'delivered' | 'sent' | 'pending';
  whatsappUrl?: string;
  smsUrl?: string;
}

export interface PatientAlertPreferences {
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  phoneNumber: string;
  leadAlertThreshold: number; // Default 3 positions away
}

const STORAGE_KEYS = {
  NOTIFICATIONS: 'carequeue_notifications',
  DISPATCH_REGISTRY: 'carequeue_dispatched_alert_keys',
  PREFERENCES_PREFIX: 'carequeue_alert_prefs_',
};

// Play a pleasant notification chime using Web Audio API
export function playAlertChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // First tone (E5: 659Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.25);

    // Second tone (G#5: 830.6Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.18, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.4);
  } catch {
    // Audio context may be restricted before user interaction
  }
}

/**
 * Format phone numbers to clean international format
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length === 10) return `+91${cleaned}`; // Default to +91 if standard 10-digit
  return `+${cleaned}`;
}

export const notificationService = {
  // GET ALL NOTIFICATIONS
  getNotifications(): AlertNotification[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // GET NOTIFICATIONS FOR A SPECIFIC PATIENT / PHONE
  getNotificationsForRecipient(phoneNumber?: string, patientName?: string): AlertNotification[] {
    const all = this.getNotifications();
    const cleanTargetPhone = phoneNumber ? phoneNumber.replace(/[^\d]/g, '') : '';
    
    return all.filter(n => {
      if (cleanTargetPhone && n.recipientPhone.replace(/[^\d]/g, '').includes(cleanTargetPhone)) {
        return true;
      }
      if (patientName && n.recipientName.toLowerCase() === patientName.toLowerCase()) {
        return true;
      }
      return false;
    });
  },

  // GET PATIENT PREFERENCES
  getPreferences(patientIdOrProfileId: string): PatientAlertPreferences {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.PREFERENCES_PREFIX}${patientIdOrProfileId}`);
      if (data) return JSON.parse(data);
    } catch {}
    return {
      smsEnabled: true,
      whatsappEnabled: true,
      phoneNumber: '',
      leadAlertThreshold: 3,
    };
  },

  // SAVE PATIENT PREFERENCES
  savePreferences(patientIdOrProfileId: string, prefs: PatientAlertPreferences): void {
    try {
      localStorage.setItem(
        `${STORAGE_KEYS.PREFERENCES_PREFIX}${patientIdOrProfileId}`,
        JSON.stringify(prefs)
      );
      window.dispatchEvent(new CustomEvent('carequeue_prefs_updated', { detail: { patientIdOrProfileId, prefs } }));
    } catch (err) {
      console.error('Failed saving alert preferences', err);
    }
  },

  // CHECK IF ALERTS HAVE ALREADY BEEN DISPATCHED (PREVENT DUPLICATES)
  hasDispatched(registryKey: string): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DISPATCH_REGISTRY);
      const registry: string[] = raw ? JSON.parse(raw) : [];
      return registry.includes(registryKey);
    } catch {
      return false;
    }
  },

  markDispatched(registryKey: string): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DISPATCH_REGISTRY);
      const registry: string[] = raw ? JSON.parse(raw) : [];
      if (!registry.includes(registryKey)) {
        registry.push(registryKey);
        localStorage.setItem(STORAGE_KEYS.DISPATCH_REGISTRY, JSON.stringify(registry));
      }
    } catch {}
  },

  // DISPATCH ALERT
  async dispatchAlert(params: {
    type: AlertType;
    recipientPhone: string;
    recipientName: string;
    tokenNumber: number;
    doctorName: string;
    departmentName: string;
    appointmentTime?: string;
    appointmentDate?: string;
    patientsAhead?: number;
    queueEntryId?: string;
    forceSend?: boolean;
  }): Promise<{ smsDispatched: boolean; whatsappDispatched: boolean; notifications: AlertNotification[] }> {
    const {
      type,
      recipientPhone,
      recipientName,
      tokenNumber,
      doctorName,
      departmentName,
      appointmentTime,
      appointmentDate,
      patientsAhead = 0,
      queueEntryId,
      forceSend = false,
    } = params;

    const formattedPhone = formatPhoneNumber(recipientPhone || '9876543210');
    const now = new Date().toISOString();
    const createdNotifications: AlertNotification[] = [];

    // Deduplication check
    if (queueEntryId && !forceSend) {
      const dedupKey = `${queueEntryId}_${type}`;
      if (this.hasDispatched(dedupKey)) {
        return { smsDispatched: false, whatsappDispatched: false, notifications: [] };
      }
      this.markDispatched(dedupKey);
    }

    // Message generation based on alert type
    let smsTitle = '';
    let smsBody = '';
    let whatsappTitle = '';
    let whatsappBody = '';
    let mappedSmsType: SmsAlertType = 'live_status';

    const liveTrackingUrl = `${window.location.origin}/patient`;

    if (type === 'three_away') {
      mappedSmsType = 'three_away';
      smsTitle = `Queue Alert: 3 Patients Ahead (Token #${tokenNumber})`;
      smsBody = `[Bharathiar Hospital OPD] QUEUE ALERT: Only 3 patients ahead of your Token #${tokenNumber} for Dr. ${doctorName} (${departmentName}). Please proceed to OPD Waiting Hall now. Live tracker: ${liveTrackingUrl}`;

      whatsappTitle = `OPD Proximity Alert: Token #${tokenNumber}`;
      whatsappBody = `🏥 *Bharathiar Hospital OPD Proximity Alert*\n\n👋 Hello *${recipientName}*,\n\n⚠️ *Only 3 patients are ahead of you!*\n\n• *Token Number:* #${tokenNumber}\n• *Doctor:* Dr. ${doctorName}\n• *Department:* ${departmentName}\n• *Patients Ahead:* ${patientsAhead}\n\n📍 *Action Required:* Please make your way toward the consultation waiting area near Dr. ${doctorName}'s chamber. You will be called shortly!\n\n🔗 Live Tracker: ${liveTrackingUrl}`;
    } else if (type === 'next_in_line') {
      mappedSmsType = 'next_in_line';
      smsTitle = `Next in Line: Token #${tokenNumber}`;
      smsBody = `[Bharathiar Hospital OPD] NEXT IN LINE: Token #${tokenNumber} (${recipientName}) is next for Dr. ${doctorName}. Please wait right in front of the consultation room door. Live: ${liveTrackingUrl}`;

      whatsappTitle = `Next in Line Alert: Token #${tokenNumber}`;
      whatsappBody = `⚡ *Next In Line Notice*\n\n👋 *${recipientName}*, your turn is next!\n\n👉 *Token #${tokenNumber} is NEXT*\n👨‍⚕️ *Doctor:* Dr. ${doctorName} (${departmentName})\n\n🚪 Please stand by directly outside the consultation room door.`;
    } else if (type === 'called') {
      mappedSmsType = 'called';
      smsTitle = `URGENT: Token #${tokenNumber} CALLED`;
      smsBody = `[Bharathiar Hospital OPD] ⚠️ URGENT CALL: Token #${tokenNumber} (${recipientName}) is now CALLED by Dr. ${doctorName}. Please proceed immediately inside the consultation room!`;

      whatsappTitle = `Consultation Call: Token #${tokenNumber}`;
      whatsappBody = `🔔 *Bharathiar Hospital Live OPD Call Notice*\n\n👋 *${recipientName}*, your token is being attended!\n\n👉 *Token #${tokenNumber} IS CALLED NOW*\n👨‍⚕️ *Consulting with:* Dr. ${doctorName}\n🏢 *Department:* ${departmentName}\n\n🚪 *Please proceed immediately inside the doctor's consultation room.*`;
    } else if (type === 'in_progress') {
      mappedSmsType = 'in_progress';
      smsTitle = `Consultation In Progress: Token #${tokenNumber}`;
      smsBody = `[Bharathiar Hospital OPD] LIVE STATUS: Consultation in progress for Token #${tokenNumber} with Dr. ${doctorName}.`;

      whatsappTitle = `Consultation In Progress`;
      whatsappBody = `🩺 Consultation in progress for Token #${tokenNumber} with Dr. ${doctorName}.`;
    } else if (type === 'completed') {
      mappedSmsType = 'completed';
      smsTitle = `Consultation Completed: Token #${tokenNumber}`;
      smsBody = `[Bharathiar Hospital OPD] COMPLETED: Consultation for Token #${tokenNumber} with Dr. ${doctorName} is complete. Prescriptions & receipts available in portal: ${liveTrackingUrl}`;

      whatsappTitle = `Consultation Complete`;
      whatsappBody = `✅ Consultation completed for Token #${tokenNumber} with Dr. ${doctorName}. Thank you for visiting Bharathiar Hospital!`;
    } else if (type === 'booking_confirmed') {
      mappedSmsType = 'token_confirmation';
      smsTitle = `Appointment Confirmed: Token #${tokenNumber}`;
      smsBody = `[Bharathiar Hospital OPD] CONFIRMED! Token #${tokenNumber} booked for ${recipientName}. Dr. ${doctorName} (${departmentName}) on ${appointmentDate || 'Today'} at ${appointmentTime || 'OPD hours'}. Live token tracker: ${liveTrackingUrl}`;

      whatsappTitle = `Booking Confirmed: Token #${tokenNumber}`;
      whatsappBody = `🎉 *Bharathiar Hospital Appointment Confirmation*\n\nDear *${recipientName}*,\n\nYour OPD consultation appointment is confirmed:\n\n🎫 *Sequential Token:* #${tokenNumber}\n👨‍⚕️ *Doctor:* Dr. ${doctorName}\n🏢 *Department:* ${departmentName}\n📅 *Date:* ${appointmentDate}\n⏰ *Time Slot:* ${appointmentTime}\n\n📱 You will receive automated SMS & WhatsApp alerts when only 3 patients are ahead of you.\n\n🔗 *Track Live Token:* ${liveTrackingUrl}`;
    } else {
      mappedSmsType = 'live_status';
      smsTitle = `Live OPD Status: Token #${tokenNumber}`;
      smsBody = `[Bharathiar Hospital OPD] LIVE STATUS: Token #${tokenNumber} for Dr. ${doctorName}. Waiting position: ${patientsAhead} ahead. Tracker: ${liveTrackingUrl}`;
      whatsappTitle = `OPD Status Update`;
      whatsappBody = `Reminder: Token #${tokenNumber} with Dr. ${doctorName} is currently active. ${patientsAhead} patients ahead.`;
    }

    const { clean10Digit, international } = normalizePhoneNumber(formattedPhone);
    const whatsappWebLink = `https://wa.me/91${clean10Digit}?text=${encodeURIComponent(whatsappBody)}`;
    const nativeSmsLink = `sms:${international}?body=${encodeURIComponent(smsBody)}`;

    // Dispatch real SMS via SMS gateway service (Fast2SMS / Twilio / Native)
    let smsDispatchResult: any = null;
    try {
      smsDispatchResult = await smsService.sendSms({
        toPhone: clean10Digit,
        patientName: recipientName,
        tokenNumber,
        doctorName,
        departmentName,
        type: mappedSmsType,
        appointmentDate,
        appointmentTime,
        patientsAhead,
        liveTrackingUrl,
      });
    } catch (err) {
      console.warn('SMS dispatch error:', err);
    }

    // Create SMS Notification record
    const smsNotification: AlertNotification = {
      id: `sms_${crypto.randomUUID()}`,
      recipientPhone: international,
      recipientName,
      channel: 'sms',
      type,
      title: smsTitle,
      message: smsBody,
      tokenNumber,
      doctorName,
      departmentName,
      timestamp: now,
      read: false,
      deliveryStatus: smsDispatchResult?.success ? 'delivered' : 'pending',
      smsUrl: nativeSmsLink,
    };

    // Create WhatsApp Notification record
    const whatsappNotification: AlertNotification = {
      id: `wa_${crypto.randomUUID()}`,
      recipientPhone: international,
      recipientName,
      channel: 'whatsapp',
      type,
      title: whatsappTitle,
      message: whatsappBody,
      tokenNumber,
      doctorName,
      departmentName,
      timestamp: now,
      read: false,
      deliveryStatus: 'delivered',
      whatsappUrl: whatsappWebLink,
      smsUrl: nativeSmsLink,
    };

    createdNotifications.push(smsNotification, whatsappNotification);

    // Save to local storage
    try {
      const existing = this.getNotifications();
      const updated = [smsNotification, whatsappNotification, ...existing].slice(0, 100);
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));

      // Play audio chime
      playAlertChime();

      // Dispatch global events for UI components
      window.dispatchEvent(
        new CustomEvent('carequeue_new_alert', {
          detail: {
            sms: smsNotification,
            whatsapp: whatsappNotification,
            type,
            tokenNumber,
            smsResult: smsDispatchResult,
          },
        })
      );
      window.dispatchEvent(
        new CustomEvent('carequeue_notifications_updated', {
          detail: { notifications: updated },
        })
      );
    } catch (err) {
      console.error('Error persisting notification alerts', err);
    }

    return {
      smsDispatched: true,
      whatsappDispatched: true,
      notifications: createdNotifications,
    };
  },

  // MARK ALL AS READ
  markAllAsRead(): void {
    try {
      const notifications = this.getNotifications().map(n => ({ ...n, read: true }));
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
      window.dispatchEvent(new CustomEvent('carequeue_notifications_updated', { detail: { notifications } }));
    } catch {}
  },

  // CLEAR ALL NOTIFICATIONS
  clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
      window.dispatchEvent(new CustomEvent('carequeue_notifications_updated', { detail: { notifications: [] } }));
    } catch {}
  },
};

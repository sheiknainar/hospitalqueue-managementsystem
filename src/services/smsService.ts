/**
 * CareQueue Automated Hospital SMS Gateway Service
 * 
 * Handles real-time, automated SMS delivery to the patient's registered mobile number for:
 * 1. Token Confirmation (sequential token, doctor, department, date & time)
 * 2. Live Queue Status & Proximity Alerts (e.g. 3 patients ahead, next in line)
 * 3. Token Called Urgent Notice (consultation room entry alert)
 * 4. Consultation In-Progress & Completed summaries
 * 
 * Supported Delivery Modes:
 * - Fast2SMS Gateway (India quick SMS API)
 * - Twilio SMS Gateway (Global API)
 * - Custom SMS Webhook / Provider API
 * - Native Mobile SMS Protocol (direct sms: uri)
 * - Automated Handset Simulator with audio chime
 */

export type SmsAlertType =
  | 'token_confirmation'
  | 'live_status'
  | 'three_away'
  | 'next_in_line'
  | 'called'
  | 'in_progress'
  | 'completed';

export interface SmsPayload {
  toPhone: string;
  patientName: string;
  tokenNumber: number;
  doctorName: string;
  departmentName: string;
  type: SmsAlertType;
  appointmentDate?: string;
  appointmentTime?: string;
  patientsAhead?: number;
  liveTrackingUrl?: string;
}

export interface SmsDispatchResult {
  success: boolean;
  channel: 'fast2sms' | 'twilio' | 'webhook' | 'native_device' | 'simulated';
  recipientPhone: string;
  formattedPhone: string;
  messageText: string;
  nativeSmsUri: string;
  whatsappUri: string;
  gatewayResponse?: any;
  timestamp: string;
  error?: string;
}

export interface SmsGatewayConfig {
  fast2SmsApiKey?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromPhone?: string;
  webhookUrl?: string;
  senderId?: string;
}

const STORAGE_KEY_SMS_CONFIG = 'carequeue_sms_gateway_config';
const STORAGE_KEY_SMS_LOGS = 'carequeue_dispatched_sms_logs';

/**
 * Normalizes phone numbers to standard clean 10-digit format and E.164 international format
 */
export function normalizePhoneNumber(rawPhone: string): { clean10Digit: string; international: string } {
  const digits = (rawPhone || '').replace(/\D/g, '');
  
  let clean10Digit = digits;
  if (digits.length > 10 && digits.startsWith('91')) {
    clean10Digit = digits.slice(2);
  } else if (digits.length > 10) {
    clean10Digit = digits.slice(-10);
  }

  // Fallback to placeholder if invalid
  if (clean10Digit.length < 10) {
    clean10Digit = clean10Digit.padStart(10, '0');
  }

  const international = `+91${clean10Digit}`;
  return { clean10Digit, international };
}

/**
 * Builds standard, clear hospital SMS text templates
 */
export function buildSmsMessage(payload: SmsPayload): string {
  const {
    patientName,
    tokenNumber,
    doctorName,
    departmentName,
    type,
    appointmentDate,
    appointmentTime,
    patientsAhead = 0,
    liveTrackingUrl = window.location.origin + '/patient',
  } = payload;

  const hospitalTag = '[Bharathiar Hospital OPD]';

  switch (type) {
    case 'token_confirmation':
      return `${hospitalTag} CONFIRMED! Token #${tokenNumber} booked for ${patientName}. Dr. ${doctorName} (${departmentName}) on ${appointmentDate || 'Today'} at ${appointmentTime || 'OPD hours'}. Live token status: ${liveTrackingUrl}`;

    case 'three_away':
      return `${hospitalTag} QUEUE ALERT: Token #${tokenNumber}. Only 3 patients ahead of you for Dr. ${doctorName} (${departmentName}). Please proceed to OPD Waiting Hall now. Live tracker: ${liveTrackingUrl}`;

    case 'next_in_line':
      return `${hospitalTag} NEXT IN LINE: Token #${tokenNumber} (${patientName}) is next for Dr. ${doctorName}. Please wait right outside Room/Door. Live: ${liveTrackingUrl}`;

    case 'called':
      return `${hospitalTag} ⚠️ URGENT CALL: Token #${tokenNumber} (${patientName}) is CALLED NOW by Dr. ${doctorName}! Enter the consultation room immediately.`;

    case 'in_progress':
      return `${hospitalTag} LIVE STATUS: Consultation in progress for Token #${tokenNumber} with Dr. ${doctorName}.`;

    case 'completed':
      return `${hospitalTag} COMPLETED: Consultation for Token #${tokenNumber} with Dr. ${doctorName} is complete. Prescriptions & receipts available in portal: ${liveTrackingUrl}`;

    case 'live_status':
    default:
      return `${hospitalTag} LIVE STATUS: Token #${tokenNumber} for Dr. ${doctorName}. Waiting position: ${patientsAhead} ahead. Tracker: ${liveTrackingUrl}`;
  }
}

export const smsService = {
  /**
   * Retrieves SMS Gateway configuration from localStorage or .env
   */
  getConfig(): SmsGatewayConfig {
    let saved: SmsGatewayConfig = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SMS_CONFIG);
      if (raw) saved = JSON.parse(raw);
    } catch {}

    return {
      fast2SmsApiKey: saved.fast2SmsApiKey || import.meta.env.VITE_FAST2SMS_API_KEY || import.meta.env.VITE_SMS_API_KEY || '',
      twilioAccountSid: saved.twilioAccountSid || import.meta.env.VITE_TWILIO_ACCOUNT_SID || '',
      twilioAuthToken: saved.twilioAuthToken || import.meta.env.VITE_TWILIO_AUTH_TOKEN || '',
      twilioFromPhone: saved.twilioFromPhone || import.meta.env.VITE_TWILIO_PHONE_NUMBER || '',
      webhookUrl: saved.webhookUrl || import.meta.env.VITE_SMS_WEBHOOK_URL || '',
      senderId: saved.senderId || import.meta.env.VITE_SMS_SENDER_ID || 'BRHOSP',
    };
  },

  /**
   * Saves SMS Gateway configuration to localStorage
   */
  saveConfig(config: Partial<SmsGatewayConfig>): void {
    const current = this.getConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STORAGE_KEY_SMS_CONFIG, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('carequeue_sms_config_updated', { detail: updated }));
  },

  /**
   * Checks if a live real SMS gateway (Fast2SMS, Twilio, or Webhook) is configured
   */
  isLiveGatewayConfigured(): boolean {
    const config = this.getConfig();
    return Boolean(
      config.fast2SmsApiKey ||
      (config.twilioAccountSid && config.twilioAuthToken) ||
      config.webhookUrl
    );
  },

  /**
   * Dispatches an SMS automatically to the patient's registered mobile number
   */
  async sendSms(payload: SmsPayload): Promise<SmsDispatchResult> {
    const { clean10Digit, international } = normalizePhoneNumber(payload.toPhone);
    const messageText = buildSmsMessage(payload);
    const config = this.getConfig();
    const now = new Date().toISOString();

    // Generate direct device SMS protocol & WhatsApp links
    const nativeSmsUri = `sms:${international}?body=${encodeURIComponent(messageText)}`;
    const whatsappUri = `https://wa.me/91${clean10Digit}?text=${encodeURIComponent(messageText)}`;

    let dispatchResult: SmsDispatchResult = {
      success: true,
      channel: 'simulated',
      recipientPhone: clean10Digit,
      formattedPhone: international,
      messageText,
      nativeSmsUri,
      whatsappUri,
      timestamp: now,
    };

    // 1. Try Fast2SMS Gateway if configured (standard Indian SMS gateway)
    if (config.fast2SmsApiKey) {
      try {
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: config.fast2SmsApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'q',
            message: messageText,
            language: 'english',
            flash: 0,
            numbers: clean10Digit,
          }),
        });

        const data = await response.json();
        if (data.return) {
          dispatchResult.channel = 'fast2sms';
          dispatchResult.gatewayResponse = data;
          console.info(`[Fast2SMS] Successfully dispatched SMS to ${international}:`, data);
        } else {
          console.warn(`[Fast2SMS] Gateway reported error:`, data.message);
          dispatchResult.error = data.message;
        }
      } catch (err: any) {
        console.warn(`[Fast2SMS] Network request failed (will record resilient log):`, err?.message || err);
        dispatchResult.error = err?.message || 'Network error';
      }
    }
    // 2. Try Twilio Gateway if configured
    else if (config.twilioAccountSid && config.twilioAuthToken && config.twilioFromPhone) {
      try {
        const auth = btoa(`${config.twilioAccountSid}:${config.twilioAuthToken}`);
        const params = new URLSearchParams();
        params.append('To', international);
        params.append('From', config.twilioFromPhone);
        params.append('Body', messageText);

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          }
        );

        const data = await response.json();
        if (response.ok) {
          dispatchResult.channel = 'twilio';
          dispatchResult.gatewayResponse = data;
          console.info(`[Twilio] Successfully dispatched SMS to ${international}:`, data);
        } else {
          console.warn(`[Twilio] Error:`, data.message);
          dispatchResult.error = data.message;
        }
      } catch (err: any) {
        console.warn(`[Twilio] Network request exception:`, err);
        dispatchResult.error = err?.message || 'Twilio exception';
      }
    }
    // 3. Try Webhook if configured
    else if (config.webhookUrl) {
      try {
        const response = await fetch(config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: international,
            phone10: clean10Digit,
            message: messageText,
            tokenNumber: payload.tokenNumber,
            type: payload.type,
            patientName: payload.patientName,
          }),
        });
        const data = await response.json();
        dispatchResult.channel = 'webhook';
        dispatchResult.gatewayResponse = data;
      } catch (err: any) {
        dispatchResult.error = err?.message;
      }
    }

    // Always log the dispatched SMS for patient & hospital reference
    this.recordSmsLog(dispatchResult, payload);

    // Broadcast live event for UI components (toast banner, sound chime, mobile handset)
    window.dispatchEvent(
      new CustomEvent('carequeue_sms_dispatched', {
        detail: {
          result: dispatchResult,
          payload,
        },
      })
    );

    return dispatchResult;
  },

  /**
   * Records SMS dispatch history in localStorage
   */
  recordSmsLog(result: SmsDispatchResult, payload: SmsPayload): void {
    try {
      const logs = this.getSmsLogs();
      const updated = [
        {
          id: `sms_log_${crypto.randomUUID()}`,
          ...result,
          patientName: payload.patientName,
          tokenNumber: payload.tokenNumber,
          doctorName: payload.doctorName,
          departmentName: payload.departmentName,
          type: payload.type,
        },
        ...logs,
      ].slice(0, 150);

      localStorage.setItem(STORAGE_KEY_SMS_LOGS, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed recording SMS dispatch log:', err);
    }
  },

  /**
   * Retrieves all dispatched SMS logs
   */
  getSmsLogs(): any[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SMS_LOGS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Clears SMS logs
   */
  clearSmsLogs(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_SMS_LOGS);
      window.dispatchEvent(new CustomEvent('carequeue_sms_dispatched', { detail: null }));
    } catch {}
  },
};

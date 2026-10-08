import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  MessageSquare,
  Smartphone,
  CheckCheck,
  ExternalLink,
  Send,
  Trash2,
  CheckCircle2,
  Volume2,
  Settings,
  AlertTriangle,
  Clock,
  Sparkles,
  Phone,
} from 'lucide-react';
import {
  notificationService,
  AlertNotification,
  PatientAlertPreferences,
  playAlertChime,
} from '../../services/notificationService';
import { smsService, SmsGatewayConfig, normalizePhoneNumber } from '../../services/smsService';
import { useAuth } from '../../contexts/AuthContext';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const { user, patientRecord } = useAuth();
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [activeTab, setActiveTab] = useState<'inbox' | 'preview' | 'preferences'>('inbox');
  const [previewChannel, setPreviewChannel] = useState<'whatsapp' | 'sms'>('sms');
  const [selectedNotification, setSelectedNotification] = useState<AlertNotification | null>(null);
  const [gatewayConfig, setGatewayConfig] = useState<SmsGatewayConfig>(smsService.getConfig());
  const [gatewaySaved, setGatewaySaved] = useState(false);

  // Patient Preferences state
  const targetId = patientRecord?.id || user?.id || 'guest';
  const [prefs, setPrefs] = useState<PatientAlertPreferences>({
    smsEnabled: true,
    whatsappEnabled: true,
    phoneNumber: patientRecord?.phone || user?.phone || '9876543210',
    leadAlertThreshold: 3,
  });
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [testSending, setTestSending] = useState(false);

  const loadNotifications = () => {
    const list = notificationService.getNotifications();
    setNotifications(list);
    if (!selectedNotification && list.length > 0) {
      setSelectedNotification(list[0]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      notificationService.markAllAsRead();
      const p = notificationService.getPreferences(targetId);
      if (p.phoneNumber || patientRecord?.phone || user?.phone) {
        setPrefs({
          ...p,
          phoneNumber: p.phoneNumber || patientRecord?.phone || user?.phone || '9876543210',
        });
      }
    }
  }, [isOpen, targetId, patientRecord, user]);

  useEffect(() => {
    const handleUpdate = () => {
      loadNotifications();
    };
    window.addEventListener('carequeue_notifications_updated', handleUpdate);
    return () => window.removeEventListener('carequeue_notifications_updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const handleClearAll = () => {
    if (window.confirm('Clear all SMS & WhatsApp notification alerts?')) {
      notificationService.clearAll();
      setNotifications([]);
      setSelectedNotification(null);
    }
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    notificationService.savePreferences(targetId, prefs);
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 2500);
  };

  const handleSimulateAlert = async (type: 'three_away' | 'called' | 'booking_confirmed') => {
    setTestSending(true);
    try {
      await notificationService.dispatchAlert({
        type,
        recipientPhone: prefs.phoneNumber || '9876543210',
        recipientName: user?.full_name || 'Patient',
        tokenNumber: 14,
        doctorName: 'Sarah Jenkins',
        departmentName: 'Cardiology',
        appointmentTime: '10:30 AM',
        appointmentDate: new Date().toISOString().split('T')[0],
        patientsAhead: type === 'three_away' ? 3 : 0,
        forceSend: true,
      });
      loadNotifications();
      setActiveTab('preview');
      setPreviewChannel('sms');
    } finally {
      setTestSending(false);
    }
  };

  // Preview target
  const currentPreview =
    selectedNotification ||
    notifications[0] || {
      id: 'demo',
      channel: previewChannel,
      type: 'three_away',
      title: 'OPD Proximity Alert: Token #14',
      message: `🏥 *CareQueue OPD Proximity Alert*\n\n👋 Hello *${user?.full_name || 'Patient'}*,\n\n⚠️ *Only 3 patients are ahead of you!*\n\n• *Token Number:* #14\n• *Doctor:* Dr. Sarah Jenkins\n• *Department:* Cardiology\n• *Patients Ahead:* 3\n\n📍 *Action Required:* Please make your way toward the consultation waiting area near Dr. Sarah Jenkins's chamber. You will be called shortly!`,
      tokenNumber: 14,
      doctorName: 'Sarah Jenkins',
      departmentName: 'Cardiology',
      timestamp: new Date().toISOString(),
      recipientPhone: prefs.phoneNumber || '+91 98765 43210',
      recipientName: user?.full_name || 'Patient',
      read: true,
      deliveryStatus: 'delivered',
      whatsappUrl: `https://wa.me/919876543210?text=CareQueue%20Alert`,
    };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-brand-700 via-brand-800 to-primary-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <MessageSquare className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight">SMS & WhatsApp Alerts</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  Live Active
                </span>
              </div>
              <p className="text-xs text-brand-100/80">
                Automated 3-positions-away queue proximity & call alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => playAlertChime()}
              className="p-1.5 text-brand-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Test Sound Chime"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-brand-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center border-b border-slate-100 bg-slate-50/80 px-6 py-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'inbox'
                ? 'bg-white text-brand-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts Log ({notifications.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'preview'
                ? 'bg-white text-brand-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Device Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'preferences'
                ? 'bg-white text-brand-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Channels & Settings</span>
          </button>
        </div>

        {/* TAB 1: INBOX / LOG */}
        {activeTab === 'inbox' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Quick Dispatch Simulator Bar */}
            <div className="p-4 bg-amber-50/70 border-b border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-900 font-medium">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Simulate automated OPD queue alert:</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  disabled={testSending}
                  onClick={() => handleSimulateAlert('booking_confirmed')}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition-colors flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Token Confirmed</span>
                </button>
                <button
                  disabled={testSending}
                  onClick={() => handleSimulateAlert('three_away')}
                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs transition-colors flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>3 Ahead</span>
                </button>
                <button
                  disabled={testSending}
                  onClick={() => handleSimulateAlert('called')}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition-colors flex items-center gap-1"
                >
                  <Bell className="w-3 h-3" />
                  <span>Called</span>
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-700 text-sm">No alerts dispatched yet</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                    Book an appointment or simulate a queue advance to receive instant SMS and WhatsApp notifications.
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    <button
                      onClick={() => handleSimulateAlert('three_away')}
                      className="px-3 py-1.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-lg text-xs font-semibold hover:bg-brand-100"
                    >
                      Trigger 3-Positions-Away Demo
                    </button>
                  </div>
                </div>
              ) : (
                notifications.map(item => {
                  const isWhatsApp = item.channel === 'whatsapp';
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedNotification(item);
                        setActiveTab('preview');
                        setPreviewChannel(item.channel);
                      }}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-brand-300 hover:shadow-xs transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isWhatsApp
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-sky-100 text-sky-800 border border-sky-200'
                            }`}
                          >
                            {isWhatsApp ? 'WhatsApp' : 'SMS Alert'}
                          </span>
                          <span className="text-xs font-bold text-slate-800">{item.title}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 font-mono whitespace-pre-line bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {item.message}
                      </p>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Delivered to {item.recipientPhone}</span>
                        </div>

                        {isWhatsApp && item.whatsappUrl && (
                          <a
                            href={item.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center gap-1"
                          >
                            <span>Open WhatsApp</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Clear All Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">
                  Showing {notifications.length} delivered message(s)
                </span>
                <button
                  onClick={handleClearAll}
                  className="px-2.5 py-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear History</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MOBILE DEVICE SIMULATOR */}
        {activeTab === 'preview' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex flex-col items-center justify-start">
            {/* Channel switch toggle */}
            <div className="flex items-center bg-white p-1 rounded-xl shadow-xs border border-slate-200 mb-6">
              <button
                onClick={() => setPreviewChannel('whatsapp')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  previewChannel === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Format</span>
              </button>
              <button
                onClick={() => setPreviewChannel('sms')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  previewChannel === 'sms'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>SMS Text Message</span>
              </button>
            </div>

            {/* Simulated Smartphone Screen */}
            <div className="w-[320px] sm:w-[360px] bg-slate-900 rounded-[38px] p-3 shadow-2xl border-4 border-slate-700 ring-1 ring-slate-900/10">
              {/* Phone Speaker & Camera Notch */}
              <div className="h-4 flex items-center justify-center gap-2 mb-1">
                <div className="w-12 h-1 bg-slate-700 rounded-full" />
                <div className="w-2.5 h-2.5 bg-slate-700 rounded-full" />
              </div>

              {/* Inside Screen */}
              <div className="bg-slate-50 rounded-[28px] overflow-hidden flex flex-col h-[510px] text-xs">
                {/* Top Status Bar */}
                <div className="bg-slate-900 text-white px-5 py-1 text-[10px] flex justify-between items-center font-mono">
                  <span>9:41</span>
                  <div className="flex items-center gap-1.5">
                    <span>5G</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* WhatsApp Theme App Header */}
                {previewChannel === 'whatsapp' ? (
                  <div className="bg-emerald-700 text-white px-4 py-3 flex items-center gap-3 shadow-xs">
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                      CQ
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm leading-tight">CareQueue Hospital OPD</div>
                      <div className="text-[10px] text-emerald-200">Verified Business Account</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 text-center text-slate-800">
                    <div className="font-bold text-xs">CareQueue-OPD</div>
                    <div className="text-[10px] text-slate-400">SMS Gateway: Verified</div>
                  </div>
                )}

                {/* Message Bubble Thread */}
                <div
                  className={`flex-1 p-3 overflow-y-auto space-y-3 ${
                    previewChannel === 'whatsapp' ? 'bg-[#efeae2]' : 'bg-slate-50'
                  }`}
                >
                  <div className="text-center">
                    <span className="bg-white/80 backdrop-blur-xs text-slate-500 text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-2xs">
                      Today &bull; OPD Queue Updates
                    </span>
                  </div>

                  {/* Incoming Chat Bubble */}
                  <div className="flex flex-col items-start max-w-[92%]">
                    <div
                      className={`p-3 rounded-2xl shadow-xs text-xs whitespace-pre-line leading-relaxed ${
                        previewChannel === 'whatsapp'
                          ? 'bg-white text-slate-800 rounded-tl-xs border border-emerald-100'
                          : 'bg-white text-slate-800 rounded-bl-xs border border-slate-200'
                      }`}
                    >
                      {currentPreview.message}

                      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-slate-400">
                        <span>
                          {new Date(currentPreview.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {previewChannel === 'whatsapp' && (
                          <CheckCheck className="w-3.5 h-3.5 text-sky-500 inline" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Input Bar */}
                <div className="bg-white p-2 border-t border-slate-200 flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 rounded-full px-3 py-1.5 text-slate-400 text-[11px]">
                    Message CareQueue OPD...
                  </div>
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <Send className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick action: Open in real SMS app & WhatsApp */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {currentPreview.smsUrl && (
                <a
                  href={currentPreview.smsUrl}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Open in SMS App</span>
                </a>
              )}
              {currentPreview.whatsappUrl && (
                <a
                  href={currentPreview.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CHANNELS & PREFERENCES */}
        {activeTab === 'preferences' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Alert Delivery Preferences</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize how and when Bharathiar Hospital sends automated queue alerts to your smartphone.
              </p>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-5">
              {/* Phone number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Recipient Registered Mobile Phone Number
                </label>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={prefs.phoneNumber}
                    onChange={e => setPrefs({ ...prefs, phoneNumber: e.target.value })}
                    placeholder="9876543210"
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 font-mono font-bold"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Used for automated SMS confirmation, proximity notices, and WhatsApp alerts.
                </p>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div>
                    <div className="text-xs font-bold text-slate-800">SMS Notifications</div>
                    <div className="text-[11px] text-slate-500">
                      Receive text alerts when booked, 3 patients ahead, and when called.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.smsEnabled}
                    onChange={e => setPrefs({ ...prefs, smsEnabled: e.target.checked })}
                    className="w-4 h-4 text-brand-600 rounded-sm focus:ring-brand-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div>
                    <div className="text-xs font-bold text-slate-800">WhatsApp Alerts</div>
                    <div className="text-[11px] text-slate-500">
                      Receive rich WhatsApp messages with OPD queue pass & directions.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.whatsappEnabled}
                    onChange={e => setPrefs({ ...prefs, whatsappEnabled: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Proximity Threshold */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Proximity Alert Trigger</span>
                  <span className="text-xs font-extrabold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                    {prefs.leadAlertThreshold} Patients Ahead
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  CareQueue automatically notifies you when exactly 3 patients are waiting ahead of your token.
                </p>
              </div>

              {/* Submit button */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  Save Alert Settings
                </button>
                {prefsSaved && (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Saved!
                  </span>
                )}
              </div>
            </form>

            {/* REAL SMS GATEWAY INTEGRATION SECTION */}
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-sky-600" />
                    SMS Gateway Settings
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Configure Fast2SMS or Twilio API keys to deliver cellular SMS to Indian / global numbers.
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  gatewayConfig.fast2SmsApiKey
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-sky-50 text-sky-700 border border-sky-200'
                }`}>
                  {gatewayConfig.fast2SmsApiKey ? 'Fast2SMS Active' : 'Native & Webhook Mode'}
                </span>
              </div>

              <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fast2SMS API Key (India SMS Gateway)
                  </label>
                  <input
                    type="password"
                    value={gatewayConfig.fast2SmsApiKey || ''}
                    onChange={e => setGatewayConfig({ ...gatewayConfig, fast2SmsApiKey: e.target.value })}
                    placeholder="Enter Fast2SMS Authorization Key..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Optional. Get free developer credits at{' '}
                    <a href="https://www.fast2sms.com" target="_blank" rel="noreferrer" className="text-brand-600 underline">
                      fast2sms.com
                    </a>
                    . If empty, uses direct device SMS & live handset simulation.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sender ID / Header
                  </label>
                  <input
                    type="text"
                    value={gatewayConfig.senderId || ''}
                    onChange={e => setGatewayConfig({ ...gatewayConfig, senderId: e.target.value })}
                    placeholder="BRHOSP"
                    maxLength={6}
                    className="w-full sm:w-48 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      smsService.saveConfig(gatewayConfig);
                      setGatewaySaved(true);
                      setTimeout(() => setGatewaySaved(false), 2500);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                  >
                    Save SMS Gateway
                  </button>

                  <button
                    type="button"
                    disabled={testSending}
                    onClick={async () => {
                      setTestSending(true);
                      try {
                        const { international } = normalizePhoneNumber(prefs.phoneNumber);
                        await smsService.sendSms({
                          toPhone: prefs.phoneNumber,
                          patientName: user?.full_name || 'Patient',
                          tokenNumber: 1,
                          doctorName: 'OPD Specialist',
                          departmentName: 'General OPD',
                          type: 'token_confirmation',
                          appointmentDate: 'Today',
                          appointmentTime: '10:00 AM',
                        });
                        alert(`Test SMS dispatched to ${international}!`);
                        loadNotifications();
                      } finally {
                        setTestSending(false);
                      }
                    }}
                    className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    Send Test SMS to +91 {prefs.phoneNumber}
                  </button>

                  {gatewaySaved && (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Saved!
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

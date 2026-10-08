import React, { useState, useEffect } from 'react';
import { MessageSquare, Bell, X, ExternalLink, ArrowRight, Smartphone } from 'lucide-react';
import { AlertNotification } from '../../services/notificationService';

interface AlertBannerToastProps {
  onOpenDrawer: () => void;
}

export const AlertBannerToast: React.FC<AlertBannerToastProps> = ({ onOpenDrawer }) => {
  const [activeAlert, setActiveAlert] = useState<AlertNotification | null>(null);

  useEffect(() => {
    const handleNewAlert = (e: any) => {
      const { sms, whatsapp, type } = e.detail || {};
      // Prioritize whatsapp alert for display if available, else sms
      const alertToShow = whatsapp || sms;
      if (alertToShow) {
        setActiveAlert(alertToShow);
      }
    };

    window.addEventListener('carequeue_new_alert', handleNewAlert);
    return () => window.removeEventListener('carequeue_new_alert', handleNewAlert);
  }, []);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!activeAlert) return;
    const timer = setTimeout(() => {
      setActiveAlert(null);
    }, 8500);
    return () => clearTimeout(timer);
  }, [activeAlert]);

  if (!activeAlert) return null;

  const isWhatsApp = activeAlert.channel === 'whatsapp';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-5 duration-300 ring-4 ring-black/5">
      {/* Top accent line */}
      <div
        className={`h-1.5 w-full ${
          isWhatsApp
            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
            : 'bg-gradient-to-r from-brand-600 to-sky-500'
        }`}
      />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                isWhatsApp
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-brand-100 text-brand-700 border border-brand-200'
              }`}
            >
              {isWhatsApp ? <MessageSquare className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    isWhatsApp
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-sky-50 text-sky-700 border border-sky-200'
                  }`}
                >
                  {isWhatsApp ? 'WhatsApp Alert' : 'SMS Alert'}
                </span>
                <span className="text-[11px] text-slate-400">Just now</span>
              </div>
              <h4 className="font-bold text-xs text-slate-800 mt-0.5 line-clamp-1">
                {activeAlert.title}
              </h4>
            </div>
          </div>

          <button
            onClick={() => setActiveAlert(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
            <span>📱 Sent to:</span>
            <strong className="font-mono">{activeAlert.recipientPhone}</strong>
          </span>
          <span className="text-slate-400">Token #{activeAlert.tokenNumber}</span>
        </div>

        <p className="text-xs text-slate-700 mt-2 line-clamp-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">
          {activeAlert.message}
        </p>

        <div className="mt-3 flex items-center gap-2 pt-1">
          {activeAlert.smsUrl && (
            <a
              href={activeAlert.smsUrl}
              className="flex-1 py-1.5 px-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors"
              title="Open in native Messages app"
            >
              <Smartphone className="w-3 h-3" />
              <span>SMS App</span>
            </a>
          )}

          {activeAlert.whatsappUrl && (
            <a
              href={activeAlert.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span>WhatsApp</span>
            </a>
          )}

          <button
            onClick={() => {
              setActiveAlert(null);
              onOpenDrawer();
            }}
            className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
          >
            <span>Details</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

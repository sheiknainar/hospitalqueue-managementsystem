import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  Loader2,
  Key,
  ExternalLink,
  ShieldAlert,
  Calendar,
  Layers,
  History,
  Clock,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { APP_CONFIG } from '../../config/appConfig';
import { hospitalService } from '../../services/hospitalService';
import { queueService } from '../../services/queueService';
import {
  chatWithHospitalAssistant,
  ChatMessage,
  HospitalAssistantContext,
  HOSPITAL_DEPT_LOCATIONS,
  isGeminiConfigured,
  getGeminiApiKey,
  setGeminiApiKey,
} from '../../services/aiService';

export const AIAssistantWidget: React.FC = () => {
  const { user, role, patientRecord } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getGeminiApiKey());
  const [isConfigured, setIsConfigured] = useState(isGeminiConfigured());

  // Comprehensive patient context
  const [contextData, setContextData] = useState<HospitalAssistantContext>({
    hospitalName: APP_CONFIG.hospitalName,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Initialize welcome message when user changes or modal opens
  useEffect(() => {
    const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'there';
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: `Hello ${firstName}! 👋 I am **CareQueue AI**, your digital hospital assistant for **${APP_CONFIG.hospitalName}**.\n\nI am here to help you navigate appointments, track your live queue token, check estimated consultation times, and find hospital departments.\n\n*Note: I am a hospital website assistant and do not provide medical advice or prescriptions.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: [
          { label: '🎫 What is my token?', action: 'Where can I see my token?' },
          { label: '👥 How many ahead?', action: 'How many patients are ahead of me?' },
          { label: '⏱️ Estimated wait time?', action: 'Where can I see my estimated consultation time?' },
          { label: '📅 How to book appointment?', action: 'How do I book an appointment?' },
          { label: '📍 Where is my department?', action: 'Where is my appointment department?' },
          { label: '📜 Appointment history', action: 'Where can I see my previous appointments?' },
        ],
      },
    ]);
  }, [user?.full_name]);

  // Load real patient application data from database/storage
  const refreshContext = async () => {
    try {
      let pt = patientRecord;
      if (!pt && user && role === 'patient') {
        pt = await hospitalService.getPatientByProfileId(user.id);
      }

      const today = new Date().toISOString().split('T')[0];
      const newCtx: HospitalAssistantContext = {
        hospitalName: APP_CONFIG.hospitalName,
        patientName: user?.full_name || undefined,
      };

      // 1. Fetch available departments and doctors
      try {
        const [depts, docs] = await Promise.all([
          hospitalService.getDepartments(),
          hospitalService.getDoctors(),
        ]);
        newCtx.departments = depts.map(d => ({
          name: d.name,
          description: d.description,
          location: HOSPITAL_DEPT_LOCATIONS[d.name.toLowerCase()] || 'Consultation Block',
        }));
        newCtx.doctors = docs.map(doc => ({
          name: doc.profile?.full_name || 'Dr. Specialist',
          specialization: doc.specialization,
          departmentName: doc.department?.name,
          availability: doc.availability,
        }));
      } catch (err) {
        console.warn('Could not fetch departments for AI context', err);
      }

      // 2. Fetch patient's active queue token and appointments
      if (pt) {
        const [activeQ, appts] = await Promise.all([
          queueService.getPatientActiveQueue(pt.id, today),
          hospitalService.getAppointments({ patientId: pt.id }),
        ]);

        newCtx.totalPastAppointments = appts.length;

        // Today's active queue status
        if (activeQ) {
          const docQueue = await queueService.getDoctorQueue(activeQ.doctor_id, today);
          const currentEntry = docQueue.find(
            e => e.status === 'in_progress' || e.status === 'called'
          );
          const ahead = docQueue.filter(
            e => e.status === 'waiting' && e.token_number < activeQ.token_number
          ).length;

          newCtx.currentTokenNumber = activeQ.token_number;
          newCtx.currentServingToken = currentEntry ? currentEntry.token_number : null;
          newCtx.patientsAhead = ahead;
          newCtx.estimatedWaitMinutes = ahead * 12;
          newCtx.doctorName = activeQ.doctor?.profile?.full_name;
          newCtx.doctorSpecialization = activeQ.doctor?.specialization;
          newCtx.departmentName = activeQ.doctor?.department?.name;
          newCtx.appointmentDate = activeQ.queue_date;
          newCtx.appointmentStatus = activeQ.status;

          if (activeQ.doctor?.department?.name) {
            newCtx.departmentLocation =
              HOSPITAL_DEPT_LOCATIONS[activeQ.doctor.department.name.toLowerCase()] ||
              'Main Outpatient Block';
          }
        } else if (appts.length > 0) {
          // Check upcoming booked appointment
          const upcoming = appts.find(a => a.status === 'booked');
          if (upcoming) {
            newCtx.appointmentDate = upcoming.appointment_date;
            newCtx.appointmentTime = upcoming.appointment_time;
            newCtx.appointmentStatus = upcoming.status;
            newCtx.doctorName = upcoming.doctor?.profile?.full_name;
            newCtx.doctorSpecialization = upcoming.doctor?.specialization;
            newCtx.departmentName = upcoming.doctor?.department?.name;
          }
        }
      }

      setContextData(newCtx);
    } catch (err) {
      console.error('Error fetching AI context', err);
    }
  };

  useEffect(() => {
    refreshContext();
  }, [user, role, patientRecord, isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    try {
      const responseText = await chatWithHospitalAssistant(text.trim(), messages, contextData);

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: 'assistant',
          text: 'I am here to help you navigate Bharathiar Hospital services. Please feel free to ask again or check our Central Reception Desk.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSaveKey = () => {
    setGeminiApiKey(apiKeyInput);
    setIsConfigured(isGeminiConfigured());
    setShowConfig(false);
  };

  // Quick chips shown above input
  const QUICK_QUESTIONS = [
    { label: '🎫 My Token', action: 'Where can I see my token?' },
    { label: '👥 Patients Ahead', action: 'How many patients are ahead of me?' },
    { label: '⏱️ Estimated Wait', action: 'Where can I see my estimated consultation time?' },
    { label: '📅 Book Appointment', action: 'How do I book an appointment?' },
    { label: '📍 Department Info', action: 'Where is my appointment department?' },
    { label: '📜 Visit History', action: 'Where can I see my previous appointments?' },
    { label: '🚗 "On my way" meaning', action: "What does 'I'm on my way' mean?" },
    { label: '📋 Medical Reports', action: 'Where can I see my medical report?' },
  ];

  return (
    <>
      {/* FLOATING ACTION BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-xl hover:shadow-brand-500/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-white/20"
          aria-label="Open AI Hospital Assistant"
        >
          <div className="relative flex items-center justify-center">
            <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-brand-600" />
          </div>
          <span className="font-bold text-xs sm:text-sm tracking-wide">
            AI Hospital Assistant
          </span>
        </button>
      )}

      {/* CHAT MODAL POPUP */}
      {isOpen && (
        <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-50 w-[95vw] sm:w-[420px] h-[610px] max-h-[88vh] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-scaleIn">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-indigo-950 text-white p-4 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-brand-500 to-indigo-500 flex items-center justify-center text-white shadow-xs">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-sm leading-tight">AI Hospital Assistant</h4>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[10px] text-slate-300">
                  {contextData.hospitalName} • System Navigation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Configure Gemini API Key"
              >
                <Key className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Close Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* API KEY CONFIG ACCORDION */}
          {showConfig && (
            <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs space-y-2 animate-fadeIn shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-brand-600" />
                  Gemini API Key
                </span>
                <span className="text-[10px] text-brand-600 font-semibold">
                  {isConfigured ? '✓ Connected' : 'Default Local Engine'}
                </span>
              </div>
              <input
                type="password"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder="Paste Gemini API Key..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-brand-500"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-200 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveKey}
                  className="px-3 py-1 text-[11px] font-bold text-white bg-brand-600 hover:bg-brand-700 rounded shadow-xs cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE QUEUE STATUS BAR (IF PATIENT HAS ACTIVE TOKEN TODAY) */}
          {contextData.currentTokenNumber ? (
            <div className="px-3.5 py-2 bg-gradient-to-r from-brand-50 via-indigo-50 to-slate-50 border-b border-brand-100 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-medium text-[11px]">Today's Token:</span>
                <span className="px-2 py-0.5 rounded-md bg-brand-600 text-white font-black text-xs shadow-2xs">
                  #{contextData.currentTokenNumber}
                </span>
                <span className="text-slate-500 text-[11px] hidden sm:inline">
                  • {contextData.doctorName || 'Doctor'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-brand-700">
                <span>{contextData.patientsAhead ?? 0} ahead</span>
                {contextData.estimatedWaitMinutes !== undefined && (
                  <span className="text-slate-400 font-normal">
                    (~{contextData.estimatedWaitMinutes}m)
                  </span>
                )}
              </div>
            </div>
          ) : null}

          {/* CHAT MESSAGES BODY */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-brand-600 to-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-2xs ${
                    msg.sender === 'user'
                      ? 'bg-brand-600 text-white rounded-tr-none'
                      : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.text}</div>

                  {/* Contextual Action Buttons in response */}
                  {msg.sender === 'assistant' && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {msg.text.includes('/patient/book') && (
                        <button
                          type="button"
                          onClick={() => {
                            navigate('/patient/book');
                            if (window.innerWidth < 640) setIsOpen(false);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 transition-colors cursor-pointer"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>Book Appointment</span>
                        </button>
                      )}
                      {msg.text.includes('/patient/history') && (
                        <button
                          type="button"
                          onClick={() => {
                            navigate('/patient/history');
                            if (window.innerWidth < 640) setIsOpen(false);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                        >
                          <History className="w-3 h-3" />
                          <span>View History</span>
                        </button>
                      )}
                      {msg.text.includes('My Dashboard') && (
                        <button
                          type="button"
                          onClick={() => {
                            navigate('/patient');
                            if (window.innerWidth < 640) setIsOpen(false);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                        >
                          <Layers className="w-3 h-3" />
                          <span>Open Dashboard</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Suggested Quick Actions inside Welcome */}
                  {msg.suggestedActions && (
                    <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {msg.suggestedActions.map((action, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSendMessage(action.action)}
                          className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-slate-50 hover:bg-brand-50 hover:text-brand-700 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <span
                    className={`block text-[9px] mt-1.5 text-right ${
                      msg.sender === 'user' ? 'text-brand-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2.5 items-center text-slate-500 text-xs">
                <div className="w-7 h-7 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white border border-slate-200 px-3 py-2 rounded-2xl text-[11px] text-slate-500 flex items-center gap-1.5 shadow-2xs">
                  <span>Assistant is typing</span>
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 bg-brand-500 rounded-full animate-bounce" />
                    <span
                      className="w-1 h-1 bg-brand-500 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                    <span
                      className="w-1 h-1 bg-brand-500 rounded-full animate-bounce"
                      style={{ animationDelay: '0.4s' }}
                    />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* QUICK PROMPT CHIPS */}
          <div className="p-2 bg-white border-t border-slate-100 overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-thin shrink-0">
            {QUICK_QUESTIONS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip.action)}
                className="text-[11px] font-medium px-2.5 py-1 bg-slate-50 hover:bg-brand-50 hover:text-brand-700 text-slate-600 rounded-full border border-slate-200/80 transition-colors shrink-0 cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* INPUT FORM */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Ask about your token, queue, doctors, booking..."
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={isTyping || !inputText.trim()}
              className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 transition-colors shadow-xs cursor-pointer"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* SAFETY DISCLAIMER FOOTER */}
          <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-200/80 text-[10px] text-slate-500 flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-500 shrink-0" />
              <span>Hospital System Assistant • No Medical Advice</span>
            </span>
            <span className="font-semibold text-rose-600">Emergency: Dial 108</span>
          </div>
        </div>
      )}
    </>
  );
};

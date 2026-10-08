import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  Building2,
  HelpCircle,
  ChevronRight,
  Loader2,
  ShieldAlert,
  Flame,
  Key,
  Info,
} from 'lucide-react';
import { Department, Doctor } from '../../types/database';
import {
  analyzeSymptomsWithAI,
  SymptomAnalysisResult,
  isGeminiConfigured,
  getGeminiApiKey,
  setGeminiApiKey,
} from '../../services/aiService';

interface AISymptomCheckerProps {
  departments: Department[];
  doctors: Doctor[];
  onApplyRecommendation: (rec: {
    departmentId?: string;
    doctorId?: string;
    chiefComplaint?: string;
  }) => void;
}

const SAMPLE_SYMPTOMS = [
  { label: 'Chest Tightness', text: 'Persistent heavy chest pressure with shortness of breath' },
  { label: 'Severe Joint Pain', text: 'Sharp knee pain and swelling after twisting leg while walking' },
  { label: 'Fever & Cough', text: 'High fever 101°F with dry cough, chills and body weakness for 2 days' },
  { label: 'Migraine Headache', text: 'Throbbing one-sided headache with nausea and light sensitivity' },
  { label: 'Abdominal Cramps', text: 'Severe stomach ache with acidity, nausea, and indigestion' },
  { label: 'Skin Rash & Itch', text: 'Red itchy rash spreading across forearms and neck' },
  { label: 'Eye Irritation', text: 'Red watery eye with blurry vision and gritty burning sensation' },
];

export const AISymptomChecker: React.FC<AISymptomCheckerProps> = ({
  departments,
  doctors,
  onApplyRecommendation,
}) => {
  const [symptoms, setSymptoms] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SymptomAnalysisResult | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getGeminiApiKey());
  const [isCustomKeySet, setIsCustomKeySet] = useState(isGeminiConfigured());

  const handleAnalyze = async () => {
    if (!symptoms.trim()) return;
    setIsAnalyzing(true);
    setHasApplied(false);
    try {
      const res = await analyzeSymptomsWithAI(symptoms, departments, doctors);
      setResult(res);
    } catch (err) {
      console.error('Failed to analyze symptoms', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApplyRecommendation({
      departmentId: result.recommendedDepartmentId,
      doctorId: result.recommendedDoctorId,
      chiefComplaint: result.chiefComplaint,
    });
    setHasApplied(true);
  };

  const handleSaveApiKey = () => {
    setGeminiApiKey(apiKeyInput);
    setIsCustomKeySet(isGeminiConfigured());
    setShowKeyModal(false);
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-200',
          label: 'Immediate Emergency Care Needed',
          icon: ShieldAlert,
        };
      case 'urgent':
      case 'priority':
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-200',
          label: 'Priority Consultation Recommended',
          icon: Flame,
        };
      default:
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          label: 'Standard OPD Consultation',
          icon: CheckCircle2,
        };
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50/80 via-white to-brand-50/50 rounded-3xl border border-indigo-100 p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800">
                AI Smart Triage & Doctor Recommender
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 tracking-wide">
                AI Powered
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Not sure which doctor to book? Describe how you feel and AI will match you with the right specialist.
            </p>
          </div>
        </div>

        {/* Gemini API Key status / config trigger */}
        <button
          type="button"
          onClick={() => setShowKeyModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-2xs transition-all self-start sm:self-auto"
          title="Configure Google Gemini API Key"
        >
          <Key className="w-3.5 h-3.5 text-brand-600" />
          <span>{isCustomKeySet ? 'Gemini AI Active' : 'Configure Gemini'}</span>
          <span
            className={`w-2 h-2 rounded-full ${
              isCustomKeySet ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
            }`}
          />
        </button>
      </div>

      {/* Input area */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Describe Your Symptoms or Medical Concern
        </label>
        <div className="relative">
          <textarea
            rows={3}
            value={symptoms}
            onChange={e => setSymptoms(e.target.value)}
            placeholder="e.g. I have had a severe throbbing headache since this morning accompanied by mild nausea and dizziness..."
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none shadow-2xs"
          />
        </div>

        {/* Quick Sample Pills */}
        <div>
          <span className="text-[11px] text-slate-400 font-medium mr-2">Try quick examples:</span>
          <div className="inline-flex flex-wrap gap-1.5 mt-1.5">
            {SAMPLE_SYMPTOMS.map((sample, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => setSymptoms(sample.text)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-brand-400 hover:text-brand-600 text-slate-600 transition-all shadow-2xs"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !symptoms.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 transition-all cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>AI Clinical Analysis in progress...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Analyze Symptoms with AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI RESULT DISPLAY CARD */}
      {result && (
        <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-xs space-y-4 animate-fadeIn">
          {/* Emergency alert banner if red flag */}
          {result.isEmergency && result.emergencyWarning && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">CRITICAL HEALTH ALERT</strong>
                <span>{result.emergencyWarning}</span>
              </div>
            </div>
          )}

          {/* Triage Urgency & Confidence */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            {(() => {
              const badge = getUrgencyBadge(result.urgency);
              const BadgeIcon = badge.icon;
              return (
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}
                >
                  <BadgeIcon className="w-3.5 h-3.5" />
                  <span>{badge.label}</span>
                </div>
              );
            })()}

            <div className="text-xs text-slate-500 flex items-center gap-1">
              <span>Match Confidence:</span>
              <span className="font-bold text-slate-800">{result.confidence}%</span>
            </div>
          </div>

          {/* Department and Doctor Match Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Recommended Department
              </span>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-600" />
                <span className="text-sm font-bold text-slate-800">
                  {result.recommendedDepartmentName}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Suggested Specialist
              </span>
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-bold text-slate-800">
                  {result.recommendedDoctorName || 'Available Doctor in Department'}
                </span>
              </div>
            </div>
          </div>

          {/* Medical Clinical Summary */}
          <div className="p-3.5 rounded-xl bg-brand-50/40 border border-brand-100 text-xs text-slate-700 leading-relaxed">
            <strong className="block font-bold text-brand-800 mb-0.5">
              AI Clinical Assessment
            </strong>
            {result.summary}
          </div>

          {/* Home Care & Questions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {result.possibleCauses && result.possibleCauses.length > 0 && (
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-700 block mb-1.5">
                  Possible Considerations:
                </span>
                <ul className="space-y-1 text-slate-600">
                  {result.possibleCauses.slice(0, 3).map((cause, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-brand-500 font-bold">•</span>
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.questionsForDoctor && result.questionsForDoctor.length > 0 && (
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-700 block mb-1.5">
                  Questions to Ask Your Doctor:
                </span>
                <ul className="space-y-1 text-slate-600">
                  {result.questionsForDoctor.slice(0, 3).map((q, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Apply Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Ready to proceed with this specialist?
            </span>
            <button
              type="button"
              onClick={handleApply}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                hasApplied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-brand-600 hover:bg-brand-700 text-white'
              }`}
            >
              {hasApplied ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Recommendation Applied to Steps Below!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Apply Recommendation to Steps 1 & 2</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* GEMINI CONFIG MODAL */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Google Gemini AI Settings</h4>
                <p className="text-xs text-slate-500">
                  Power your hospital queue with Google Gemini models.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Gemini API Key
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-500">
                You can obtain a free API key at{' '}
                <a
                  href="https://aistudio.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-600 font-semibold underline"
                >
                  Google AI Studio
                </a>
                . When no key is entered, the app seamlessly uses its built-in medical clinical engine.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs transition-colors"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

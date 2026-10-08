import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ShieldCheck,
  ExternalLink,
  Inbox,
} from 'lucide-react';
import {
  sendEmailVerificationCode,
  verifyEmailCode,
} from '../../services/emailVerificationService';

interface EmailVerificationModalProps {
  isOpen: boolean;
  email: string;
  roleName?: string;
  onClose: () => void;
  onVerified: (email: string) => void;
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  isOpen,
  email,
  roleName = 'User',
  onClose,
  onVerified,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(60);
  const [statusNotice, setStatusNotice] = useState<string>('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen && email) {
      setDigits(['', '', '', '', '', '']);
      setErrorMessage('');
      setIsSuccess(false);
      sendOtp();
    }
  }, [isOpen, email]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isOpen && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  const sendOtp = async () => {
    setIsSending(true);
    setErrorMessage('');
    try {
      const res = await sendEmailVerificationCode(email);
      if (res.success) {
        setStatusNotice(res.message);
        setCountdown(60);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 150);
      } else {
        setErrorMessage(res.message || 'Failed to dispatch verification code to your Gmail.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with email dispatch service.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    const digitChar = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digitChar;
    setDigits(newDigits);
    setErrorMessage('');

    if (index < 5 && digitChar) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 5 && digitChar) {
      const fullCode = newDigits.join('');
      if (fullCode.length === 6) {
        handleVerifyCode(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (pastedData.length >= 6) {
      const codeDigits = pastedData.slice(0, 6).split('');
      setDigits(codeDigits);
      inputRefs.current[5]?.focus();
      handleVerifyCode(pastedData.slice(0, 6));
    }
  };

  const handleVerifyCode = async (fullCode?: string) => {
    const codeToVerify = fullCode || digits.join('');
    if (codeToVerify.length !== 6) {
      setErrorMessage('Please enter all 6 digits of your verification code.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');

    try {
      const result = await verifyEmailCode(email, codeToVerify);
      setIsVerifying(false);

      if (result.success) {
        setIsSuccess(true);
        setTimeout(() => {
          onVerified(email);
        }, 1000);
      } else {
        setErrorMessage(
          result.error || 'Incorrect verification code. Please check your Gmail inbox and enter the 6 digits.'
        );
      }
    } catch (err: any) {
      setIsVerifying(false);
      setErrorMessage(err?.message || 'Verification failed. Please check the code in your Gmail.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden transform transition-all">
        {/* Brand Header Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-brand-600 via-primary-500 to-indigo-600" />

        <div className="p-6 sm:p-7">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>

          {isSuccess ? (
            <div className="py-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 ring-8 ring-emerald-50">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Email Verified Successfully!</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-xs">
                Welcome! Access granted for your <span className="font-semibold text-slate-700">{roleName}</span>.
              </p>
            </div>
          ) : (
            <div>
              {/* Header Icon & Title */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center shadow-xs text-brand-600">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">Check Your Gmail</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Code Sent
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Verify account authenticity for {roleName}
                  </p>
                </div>
              </div>

              {/* Instructions Box */}
              <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-200/80 space-y-2">
                <p className="text-xs text-slate-600 leading-relaxed">
                  A 6-digit confirmation code has been dispatched directly to your entered email address:
                </p>
                <div className="font-bold text-sm text-slate-900 break-all bg-white px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-brand-600 shrink-0" />
                  <span>{email}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Please open your Gmail inbox (or check Spam / Promotions folder) and enter the 6-digit code below.
                </p>
              </div>

              {/* Quick Link to Gmail */}
              <div className="mb-5 flex justify-center">
                <a
                  href="https://mail.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors shadow-2xs"
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>Open Gmail Inbox</span>
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                </a>
              </div>

              {/* 6 Digit Input Boxes */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
                  Enter 6-Digit Code Received in Gmail
                </label>
                <div className="flex justify-center items-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
                  {digits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (inputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      placeholder="•"
                      className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono rounded-xl border transition-all outline-hidden ${
                        digit
                          ? 'border-brand-500 bg-brand-50/30 text-brand-900 shadow-xs ring-2 ring-brand-100'
                          : 'border-slate-300 bg-white text-slate-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                onClick={() => handleVerifyCode()}
                disabled={isVerifying || isSending || digits.join('').length !== 6}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify Code & Continue</span>
                  </>
                )}
              </button>

              {/* Resend Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Didn't receive the email?</span>
                {countdown > 0 ? (
                  <span className="font-medium text-slate-400">Resend in {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={isSending}
                    className="font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSending ? 'animate-spin' : ''}`} />
                    <span>Resend Code to Gmail</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

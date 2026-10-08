import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  AlertCircle,
  Shield,
  Stethoscope,
  User,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/database';
import { APP_CONFIG } from '../../config/appConfig';
import { validateEmailAddress } from '../../services/emailVerificationService';
import { hospitalService } from '../../services/hospitalService';

export const LoginPage: React.FC = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const executeLogin = async (targetEmail: string, targetRole: UserRole) => {
    setIsSubmitting(true);
    try {
      const res = await login(targetEmail, targetRole, password);
      if (res.success) {
        if (targetRole === 'admin') {
          navigate('/admin');
        } else if (targetRole === 'doctor') {
          navigate('/doctor');
        } else {
          navigate('/patient');
        }
      } else {
        setErrorMessage(res.error || 'Failed to login. Please check your credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const emailCheck = validateEmailAddress(email);
    if (!emailCheck.isValid) {
      setErrorMessage(emailCheck.error || 'Please enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    const cleanEmail = emailCheck.formattedEmail;
    const allowedAdminEmail = APP_CONFIG.adminEmail.trim().toLowerCase();
    const enteredEmail = cleanEmail;
    const enteredPassword = password.trim();
    const expectedPassword = (APP_CONFIG.adminPassword || '').trim();

    // Prevent using Admin credentials on Patient or Doctor tabs
    if (selectedRole !== 'admin' && enteredEmail === allowedAdminEmail) {
      setErrorMessage("This email is reserved for the Hospital Administrator. Please select the 'Admin / Staff' role tab above.");
      return;
    }

    // 1. Strict validation for Admin Portal access
    if (selectedRole === 'admin') {
      const isAllowedAdmin = enteredEmail === allowedAdminEmail;
      const isAllowedPassword = enteredPassword === expectedPassword;

      if (!isAllowedAdmin || !isAllowedPassword) {
        setErrorMessage('Access Denied: Invalid Admin credentials. Please check your admin email and password in .env.');
        return;
      }

      await executeLogin(cleanEmail, 'admin');
      return;
    }

    // 2. Doctor Portal: Verify doctor profile exists
    if (selectedRole === 'doctor') {
      setIsSubmitting(true);
      try {
        const doctors = await hospitalService.getDoctors();
        const matchedDoc = doctors.find(
          d => d.profile?.email?.trim().toLowerCase() === enteredEmail
        );
        if (!matchedDoc) {
          setErrorMessage(
            `Access Denied: No doctor account found for "${cleanEmail}". Please ask the Hospital Admin to onboard your doctor profile first.`
          );
          setIsSubmitting(false);
          return;
        }
      } catch (err) {
        console.warn('Doctor verification error:', err);
      } finally {
        setIsSubmitting(false);
      }
    }

    // Direct login without OTP verification
    await executeLogin(cleanEmail, selectedRole);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 p-1 flex items-center justify-center text-white shadow-md overflow-hidden shrink-0">
              <img
                src="/hospital-logo.png"
                alt="Bharathiar Hospital"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-2xl font-black text-slate-800 tracking-tight">{APP_CONFIG.hospitalName}</span>
              <span className="block text-xs font-semibold text-brand-600 uppercase tracking-widest">
                {APP_CONFIG.systemName}
              </span>
            </div>
          </Link>
        </div>

        <h2 className="mt-6 text-center text-2xl font-extrabold text-slate-900">
          Sign In to Your Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Or{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            register as a new patient
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm rounded-2xl border border-slate-200">
          {/* Role selector tabs */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Select Your Access Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('patient');
                  setErrorMessage('');
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  selectedRole === 'patient'
                    ? 'border-brand-500 bg-brand-50/70 text-brand-700 font-bold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <User className="w-4 h-4 mb-1" />
                Patient
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('doctor');
                  setErrorMessage('');
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  selectedRole === 'doctor'
                    ? 'border-brand-500 bg-brand-50/70 text-brand-700 font-bold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Stethoscope className="w-4 h-4 mb-1" />
                Doctor
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('admin');
                  setErrorMessage('');
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  selectedRole === 'admin'
                    ? 'border-brand-500 bg-brand-50/70 text-brand-700 font-bold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Shield className="w-4 h-4 mb-1" />
                Admin
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={
                    selectedRole === 'admin'
                      ? 'admin@hospital.org'
                      : selectedRole === 'doctor'
                        ? 'doctor@hospital.org'
                        : 'patient@email.com'
                  }
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Password
              </label>
              <div className="mt-1 relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In as {selectedRole.toUpperCase()}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security note */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Secure role-based authentication with end-to-end medical portal encryption.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

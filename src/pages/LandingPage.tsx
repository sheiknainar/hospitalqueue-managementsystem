import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Calendar,
  Users,
  Clock,
  ShieldCheck,
  ChevronRight,
  Stethoscope,
  Building2,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  Layers,
} from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { AIAssistantWidget } from '../components/ai/AIAssistantWidget';

export const LandingPage: React.FC = () => {

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-0.5 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
              <img
                src="/hospital-logo.png"
                alt="Bharathiar Hospital"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-xl font-black text-slate-800 tracking-tight">{APP_CONFIG.hospitalName}</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                Hospital Portal
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#home" className="hover:text-brand-600 transition-colors">
              Home
            </a>
            <a href="#about" className="hover:text-brand-600 transition-colors">
              About
            </a>
            <a href="#services" className="hover:text-brand-600 transition-colors">
              Services
            </a>
            <a href="#contact" className="hover:text-brand-600 transition-colors">
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-700 hover:text-brand-600 px-3 py-2 rounded-lg transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-xl shadow-sm hover:shadow transition-all"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section id="home" className="relative pt-12 pb-20 md:py-24 bg-gradient-to-b from-brand-50/50 to-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100/80 text-brand-800 text-xs font-semibold uppercase tracking-wider mb-6 border border-brand-200">
              <Clock className="w-3.5 h-3.5" />
              Smart Sequential Queue System
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight md:leading-tight">
              Hospital Queue <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-primary-600">
                Management System
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Digitally manage appointments, departments, doctor schedules, and live token progression.
              Eliminate physical waiting lines with real-time patient queue tracking.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-md hover:shadow-lg transition-all"
              >
                <span>Get Started</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 rounded-xl text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-colors"
              >
                Sign In to Portal
              </Link>
            </div>

            {/* Quick Benefits Badges */}
            <div className="mt-12 pt-8 border-t border-slate-200/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="text-xs font-medium text-slate-700">Sequential Token Allocation</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="text-xs font-medium text-slate-700">Real-Time Queue Tracking</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="text-xs font-medium text-slate-700">Multi-Role Dashboards</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="text-xs font-medium text-slate-700">Zero Hardcoded Data</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section id="about" className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-2">About The System</h2>
            <h3 className="text-3xl font-bold text-slate-900">Modern Digital Healthcare Flow</h3>
            <p className="mt-3 text-slate-600">
              {APP_CONFIG.hospitalName} replaces crowded outpatient waiting rooms with an orderly digital token stream. Each doctor's daily OPD appointments generate sequential, unique tokens that patients can track from their phones or waiting area displays.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-brand-200 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-2">Patient Convenience</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Patients book appointments with their preferred doctor, receive a guaranteed sequential token number, and monitor real-time queue position with remaining patients ahead.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-brand-200 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mb-4">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-2">Doctor OPD Control</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Doctors manage their live patient stream with one-click Call Next, Start Consultation, Complete, or Skip actions, updating the central board instantly.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-brand-200 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-2">Hospital Administration</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Hospital admins and receptionists configure departments, onboard doctors, register walk-in patients, manage schedule allocations, and review real-time facility metrics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section id="services" className="py-16 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-2">Core Services</h2>
            <h3 className="text-3xl font-bold text-slate-900">Comprehensive Queue Management</h3>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <Calendar className="w-8 h-8 text-brand-600 mb-3" />
              <h4 className="font-bold text-slate-800 mb-1">Appointment Scheduling</h4>
              <p className="text-sm text-slate-600">Select department, choosing active doctor, and booking guaranteed OPD consultation time slots.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <Clock className="w-8 h-8 text-brand-600 mb-3" />
              <h4 className="font-bold text-slate-800 mb-1">Sequential Token Dispensing</h4>
              <p className="text-sm text-slate-600">Strictly ordered, non-repeating token generation per doctor per day (Token 1, Token 2, ...).</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <Layers className="w-8 h-8 text-brand-600 mb-3" />
              <h4 className="font-bold text-slate-800 mb-1">Live Queue Display</h4>
              <p className="text-sm text-slate-600">Real-time status updates informing patients of current token and estimated wait count.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <ShieldCheck className="w-8 h-8 text-brand-600 mb-3" />
              <h4 className="font-bold text-slate-800 mb-1">Role-Based Security</h4>
              <p className="text-sm text-slate-600">Individual access tiers for Administrative staff, Doctors, and Registered Patients.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <Activity className="w-8 h-8 text-brand-600 mb-3" />
              <h4 className="font-bold text-slate-800 mb-1">Live Realtime Sync</h4>
              <p className="text-sm text-slate-600">Instant websocket updates via Supabase Realtime when doctor calls next patient.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <Building2 className="w-8 h-8 text-brand-600 mb-3" />
              <h4 className="font-bold text-slate-800 mb-1">Department Routing</h4>
              <p className="text-sm text-slate-600">Organize queues across Cardiology, Pediatrics, General Medicine, Orthopedics, and more.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT & HOURS SECTION */}
      <section id="contact" className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-2">Hospital Information</h2>
              <h3 className="text-3xl font-bold text-slate-900 mb-4">{APP_CONFIG.hospitalName}</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Providing compassionate, modern outpatient services with zero unnecessary waiting room friction. Open for casualty admissions and OPD clinic schedules daily.
              </p>

              <div className="space-y-4 text-sm text-slate-700">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-brand-600 shrink-0" />
                  <span>{APP_CONFIG.address}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-brand-600 shrink-0" />
                  <span>{APP_CONFIG.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-brand-600 shrink-0" />
                  <span>{APP_CONFIG.email}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h4 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-600" />
                OPD Clinic Hours
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-200/60">
                  <span className="text-slate-600">Clinic Hours</span>
                  <span className="font-semibold text-slate-800">{APP_CONFIG.hours}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200/60">
                  <span className="text-slate-600">Casualty / Emergency</span>
                  <span className="font-semibold text-slate-800">{APP_CONFIG.emergency}</span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  to="/register"
                  className="block w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-center rounded-xl text-sm transition-colors"
                >
                  Book Appointment Online
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-white">
            <div className="w-8 h-8 rounded-lg bg-white p-0.5 flex items-center justify-center overflow-hidden shrink-0">
              <img
                src="/hospital-logo.png"
                alt="Bharathiar Hospital"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-sm tracking-tight">{APP_CONFIG.fullTitle}</span>
          </div>
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} {APP_CONFIG.hospitalName}. Built with React, TypeScript, Tailwind CSS, and Supabase.
          </p>
        </div>
      </footer>

      {/* Floating 24/7 AI Hospital Concierge */}
      <AIAssistantWidget />
    </div>
  );
};

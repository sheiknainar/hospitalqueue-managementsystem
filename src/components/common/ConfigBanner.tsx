import React, { useState } from 'react';
import { Database, ExternalLink, X, CheckCircle2 } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { Modal } from './Modal';

export const ConfigBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const configured = isSupabaseConfigured();

  if (configured || dismissed) return null;

  return (
    <>
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs md:text-sm text-amber-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Running in Local Storage Mode:</strong> Supabase credentials are not yet added to <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">.env</code>. The app is fully interactive locally with 0 records.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowModal(true)}
            className="underline font-medium hover:text-amber-900 text-xs flex items-center gap-1"
          >
            Setup Supabase
            <ExternalLink className="w-3 h-3" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-600 hover:text-amber-900"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Connect to Supabase PostgreSQL"
        maxWidth="lg"
      >
        <div className="space-y-4 text-sm text-slate-600">
          <p>
            To connect this application to live Supabase PostgreSQL and Realtime:
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              Create a free project at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-brand-600 underline font-medium">supabase.com</a>.
            </li>
            <li>
              Go to <strong>SQL Editor</strong> and execute the script from <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono">supabase_schema.sql</code> included in this project.
            </li>
            <li>
              Go to <strong>Project Settings &rarr; API</strong>, copy your Project URL and Anon Key.
            </li>
            <li>
              Paste them into the <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono">.env</code> file in your VS Code workspace:
              <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono mt-1 overflow-x-auto">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
              </pre>
            </li>
            <li>
              Restart Vite development server with <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono">npm run dev</code>.
            </li>
          </ol>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Local mode is currently preserving all operations and sequential tokens seamlessly.</span>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

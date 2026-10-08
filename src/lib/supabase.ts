import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('placeholder-project') &&
    !supabaseAnonKey.includes('placeholder-anon-key') &&
    (supabaseAnonKey.startsWith('eyJ') || supabaseAnonKey.startsWith('sb_publishable_') || supabaseAnonKey.length > 20) &&
    supabaseUrl.startsWith('https://')
  );
};

// Initialize Supabase client
// If not configured with real values, initialize with dummy values to prevent crashing
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

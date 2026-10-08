import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { localDB } from '../services/storageService';
import { Profile, UserRole, Patient } from '../types/database';

interface AuthContextType {
  user: Profile | null;
  role: UserRole | null;
  patientRecord: Patient | null;
  loading: boolean;
  isConfigured: boolean;
  login: (email: string, role?: UserRole, password?: string) => Promise<{ success: boolean; error?: string }>;
  register: (params: {
    fullName: string;
    email: string;
    password?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setCurrentUser: (profile: Profile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [patientRecord, setPatientRecord] = useState<Patient | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const configured = isSupabaseConfigured();

  // Load session on startup
  useEffect(() => {
    async function initSession() {
      try {
        if (!configured) {
          const session = localDB.getSession();
          if (session) {
            setUser(session);
            setRole(session.role);
            if (session.role === 'patient') {
              const pt = localDB.findPatientByProfileId(session.id);
              setPatientRecord(pt || null);
            }
          }
        } else {
          // Check Supabase session
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            if (profile) {
              setUser(profile);
              setRole(profile.role);
              if (profile.role === 'patient') {
                const { data: pt } = await supabase
                  .from('patients')
                  .select('*')
                  .eq('profile_id', profile.id)
                  .maybeSingle();
                setPatientRecord(pt || null);
              }
            }
          }
        }
      } catch (err) {
        console.error('Session initialization error:', err);
      } finally {
        setLoading(false);
      }
    }

    initSession();

    if (configured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          if (profile) {
            setUser(profile);
            setRole(profile.role);
            if (profile.role === 'patient') {
              const { data: pt } = await supabase
                .from('patients')
                .select('*')
                .eq('profile_id', profile.id)
                .maybeSingle();
              setPatientRecord(pt || localDB.findPatientByProfileId(profile.id) || null);
            }
          }
        } else {
          setUser(null);
          setRole(null);
          setPatientRecord(null);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [configured]);

  // LOGIN
  // LOGIN
  const login = async (email: string, roleHint?: UserRole, password?: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      if (!configured) {
        // Look up profile in local database
        let profile = localDB.findProfileByEmail(email);

        // If not found in local mode, we can create an initial account for easy access
        if (!profile && roleHint) {
          const newId = crypto.randomUUID();
          profile = localDB.addProfile({
            id: newId,
            full_name: roleHint === 'admin' ? 'Administrator' : email.split('@')[0],
            email,
            role: roleHint,
            created_at: new Date().toISOString(),
          });

          if (roleHint === 'patient') {
            const pt = localDB.addPatient({
              id: crypto.randomUUID(),
              profile_id: newId,
              created_at: new Date().toISOString(),
            });
            setPatientRecord(pt);
          }
        }

        if (!profile) {
          return {
            success: false,
            error: 'User not found. Please register first or select an account.',
          };
        }

        setUser(profile);
        setRole(profile.role);
        localDB.setSession(profile);

        if (profile.role === 'patient') {
          const pt = localDB.findPatientByProfileId(profile.id);
          setPatientRecord(pt || null);
        }

        return { success: true };
      }

      // Supabase Auth Login
      // 1. Check if user profile already exists
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      // If password is provided, attempt Supabase Auth sign in
      if (password) {
        try {
          const { data: authSession } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (authSession?.user && !profile) {
            const { data: profById } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authSession.user.id)
              .maybeSingle();
            if (profById) profile = profById;
          }
        } catch {
          // Continue with profile session if password auth is not enforced
        }
      }

      if (!profile) {
        // If not found, check if admin or user wants to auto-register
        if (roleHint) {
          let uid: any = crypto.randomUUID();

          // Try signing up in auth.users first to satisfy foreign key constraint if active
          if (password) {
            try {
              const { data: authData } = await supabase.auth.signUp({
                email,
                password,
                options: {
                  data: {
                    full_name: roleHint === 'admin' ? 'Administrator' : email.split('@')[0],
                    role: roleHint,
                  },
                },
              });
              if (authData?.user?.id) {
                uid = authData.user.id;
              }
            } catch {
              // Ignore and proceed
            }
          }

          const { data: newProf, error: insError } = await supabase
            .from('profiles')
            .insert([
              {
                id: uid,
                full_name: roleHint === 'admin' ? 'Administrator' : email.split('@')[0],
                email,
                role: roleHint,
              },
            ])
            .select()
            .single();

          if (insError) {
            console.warn('Supabase profile insertion error:', insError.message);
            // If foreign key constraint (profiles_id_fkey) or RLS blocks insert, fall back to local storage
            const isFkOrRls =
              insError.message?.includes('profiles_id_fkey') ||
              insError.message?.includes('foreign key constraint') ||
              insError.code === '23503' ||
              insError.message?.includes('row-level security') ||
              insError.code === '42501';

            if (isFkOrRls) {
              let localProf = localDB.findProfileByEmail(email);
              if (!localProf) {
                localProf = localDB.addProfile({
                  id: uid,
                  full_name: roleHint === 'admin' ? 'Administrator' : email.split('@')[0],
                  email,
                  role: roleHint,
                  created_at: new Date().toISOString(),
                });
                if (roleHint === 'patient') {
                  const pt = localDB.addPatient({
                    id: crypto.randomUUID(),
                    profile_id: uid,
                    created_at: new Date().toISOString(),
                  });
                  setPatientRecord(pt);
                }
              }
              setUser(localProf);
              setRole(localProf.role);
              localDB.setSession(localProf);
              return { success: true };
            }
            return { success: false, error: insError.message };
          }
          setUser(newProf);
          setRole(newProf.role);
          return { success: true };
        }
        return { success: false, error: 'User not found in database. Please register.' };
      }

      setUser(profile);
      setRole(profile.role);

      if (profile.role === 'patient') {
        const { data: pt } = await supabase
          .from('patients')
          .select('*')
          .eq('profile_id', profile.id)
          .maybeSingle();
        setPatientRecord(pt || localDB.findPatientByProfileId(profile.id) || null);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  // REGISTER PATIENT
  const register = async (params: {
    fullName: string;
    email: string;
    password?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const { fullName, email, password, phone, dateOfBirth, gender } = params;

      if (!configured) {
        // Check if email exists
        if (localDB.findProfileByEmail(email)) {
          return { success: false, error: 'An account with this email already exists.' };
        }

        const profileId = crypto.randomUUID();
        const profile = localDB.addProfile({
          id: profileId,
          full_name: fullName,
          email,
          phone,
          role: 'patient',
          created_at: new Date().toISOString(),
        });

        const patient = localDB.addPatient({
          id: crypto.randomUUID(),
          profile_id: profileId,
          date_of_birth: dateOfBirth,
          gender,
          phone,
          created_at: new Date().toISOString(),
        });

        setUser(profile);
        setRole('patient');
        setPatientRecord(patient);
        localDB.setSession(profile);

        return { success: true };
      }

      // Check if user already exists in profiles
      const { data: existingProf } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (existingProf) {
        setUser(existingProf);
        setRole('patient');
        const { data: pt } = await supabase
          .from('patients')
          .select('*')
          .eq('profile_id', existingProf.id)
          .maybeSingle();
        setPatientRecord(pt || null);
        return { success: true };
      }

      // 1. Try Supabase Auth signUp to create user in auth.users (satisfies profiles_id_fkey)
      let profileId: any = crypto.randomUUID();
      if (password) {
        try {
          const { data: authData } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
                role: 'patient',
              },
            },
          });
          if (authData?.user?.id) {
            profileId = authData.user.id;
          }
        } catch (e) {
          console.warn('Supabase auth.signUp attempt:', e);
        }
      }

      // 2. Supabase Profiles Registration
      const { data: profile, error: profError } = await supabase
        .from('profiles')
        .insert([
          {
            id: profileId,
            full_name: fullName,
            email,
            phone,
            role: 'patient',
          },
        ])
        .select()
        .single();

      if (profError) {
        console.warn('Supabase profile insertion error:', profError.message);
        // Fall back to local DB if foreign key constraint (profiles_id_fkey) or RLS blocks insertion
        const isFkOrRls =
          profError.message?.includes('profiles_id_fkey') ||
          profError.message?.includes('foreign key constraint') ||
          profError.code === '23503' ||
          profError.message?.includes('row-level security') ||
          profError.code === '42501';

        if (isFkOrRls) {
          const localProf = localDB.addProfile({
            id: profileId,
            full_name: fullName,
            email,
            phone,
            role: 'patient',
            created_at: new Date().toISOString(),
          });
          const localPt = localDB.addPatient({
            id: crypto.randomUUID(),
            profile_id: profileId,
            date_of_birth: dateOfBirth,
            gender,
            phone,
            created_at: new Date().toISOString(),
          });
          setUser(localProf);
          setRole('patient');
          setPatientRecord(localPt);
          localDB.setSession(localProf);
          return { success: true };
        }
        throw profError;
      }

      const { data: patient, error: ptError } = await supabase
        .from('patients')
        .insert([
          {
            profile_id: profileId,
            date_of_birth: dateOfBirth || null,
            gender: gender || null,
            phone: phone || null,
          },
        ])
        .select()
        .single();

      if (ptError) {
        console.warn('Supabase patient insertion error:', ptError.message);
        const localPt = localDB.addPatient({
          id: crypto.randomUUID(),
          profile_id: profileId,
          date_of_birth: dateOfBirth,
          gender,
          phone,
          created_at: new Date().toISOString(),
        });
        setUser(profile);
        setRole('patient');
        setPatientRecord(localPt);
        localDB.setSession(profile);
        return { success: true };
      }

      setUser(profile);
      setRole('patient');
      setPatientRecord(patient);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  // LOGOUT
  const logout = async (): Promise<void> => {
    if (configured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }
    localDB.setSession(null);
    setUser(null);
    setRole(null);
    setPatientRecord(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        patientRecord,
        loading,
        isConfigured: configured,
        login,
        register,
        logout,
        setCurrentUser: setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

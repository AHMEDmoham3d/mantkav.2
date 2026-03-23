import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, UserRole } from '../lib/supabase';

interface Player {
  id: string;
  full_name: string;
  coach_id: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  players: Player[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // جلب جلسة المستخدم عند تحميل التطبيق
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRoleAndPlayers(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // الاشتراك في تغييرات حالة المصادقة
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserRoleAndPlayers(session.user.id);
        } else {
          setRole(null);
          setPlayers([]);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  // جلب رول المستخدم أولاً ثم اللاعبين بناءً على الرول
  const fetchUserRoleAndPlayers = async (userId: string) => {
    setLoading(true);
    try {
      // جلب رول المستخدم
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      const userRole = profileData.role as UserRole;
      setRole(userRole);

      // جلب اللاعبين بناءً على الرول
      if (userRole === 'coach') {
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('coach_id', userId); // يظهر فقط لاعبي هذا المدرب
        if (playersError) throw playersError;
        setPlayers(playersData as Player[]);
      } else if (userRole === 'admin') {
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*'); // الأدمين يشوف كل اللاعبين
        if (playersError) throw playersError;
        setPlayers(playersData as Player[]);
      } else {
        setPlayers([]); // أي رول آخر لا يرى لاعبين
      }
    } catch (error) {
      console.error('Error fetching user role or players:', error);
      setRole(null);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setRole(null);
    setPlayers([]);
  };

  return (
    <AuthContext.Provider value={{ user, role, players, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

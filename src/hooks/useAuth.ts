import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserStatus = 'pending' | 'active' | 'denied' | null;
type UserRole = 'manager' | 'officer' | null;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userStatus, setUserStatus] = useState<UserStatus>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  const checkAdminRole = async (userId: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(!!data);
      }
    } catch (err) {
      console.error('Error checking admin role:', err);
      setIsAdmin(false);
    }
  };

  const checkUserProfile = async (userId: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('status, role')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking user profile:', error);
        setUserStatus(null);
        setUserRole(null);
      } else if (data) {
        setUserStatus(data.status as UserStatus);
        setUserRole(data.role as UserRole);
      }
    } catch (err) {
      console.error('Error checking user profile:', err);
      setUserStatus(null);
      setUserRole(null);
    }
  };

  const runAuthChecks = async (userId: string) => {
    try {
      // Wait for BOTH checks to complete before setting loading to false
      await Promise.all([
        checkAdminRole(userId),
        checkUserProfile(userId)
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer checks to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            runAuthChecks(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setUserStatus(null);
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        runAuthChecks(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, isAdmin, userStatus, userRole, loading, signOut };
}

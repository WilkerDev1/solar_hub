'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/core/database/supabase';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  companyId: string;
  companyName?: string;
}

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface AuthContextType {
  user: UserProfile | null;
  roles: UserRole[];
  permissions: Set<string>;
  loading: boolean;
  hasPermission: (action: string) => boolean;
  switchCompany: (companyId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadProfile = async (authUser: any) => {
    try {
      // 1. Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          company_id,
          full_name,
          email,
          avatar_url,
          companies (
            id,
            name
          )
        `)
        .eq('id', authUser.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile from DB:', profileError.message);
        // Fallback profile if profile isn't generated yet or error occurs
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          fullName: authUser.email ? authUser.email.split('@')[0] : 'Usuario',
          companyId: '',
        });
        setRoles([]);
        setPermissions(new Set());
        return;
      }

      if (!profile) {
        setUser(null);
        setRoles([]);
        setPermissions(new Set());
        return;
      }

      // 2. Fetch roles and permissions for this profile scoped to their company
      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          roles (
            id,
            company_id,
            name,
            description,
            role_permissions (
              permission_id,
              permissions (
                id,
                action,
                description
              )
            )
          )
        `)
        .eq('user_id', authUser.id);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError.message);
      }

      const activeRoles: UserRole[] = [];
      const allPermissions = new Set<string>();

      if (userRolesData) {
        userRolesData.forEach((ur: any) => {
          const role = ur.roles;
          // Verify that role belongs to user's active company
          if (role && role.company_id === profile.company_id) {
            const rolePerms: string[] = [];
            if (role.role_permissions) {
              role.role_permissions.forEach((rp: any) => {
                const perm = rp.permissions;
                if (perm && perm.action) {
                  rolePerms.push(perm.action);
                  allPermissions.add(perm.action);
                }
              });
            }

            activeRoles.push({
              id: role.id,
              name: role.name,
              permissions: rolePerms,
            });
          }
        });
      }

      const companyObj = profile.companies as any;

      setUser({
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name || 'Nuevo Usuario',
        avatarUrl: profile.avatar_url || undefined,
        companyId: profile.company_id || '',
        companyName: companyObj ? companyObj.name : 'Default Solar Hub Tenant',
      });
      setRoles(activeRoles);
      setPermissions(allPermissions);
    } catch (error) {
      console.error('Failed to load profile details:', error);
    }
  };

  useEffect(() => {
    let active = true;

    const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de conexión con el servidor (verifique su conexión o VPN/Tailscale)')), timeoutMs)
        )
      ]);
    };

    const initAuth = async () => {
      try {
        const sessionPromise = (async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await loadProfile(session.user);
          } else {
            setUser(null);
            setRoles([]);
            setPermissions(new Set());
          }
        })();

        await withTimeout(sessionPromise, 4000);
      } catch (error: any) {
        console.warn('Auth initialization timed out or failed:', error.message || error);
        if (active) {
          setUser(null);
          setRoles([]);
          setPermissions(new Set());
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen to session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;
      
      // Only trigger loader on explicit login/logout events to avoid startup redundancy
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setLoading(true);
        try {
          if (session?.user) {
            await withTimeout(loadProfile(session.user), 4500);
          } else {
            setUser(null);
            setRoles([]);
            setPermissions(new Set());
          }
        } catch (error) {
          console.error('Auth state change failed:', error);
          setUser(null);
          setRoles([]);
          setPermissions(new Set());
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const hasPermission = (action: string): boolean => {
    if (permissions.has('admin:*')) return true;
    return permissions.has(action);
  };

  const switchCompany = async (companyId: string) => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('No active authenticated user session');

      // Update active company in database profile
      const { error } = await supabase
        .from('profiles')
        .update({ company_id: companyId })
        .eq('id', authUser.id);

      if (error) throw error;

      // Reload profile configuration
      await loadProfile(authUser);
    } catch (error) {
      console.error('Error switching company context:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setRoles([]);
      setPermissions(new Set());
    } catch (error) {
      console.error('Signout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, roles, permissions, loading, hasPermission, switchCompany, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface RequirePermissionProps {
  action: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({
  action,
  fallback = null,
  children,
}) => {
  const { hasPermission, loading } = useAuth();

  if (loading) {
    return <div className="animate-pulse h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />;
  }

  if (!hasPermission(action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

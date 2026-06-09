'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  companyId: string;
}

export interface UserRole {
  id: string;
  name: string;
  permissions: string[]; // List of permission actions, e.g., 'project:create'
}

export interface AuthContextType {
  user: UserProfile | null;
  roles: UserRole[];
  permissions: Set<string>;
  loading: boolean;
  hasPermission: (action: string) => boolean;
  switchCompany: (companyId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock authentication check - In production, this integrates with Supabase Auth
    const initSession = async () => {
      try {
        // Simulating loading session from supabase
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        const mockUser: UserProfile = {
          id: 'usr-123',
          email: 'tecnico@solarhub.com',
          fullName: 'Juan Técnico',
          companyId: 'comp-abc',
        };

        const mockRoles: UserRole[] = [
          {
            id: 'role-tech',
            name: 'Técnico de Campo',
            permissions: [
              'project:read',
              'project:update',
              'inventory:read',
              'inventory:use_material',
              'client:read',
            ],
          },
        ];

        setUser(mockUser);
        setRoles(mockRoles);
        
        const allPermissions = new Set<string>();
        mockRoles.forEach((r) => r.permissions.forEach((p) => allPermissions.add(p)));
        setPermissions(allPermissions);
      } catch (error) {
        console.error('Failed to initialize session:', error);
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, []);

  const hasPermission = (action: string): boolean => {
    // Superuser or exact match
    if (permissions.has('admin:*')) return true;
    return permissions.has(action);
  };

  const switchCompany = async (companyId: string) => {
    setLoading(true);
    // In production, update user profile's active company in Supabase
    if (user) {
      setUser({ ...user, companyId });
    }
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, roles, permissions, loading, hasPermission, switchCompany }}>
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
    return <div className="animate-pulse h-8 bg-gray-200 dark:bg-zinc-800 rounded w-full" />;
  }

  if (!hasPermission(action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

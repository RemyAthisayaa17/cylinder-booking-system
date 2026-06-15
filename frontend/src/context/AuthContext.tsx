import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { AuthUser, Role } from '../types';

interface AuthCtx {
  user:            AuthUser | null;
  role:            Role | null;
  isAuthenticated: boolean;
  login:           (token: string, user: AuthUser) => void;
  logout:          () => void;
}

const Ctx = createContext<AuthCtx | null>(null);


function decodeRoleFromToken(token: string): Role | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const role = payload?.role;
    if (role === 'CUSTOMER' || role === 'DELIVERY_PARTNER' || role === 'ADMIN') {
      return role as Role;
    }
    return null;
  } catch {
    return null;
  }
}


function initUser(): AuthUser | null {
  try {
    const token = localStorage.getItem('token');
    const stored = JSON.parse(localStorage.getItem('user') ?? 'null') as AuthUser | null;

    if (!token || !stored) return null;

    // Decode role from JWT — this is the authoritative value
    const roleFromToken = decodeRoleFromToken(token);
    if (!roleFromToken) {
      
      localStorage.clear();
      return null;
    }

    // Return user with role from JWT (not from raw localStorage)
    return { ...stored, role: roleFromToken };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(initUser);

  const login = useCallback((token: string, u: AuthUser) => {
    // Decode role from JWT to confirm it matches what the backend returned
    const roleFromToken = decodeRoleFromToken(token);
    const safeUser: AuthUser = {
      ...u,
      role: roleFromToken ?? u.role, // JWT wins
    };
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(safeUser));
    setUser(safeUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{
      user,
      role: user?.role ?? null,
      isAuthenticated: !!user,
      login,
      logout,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
} 
export type Role = 'customer' | 'merchant';

const KEY = 'citywallet_session';

export interface Session {
  _id?: string;
  email: string;
  role: Role;
  name?: string;
  category?: string;
  emailVerified?: boolean;
  location?: {
    lat?: number;
    lng?: number;
    address?: string;
  };
  preferences?: string[];
}

export type SignupResult = Session & {
  requiresEmailVerification?: boolean;
  message?: string;
  devVerificationPath?: string;
};

export const getSession = (): Session | null => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setSession = (s: Session) => {
  localStorage.setItem(KEY, JSON.stringify(s));
};

export const clearSession = () => {
  localStorage.removeItem(KEY);
};

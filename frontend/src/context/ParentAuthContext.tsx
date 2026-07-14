/**
 * Separate auth context for the Parent Portal.
 * Parents use a distinct login flow (schoolSlug + email + password)
 * and receive a PARENT-role JWT stored under a different key so it
 * never conflicts with the admin session.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api/client";

interface GuardianStudent {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  section: {
    name: string;
    class: { name: string; level: number };
  };
}

export interface GuardianUser {
  id: string;
  name: string;
  relationship: string;
  email: string;
  schoolId: string;
  school: { slug: string; name: string };
  student: GuardianStudent;
}

interface ParentAuthState {
  guardian: GuardianUser | null;
  loading: boolean;
  login: (schoolSlug: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const ParentAuthContext = createContext<ParentAuthState>({} as ParentAuthState);

export const PARENT_TOKEN_KEY = "parent_token";

export function ParentAuthProvider({ children }: { children: ReactNode }) {
  const [guardian, setGuardian] = useState<GuardianUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(PARENT_TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    // Verify the token is still valid by hitting the portal profile endpoint
    api
      .get("/parent/portal/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        // Reconstruct a partial guardian from the profile response
        setGuardian({
          id: res.data.id,
          name: res.data.name,
          relationship: res.data.relationship,
          email: res.data.email,
          schoolId: res.data.schoolId,
          school: res.data.school ?? { slug: "", name: "" },
          student: res.data.student,
        });
      })
      .catch(() => localStorage.removeItem(PARENT_TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  async function login(schoolSlug: string, email: string, password: string) {
    const res = await api.post("/parent/auth/login", {
      schoolSlug,
      email,
      password,
    });
    localStorage.setItem(PARENT_TOKEN_KEY, res.data.token);
    setGuardian(res.data.guardian);
  }

  function logout() {
    localStorage.removeItem(PARENT_TOKEN_KEY);
    setGuardian(null);
  }

  return (
    <ParentAuthContext.Provider value={{ guardian, loading, login, logout }}>
      {children}
    </ParentAuthContext.Provider>
  );
}

export const useParentAuth = () => useContext(ParentAuthContext);

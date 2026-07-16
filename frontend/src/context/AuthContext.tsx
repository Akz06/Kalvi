import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api/client";

interface UserSchool {
  id: string;
  slug: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  schoolId: string | null;
  school?: { slug: string; name: string } | null;
  schools?: UserSchool[]; // all schools this user owns/belongs to
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, schoolSlug?: string) => Promise<void>;
  loginWithToken: (token: string, user: User) => void;
  logout: () => void;
  reloadUser: () => Promise<void>;
  switchSchool: (slug: string) => Promise<void>;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.user);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      // 401 = invalid/expired token → clear it
      // Any other error (network, 500) = keep the token, don't log the user out
      if (status === 401) {
        localStorage.removeItem("token");
        setUser(null);
      }
      // If /auth/me fails for any other reason (backend down, 500), we still
      // have the token. Try to decode the user from the JWT payload so the
      // app can at least render the correct route guards.
      else {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setUser({
            id: payload.sub ?? payload.id ?? "",
            name: payload.name ?? "",
            email: payload.email ?? "",
            role: payload.role ?? "ADMIN",
            schoolId: payload.schoolId ?? null,
          });
        } catch {
          // JWT unparseable — clear it
          localStorage.removeItem("token");
          setUser(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  async function login(email: string, password: string, schoolSlug?: string) {
    const res = await api.post("/auth/login", {
      email,
      password,
      ...(schoolSlug ? { schoolSlug } : {}),
    });
    // If backend requires school selection, bubble up the raw response — caller handles it
    if (res.data.requiresSchoolSelection) return res.data;
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    return res.data;
  }

  function loginWithToken(token: string, userData: User) {
    localStorage.setItem("token", token);
    setUser(userData);
  }

  async function reloadUser() {
    await loadUser();
  }

  async function switchSchool(slug: string) {
    const res = await api.post("/auth/switch-school", { schoolSlug: slug });
    localStorage.setItem("token", res.data.token);
    // Merge schools from the response (backend now always returns the full list)
    setUser(res.data.user);
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, loginWithToken, logout, reloadUser, switchSchool }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

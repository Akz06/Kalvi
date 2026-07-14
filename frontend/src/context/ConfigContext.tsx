import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";

export interface Features {
  students: boolean;
  staff: boolean;
  classes: boolean;
  attendance: boolean;
  fees: boolean;
  exams: boolean;
  parentPortal: boolean;
  academicYears: boolean;
  onlinePayments: boolean;
}

export interface SchoolSettings {
  city: string;
  state: string;
  country: string;
  addressLine: string;
  phone: string;
  email: string;
  logoUrl: string;
  tagline: string;
  primaryColor: string;
  currency: string;
  locale: string;
  timezone: string;
  board: string;
  academicYear: string;
  minClassLevel: number;
  maxClassLevel: number;
  sectionsPerClass: number;
  passPercentage: number;
}

interface SchoolConfig {
  id: string;
  slug: string;
  name: string;
  settings: SchoolSettings | null;
  features: Features;
}

interface ConfigState {
  config: SchoolConfig | null;
  loading: boolean;
  reload: () => Promise<void>;
}

const ConfigContext = createContext<ConfigState>({} as ConfigState);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [loading, setLoading] = useState(true);

  async function reload() {
    if (!user) {
      setConfig(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/schools/current");
      setConfig(res.data);
    } catch {
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <ConfigContext.Provider value={{ config, loading, reload }}>
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);

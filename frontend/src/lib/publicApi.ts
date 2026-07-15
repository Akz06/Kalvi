/**
 * Thin axios instance for unauthenticated public API calls
 * (school branding lookup, plan info, etc.)
 */
import axios from "axios";

const BASE =
  import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : "/api";

export const publicApi = axios.create({ baseURL: BASE });

export async function getSchoolBranding(slug: string) {
  try {
    const res = await publicApi.get(`/schools/public/${slug}`);
    return res.data as {
      name: string;
      slug: string;
      city: string;
      board: string;
      logoUrl: string;
      tagline: string;
      primaryColor: string;
      phone: string;
      email: string;
      addressLine: string;
    };
  } catch {
    return null;
  }
}

import { prisma } from "../../shared/prisma.js";
import jwt from "jsonwebtoken";

// ── Platform-wide stats ──────────────────────────────────────────────────────

export async function getPlatformStats() {
  const [
    totalSchools,
    activeSchools,
    totalStudents,
    totalStaff,
    recentSchools,
    growthRaw,
  ] = await Promise.all([
    prisma.school.count(),
    prisma.school.count({ where: { active: true } }),
    prisma.student.count({ where: { active: true } }),
    prisma.staff.count({ where: { active: true } }),
    prisma.school.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        _count: { select: { students: true, staff: true } },
        settings: { select: { city: true, board: true } },
      },
    }),
    // signups per month for last 6 months
    prisma.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT to_char("createdAt", 'YYYY-MM') AS month, COUNT(*) AS count
      FROM "School"
      WHERE "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month
    `,
  ]);

  return {
    totalSchools,
    activeSchools,
    suspendedSchools: totalSchools - activeSchools,
    totalStudents,
    totalStaff,
    growth: growthRaw.map((r) => ({ month: r.month, count: Number(r.count) })),
    recentSchools: recentSchools.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      active: s.active,
      createdAt: s.createdAt,
      city: s.settings?.city ?? "",
      board: s.settings?.board ?? "",
      students: s._count.students,
      staff: s._count.staff,
    })),
  };
}

// ── All schools ──────────────────────────────────────────────────────────────

export async function getAllSchools(search?: string, plan?: string) {
  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }
  // plan is stored in settings.features JSON
  const schools = await prisma.school.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { students: true, staff: true } },
      settings: true,
    },
  });

  return schools
    .map((s: any) => {
      let features: Record<string, any> = {};
      try { features = JSON.parse(s.settings?.features ?? "{}"); } catch {}
      const schoolPlan: string = features.plan ?? "free";
      if (plan && plan !== "all" && schoolPlan !== plan) return null;
      return {
        id: s.id,
        name: s.name,
        slug: s.slug,
        active: s.active,
        createdAt: s.createdAt,
        city: s.settings?.city ?? "",
        board: s.settings?.board ?? "",
        plan: schoolPlan,
        students: s._count.students,
        staff: s._count.staff,
        features,
      };
    })
    .filter(Boolean);
}

// ── School detail ────────────────────────────────────────────────────────────

export async function getSchoolDetail(schoolId: string) {
  const [school, users, counts] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      include: { settings: true },
    }),
    prisma.user.findMany({
      where: { schoolId },
      select: { id: true, name: true, email: true, role: true, createdAt: true, active: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        _count: {
          select: {
            students: true, staff: true, classes: true,
            sections: true, exams: true, fees: true,
            attendances: true,
          },
        },
      },
    }),
  ]);

  if (!school) throw new Error("School not found");

  let features: Record<string, any> = {};
  try { features = JSON.parse(school.settings?.features ?? "{}"); } catch {}

  return {
    id: school.id,
    name: school.name,
    slug: school.slug,
    active: school.active,
    createdAt: school.createdAt,
    settings: {
      city: school.settings?.city ?? "",
      state: school.settings?.state ?? "",
      board: school.settings?.board ?? "",
      phone: school.settings?.phone ?? "",
      email: school.settings?.email ?? "",
      timezone: school.settings?.timezone ?? "Asia/Kolkata",
    },
    plan: features.plan ?? "free",
    features,
    counts: counts?._count ?? {},
    users,
  };
}

// ── Suspend / unsuspend ──────────────────────────────────────────────────────

export async function toggleSuspend(schoolId: string) {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new Error("School not found.");
  return prisma.school.update({
    where: { id: schoolId },
    data: { active: !school.active },
  });
}

// ── Delete school ────────────────────────────────────────────────────────────

export async function deleteSchool(schoolId: string) {
  await prisma.school.delete({ where: { id: schoolId } });
}

// ── Impersonate ──────────────────────────────────────────────────────────────

export async function impersonateSchool(schoolId: string) {
  // Find the ADMIN user for this school
  const adminUser = await prisma.user.findFirst({
    where: { schoolId, role: "ADMIN", active: true },
    orderBy: { createdAt: "asc" },
  });
  if (!adminUser) throw new Error("No admin user found for this school.");

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new Error("School not found.");

  const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";
  // Token MUST include type:"access" — verifyToken() in auth.ts rejects
  // any token without this field, causing the impersonated session to fail.
  const token = jwt.sign(
    {
      sub: adminUser.id,        // verifyToken reads sub, not userId
      schoolId: school.id,
      schoolSlug: school.slug,
      role: adminUser.role,
      email: adminUser.email,
      type: "access",           // required by verifyToken()
      impersonated: true,
    },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  return { token, schoolSlug: school.slug, adminName: adminUser.name };
}

// ── Plans ────────────────────────────────────────────────────────────────────

const PLAN_LIMITS: Record<string, Record<string, any>> = {
  free:       { maxStudents: 100,  maxStaff: 10,  modules: ["attendance", "fees"] },
  starter:    { maxStudents: 500,  maxStaff: 50,  modules: ["attendance", "fees", "exams", "timetable"] },
  pro:        { maxStudents: 2000, maxStaff: 200, modules: ["attendance", "fees", "exams", "timetable", "parent_portal", "reports"] },
  enterprise: { maxStudents: 99999, maxStaff: 9999, modules: ["all"] },
};

export async function updatePlan(schoolId: string, plan: string) {
  const settings = await prisma.schoolSettings.findUnique({ where: { schoolId } });
  let features: Record<string, any> = {};
  try { features = JSON.parse(settings?.features ?? "{}"); } catch {}

  features.plan = plan;
  features.limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  await prisma.schoolSettings.upsert({
    where: { schoolId },
    update: { features: JSON.stringify(features) },
    create: { schoolId, features: JSON.stringify(features) },
  });
  return { plan, limits: features.limits };
}

// ── Feature flags ─────────────────────────────────────────────────────────────

export async function getFeatureFlags(schoolId: string) {
  const settings = await prisma.schoolSettings.findUnique({ where: { schoolId } });
  let features: Record<string, any> = {};
  try { features = JSON.parse(settings?.features ?? "{}"); } catch {}
  return {
    fees:          features.fees          ?? true,
    exams:         features.exams         ?? true,
    timetable:     features.timetable     ?? true,
    parent_portal: features.parent_portal ?? true,
    reports:       features.reports       ?? true,
    announcements: features.announcements ?? true,
    custom_domain: features.custom_domain ?? false,
    api_access:    features.api_access    ?? false,
  };
}

export async function updateFeatureFlags(schoolId: string, flags: Record<string, boolean>) {
  const settings = await prisma.schoolSettings.findUnique({ where: { schoolId } });
  let features: Record<string, any> = {};
  try { features = JSON.parse(settings?.features ?? "{}"); } catch {}

  Object.assign(features, flags);

  await prisma.schoolSettings.upsert({
    where: { schoolId },
    update: { features: JSON.stringify(features) },
    create: { schoolId, features: JSON.stringify(features) },
  });
  return flags;
}

// ── Announcements ────────────────────────────────────────────────────────────

// We store announcements in a JSON file for simplicity (no extra DB table needed)
// For production, add a proper PlatformAnnouncement model.
// For now, store in-memory (resets on restart) — enough for demo purposes.

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "critical";
  target: "all" | string; // "all" or schoolId
  createdAt: string;
  expiresAt?: string;
}

const _announcements: Announcement[] = [];

export function getAnnouncements(target?: string) {
  return _announcements.filter((a) => {
    if (a.target !== "all" && a.target !== target) return false;
    if (a.expiresAt && new Date(a.expiresAt) < new Date()) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createAnnouncement(data: Omit<Announcement, "id" | "createdAt">) {
  const ann: Announcement = {
    ...data,
    id: Math.random().toString(36).slice(2),
    createdAt: new Date().toISOString(),
  };
  _announcements.unshift(ann);
  return ann;
}

export function deleteAnnouncement(id: string) {
  const idx = _announcements.findIndex((a) => a.id === id);
  if (idx !== -1) _announcements.splice(idx, 1);
}

// ── Activity logs ────────────────────────────────────────────────────────────

interface ActivityLog {
  id: string;
  action: string;
  target: string;
  meta?: string;
  timestamp: string;
  ip?: string;
}

const _activityLogs: ActivityLog[] = [];

export function logActivity(action: string, target: string, meta?: string, ip?: string) {
  const log: ActivityLog = {
    id: Math.random().toString(36).slice(2),
    action,
    target,
    meta,
    ip,
    timestamp: new Date().toISOString(),
  };
  _activityLogs.unshift(log);
  if (_activityLogs.length > 500) _activityLogs.pop(); // cap at 500
  return log;
}

export function getActivityLogs(limit = 100) {
  return _activityLogs.slice(0, limit);
}

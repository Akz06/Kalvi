import bcrypt from "bcryptjs";
import { prisma } from "../../shared/prisma.js";
import { signToken } from "../../shared/jwt.js";
import { provisionClasses } from "../../shared/provision.js";
import { parseFeatures, DEFAULT_FEATURES } from "../../shared/config.js";
import { BadRequest, Conflict, Unauthorized } from "../../shared/errors.js";

const BAD_CREDENTIALS =
  "We couldn't find an account with those details. Check your school code, email, and password.";

export async function login(input: {
  email: string;
  password: string;
  schoolSlug?: string;
}) {
  const { email, password, schoolSlug } = input;

  let schoolId: string | null | undefined;
  if (schoolSlug) {
    const school = await prisma.school.findUnique({ where: { slug: schoolSlug } });
    if (!school)
      throw Unauthorized(
        "We couldn't find a school with that code. Please check your school code and try again."
      );
    schoolId = school.id;
  }

  const users = await prisma.user.findMany({
    where: { email, ...(schoolId !== undefined ? { schoolId } : {}) },
    include: { school: { select: { slug: true, name: true } } },
  });

  if (users.length === 0) throw Unauthorized(BAD_CREDENTIALS);
  if (users.length > 1)
    throw BadRequest(
      "This email is registered with more than one school. Please enter your school code to continue."
    );

  const user = users[0];
  if (!user.active)
    throw Unauthorized(
      "This account has been deactivated. Please contact your school administrator."
    );

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw Unauthorized(BAD_CREDENTIALS);

  const token = signToken({
    sub: user.id,
    role: user.role,
    email: user.email,
    schoolId: user.schoolId,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      school: user.school,
    },
  };
}

export async function currentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      schoolId: true,
      school: { select: { slug: true, name: true } },
    },
  });
  if (!user) throw Unauthorized();
  return user;
}

export async function registerSchool(input: {
  school: { name: string; slug: string };
  admin: { name: string; email: string; password: string };
  settings?: {
    city?: string;
    state?: string;
    board?: string;
    minClassLevel?: number;
    maxClassLevel?: number;
    sectionsPerClass?: number;
  };
}) {
  const { school, admin, settings } = input;

  const existing = await prisma.school.findUnique({ where: { slug: school.slug } });
  if (existing)
    throw Conflict("That school code is already taken. Please choose a different code.");

  const hashed = await bcrypt.hash(admin.password, 10);

  const created = await prisma.school.create({
    data: {
      name: school.name,
      slug: school.slug,
      settings: {
        create: {
          city: settings?.city ?? "",
          state: settings?.state ?? "",
          board: settings?.board ?? "CBSE",
          minClassLevel: settings?.minClassLevel ?? 1,
          maxClassLevel: settings?.maxClassLevel ?? 12,
          sectionsPerClass: settings?.sectionsPerClass ?? 2,
          features: JSON.stringify(DEFAULT_FEATURES),
        },
      },
      users: {
        create: {
          name: admin.name,
          email: admin.email,
          password: hashed,
          role: "ADMIN" as const,
        },
      },
    },
  });

  await provisionClasses(created.id);

  return {
    id: created.id,
    slug: created.slug,
    name: created.name,
    message: "School registered. Log in with the admin credentials.",
  };
}

export async function getSchoolProfile(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: { settings: true },
  });
  if (!school) return null;
  return {
    id: school.id,
    slug: school.slug,
    name: school.name,
    settings: school.settings,
    features: parseFeatures(school.settings?.features),
  };
}

export async function updateSettings(schoolId: string, body: Record<string, any>) {
  const { features, ...rest } = body;

  let featuresJson: string | undefined;
  if (features) {
    const current = await prisma.schoolSettings.findUnique({ where: { schoolId } });
    const merged = { ...parseFeatures(current?.features), ...features };
    featuresJson = JSON.stringify(merged);
  }

  const updated = await prisma.schoolSettings.update({
    where: { schoolId },
    data: { ...rest, ...(featuresJson ? { features: featuresJson } : {}) },
  });

  return { settings: updated, features: parseFeatures(updated.features) };
}

/** Public branding — safe subset visible without authentication */
export async function getPublicBranding(slug: string) {
  const school = await prisma.school.findUnique({
    where: { slug },
    include: { settings: true },
  });
  if (!school || !school.active) return null;
  return {
    name: school.name,
    slug: school.slug,
    city: school.settings?.city ?? "",
    state: school.settings?.state ?? "",
    board: school.settings?.board ?? "",
    logoUrl: school.settings?.logoUrl ?? "",
    tagline: school.settings?.tagline ?? "",
    primaryColor: school.settings?.primaryColor ?? "",
    phone: school.settings?.phone ?? "",
    email: school.settings?.email ?? "",
    addressLine: school.settings?.addressLine ?? "",
  };
}

export async function reprovisionClasses(schoolId: string) {
  await provisionClasses(schoolId);
  return { ok: true };
}

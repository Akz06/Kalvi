import bcrypt from "bcryptjs";
import { prisma } from "../../shared/prisma.js";
import { signToken } from "../../shared/jwt.js";
import { provisionClasses } from "../../shared/provision.js";
import { parseFeatures, DEFAULT_FEATURES } from "../../shared/config.js";
import { BadRequest, Conflict, Unauthorized } from "../../shared/errors.js";

const BAD_CREDENTIALS =
  "We couldn't find an account with those details. Check your school code, email, and password.";

// ─────────────────────────────────────────────────────────────
// SIGNUP — user account only, no school yet
// ─────────────────────────────────────────────────────────────
export async function signup(input: {
  name: string;
  email: string;
  password: string;
}) {
  const email = input.email.toLowerCase().trim();

  // Global email uniqueness — one account per email address
  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing)
    throw Conflict(
      "An account with this email already exists. Please log in instead."
    );

  // Password complexity (same as registerSchool)
  const pw = input.password;
  if (!/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/\d/.test(pw)) {
    throw BadRequest(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number."
    );
  }

  const hashed = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      password: hashed,
      role: "ADMIN",
      schoolId: null, // no school yet — assigned after CreateSchool flow
    },
  });

  const token = signToken({
    sub: user.id,
    role: user.role,
    email: user.email,
    schoolId: null,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: null,
      school: null,
      schools: [],
    },
  };
}

// ─────────────────────────────────────────────────────────────
// CREATE SCHOOL for an already-authenticated user
// ─────────────────────────────────────────────────────────────
export async function createSchoolForUser(
  userId: string,
  input: {
    name: string;
    slug: string;
    city?: string;
    state?: string;
    board?: string;
    minClassLevel?: number;
    maxClassLevel?: number;
    sectionsPerClass?: number;
  }
) {
  // Slug uniqueness
  const existing = await prisma.school.findUnique({ where: { slug: input.slug } });
  if (existing)
    throw Conflict("That school code is already taken. Please choose a different code.");

  const hashed = await bcrypt.hash(await generateTempPassword(), 12); // not used — user already has their own password
  // We need the user's actual password hash to create them in the new school
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw BadRequest("User not found.");

  // Create the school and add user as admin
  const school = await prisma.school.create({
    data: {
      name: input.name,
      slug: input.slug,
      settings: {
        create: {
          city: input.city ?? "",
          state: input.state ?? "",
          board: input.board ?? "CBSE",
          minClassLevel: input.minClassLevel ?? 1,
          maxClassLevel: input.maxClassLevel ?? 12,
          sectionsPerClass: input.sectionsPerClass ?? 2,
          features: JSON.stringify(DEFAULT_FEATURES),
        },
      },
      users: {
        create: {
          name: user.name,
          email: user.email,
          password: user.password, // reuse existing password hash
          role: "ADMIN",
        },
      },
    },
    include: { users: { where: { email: user.email } } },
  });

  await provisionClasses(school.id);

  // If user has no school yet, update their primary record
  if (!user.schoolId) {
    await prisma.user.update({
      where: { id: userId },
      data: { schoolId: school.id },
    });
  }

  // Issue a new token scoped to the new school
  const newUser = school.users[0];
  const token = signToken({
    sub: newUser.id,
    role: newUser.role,
    email: newUser.email,
    schoolId: school.id,
  });

  return {
    token,
    school: { id: school.id, slug: school.slug, name: school.name },
    message: "School created successfully.",
  };
}

async function generateTempPassword() {
  const { randomBytes } = await import("crypto");
  return randomBytes(16).toString("hex");
}

// ─────────────────────────────────────────────────────────────
// SWITCH SCHOOL — re-issue token for a different school context
// ─────────────────────────────────────────────────────────────
export async function switchSchool(userId: string, schoolSlug: string) {
  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    include: { users: { where: { email: { not: undefined } } } },
  });
  if (!school || !school.active)
    throw BadRequest("School not found.");

  // Verify the user belongs to that school
  const schoolUser = await prisma.user.findFirst({
    where: {
      id: userId,
      school: { slug: schoolSlug },
    },
  });
  // Also allow if user's email matches any user in that school
  const currentUser = await prisma.user.findUnique({ where: { id: userId } });
  const memberUser = await prisma.user.findFirst({
    where: { email: currentUser?.email ?? "", schoolId: school.id },
  });

  if (!schoolUser && !memberUser)
    throw Unauthorized("You do not have access to that school.");

  const targetUser = schoolUser ?? memberUser!;
  const token = signToken({
    sub: targetUser.id,
    role: targetUser.role,
    email: targetUser.email,
    schoolId: school.id,
  });

  return {
    token,
    user: {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      schoolId: school.id,
      school: { slug: school.slug, name: school.name },
    },
  };
}

// ─────────────────────────────────────────────────────────────
// LIST USER'S SCHOOLS
// ─────────────────────────────────────────────────────────────
export async function getUserSchools(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return [];

  const users = await prisma.user.findMany({
    where: { email: user.email },
    include: { school: { select: { id: true, slug: true, name: true } } },
  });

  return users
    .filter((u) => u.school !== null)
    .map((u) => u.school!)
    .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);
}

export async function login(input: {
  email: string;
  password: string;
  schoolSlug?: string;
}) {
  const { password, schoolSlug } = input;
  const email = input.email.toLowerCase().trim(); // normalise before lookup

  let schoolId: string | null | undefined;
  if (schoolSlug) {
    const school = await prisma.school.findUnique({ where: { slug: schoolSlug } });
    if (!school)
      throw Unauthorized(
        "We couldn't find a school with that code. Please check your school code and try again."
      );
    if (!school.active)
      throw Unauthorized("This school account is currently inactive. Please contact support.");
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

  // Fetch all schools this email belongs to
  const allUsers = await prisma.user.findMany({
    where: { email: user.email },
    include: { school: { select: { id: true, slug: true, name: true } } },
  });
  const schools = allUsers
    .filter((u) => u.school !== null)
    .map((u) => u.school!)
    .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);

  return { ...user, schools };
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

  // Slug uniqueness
  const existing = await prisma.school.findUnique({ where: { slug: school.slug } });
  if (existing)
    throw Conflict("That school code is already taken. Please choose a different code.");

  // Prevent the same email registering multiple schools — one admin account per email globally.
  const emailExists = await prisma.user.findFirst({
    where: { email: admin.email.toLowerCase().trim() },
  });
  if (emailExists)
    throw Conflict(
      "An account with this email address already exists. Please use a different email or log in to your existing school."
    );

  // Enforce minimum password strength (8 chars + complexity) at service layer
  // (schema validates 8 chars; this adds complexity check)
  const pw = admin.password;
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  if (!hasUpper || !hasLower || !hasDigit) {
    throw BadRequest(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number."
    );
  }

  // Normalise email to lowercase before storing
  const hashed = await bcrypt.hash(admin.password, 12); // cost 12 for production

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
          email: admin.email.toLowerCase().trim(), // normalise email
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

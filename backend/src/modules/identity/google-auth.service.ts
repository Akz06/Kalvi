import { OAuth2Client } from "google-auth-library";
import { prisma } from "../../shared/prisma.js";
import { signToken } from "../../shared/jwt.js";
import { BadRequest, Unauthorized } from "../../shared/errors.js";
import { env } from "../../config/env.js";

// ── OAuth2 code exchange (redirect flow) ────────────────────────────────────
// Called by the frontend callback page with `code` + `redirectUri`.
// We exchange the code for tokens, extract the user's profile, then
// find-or-create the Kalvi user and return a JWT exactly like googleSignIn().
export async function googleCallback(code: string, redirectUri: string) {
  const oauth2Client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  let payload: { sub: string; email: string; name: string; picture?: string };

  try {
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.id_token) throw new Error("No id_token in token response");

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const p = ticket.getPayload();
    if (!p || !p.email_verified || !p.email) {
      throw new Error("Unverified Google account.");
    }

    payload = {
      sub: p.sub,
      email: p.email.toLowerCase().trim(),
      name: p.name ?? p.email.split("@")[0],
      picture: p.picture,
    };
  } catch {
    throw Unauthorized("Google sign-in failed. Please try again.");
  }

  // Reuse the same find-or-create logic as the id_token flow
  return resolveGoogleUser(payload);
}

// ── Shared: find-or-create Kalvi user from verified Google payload ───────────
async function resolveGoogleUser(payload: { sub: string; email: string; name: string; picture?: string }) {
  const { email, name } = payload;

  // ── 2. Find all existing users for this email ──────────────────────────
  const existingUsers = await prisma.user.findMany({
    where: { email },
    include: { school: { select: { id: true, slug: true, name: true } } },
  });

  // ── 3a. No account at all — auto-create one (no school yet) ────────────
  if (existingUsers.length === 0) {
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: "",          // Google users have no password — login is via Google
        role: "ADMIN",
        schoolId: null,
        googleId: payload.sub,
      },
    });

    const token = signToken({
      sub: newUser.id,
      role: newUser.role,
      email: newUser.email,
      schoolId: null,
    });

    return {
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        schoolId: null,
        school: null,
        schools: [],
      },
    };
  }

  // ── 3b. Multiple schools → return school picker list ───────────────────
  if (existingUsers.length > 1) {
    return {
      requiresSchoolSelection: true,
      schools: existingUsers.map((u) => ({
        id: u.schoolId,
        slug: u.school?.slug ?? "",
        name: u.school?.name ?? "",
      })),
      // Pass email + googleId so the picker can re-issue a scoped token
      _email: email,
    };
  }

  // ── 3c. Single user — log in directly ──────────────────────────────────
  const user = existingUsers[0];

  if (!user.active) {
    throw Unauthorized(
      "This account has been deactivated. Please contact your school administrator."
    );
  }

  // Stamp googleId if not already set
  if (!user.googleId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { googleId: payload.sub },
    });
  }

  const token = signToken({
    sub: user.id,
    role: user.role,
    email: user.email,
    schoolId: user.schoolId,
  });

  const schools = existingUsers
    .filter((u) => u.school !== null)
    .map((u) => u.school!);

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      school: user.school,
      schools,
    },
  };
}

/**
 * Called when user has multiple schools and selects one from the Google
 * sign-in school picker. We verify the email matches (no re-auth needed).
 */
export async function googleSelectSchool(email: string, schoolSlug: string) {
  const school = await prisma.school.findUnique({ where: { slug: schoolSlug } });
  if (!school || !school.active) throw BadRequest("School not found.");

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim(), schoolId: school.id },
    include: { school: { select: { slug: true, name: true } } },
  });

  if (!user) throw Unauthorized("You do not have access to that school.");

  const token = signToken({
    sub: user.id,
    role: user.role,
    email: user.email,
    schoolId: school.id,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: school.id,
      school: user.school,
    },
  };
}

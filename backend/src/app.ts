import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

import { authRouter, schoolRouter } from "./modules/identity/identity.routes.js";
import academicsRoutes from "./modules/academics/academics.routes.js";
import academicYearRoutes from "./modules/academics/academic-year.routes.js";
import studentRoutes from "./modules/people/student.routes.js";
import staffRoutes from "./modules/people/staff.routes.js";
import attendanceRoutes from "./modules/attendance/attendance.routes.js";
import feeRoutes from "./modules/fees/fees.routes.js";
import examRoutes from "./modules/exams/exams.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import {
  parentAuthRouter,
  guardianRouter,
  parentPortalRouter,
} from "./modules/parent/parent.routes.js";
import paymentRoutes from "./modules/payments/payments.routes.js";

const isTest = env.NODE_ENV === "test";

export function createApp() {
  const app = express();

  // Trust the first proxy (Railway / nginx) so rate-limit reads real client IP.
  app.set("trust proxy", 1);

  // ── Security headers (helmet) ────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false, // allow PDF/image embeds
    })
  );

  // ── CORS ─────────────────────────────────────────────────────────────────
  const allowedOrigins = env.CLIENT_ORIGIN
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin ${origin} not allowed`));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 86400, // cache preflight for 24h
    })
  );

  // ── Body parsing — tight limits to prevent DoS ───────────────────────────
  app.use(express.json({ limit: "256kb" }));   // was 1mb — reduced
  app.use(express.urlencoded({ extended: false, limit: "256kb" }));

  // ── Global API rate limit — wide safety net ───────────────────────────────
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,              // 15 min window
    max: isTest ? 10000 : 300,             // 300 req / 15 min per IP
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many requests. Please wait a moment and try again." },
  });
  app.use("/api", globalLimiter);

  // ── Strict rate limit on auth + onboarding (brute-force protection) ──────
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTest ? 10000 : 20,              // 20 login attempts / 15 min per IP
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      error: "Too many login attempts. Please wait 15 minutes and try again.",
    },
  });

  // ── Progressive slow-down on auth (starts adding delay after 5 attempts) ─
  const authSlowDown = slowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: isTest ? 10000 : 5,        // 5 free attempts
    delayMs: (used) => (used - 5) * 500,  // +500ms per extra attempt
    maxDelayMs: 10000,                     // cap at 10s delay
  });

  // ── Registration limiter — tighter (prevent bulk fake schools) ────────────
  const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,             // 1 hour window
    max: isTest ? 10000 : 5,             // 5 registrations per IP per hour
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      error: "Too many registration attempts. Please try again in an hour.",
    },
  });

  // ── Health check (unauthenticated, no rate limit) ─────────────────────────
  app.get("/api/health", (_req, res) =>
    res.json({ status: "ok", ts: new Date().toISOString() })
  );

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use("/api/auth", authSlowDown, authLimiter, authRouter);
  // Legacy combined-register endpoint: extra-tight limiter (5/hour)
  app.post("/api/schools/register", registerLimiter, authLimiter, (req, res, next) => {
    req.url = "/register";
    schoolRouter(req, res, next);
  });
  // New: create school for authenticated user — also rate limited
  app.post("/api/schools", registerLimiter, (req, res, next) => {
    schoolRouter(req, res, next);
  });
  app.use("/api/schools", authLimiter, schoolRouter);
  app.use("/api/classes", academicsRoutes);
  app.use("/api/academic-years", academicYearRoutes);
  app.use("/api/students", studentRoutes);
  app.use("/api/staff", staffRoutes);
  app.use("/api/attendance", attendanceRoutes);
  app.use("/api/fees", feeRoutes);
  app.use("/api/exams", examRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/parent/auth", authSlowDown, authLimiter, parentAuthRouter);
  app.use("/api/guardians", guardianRouter);
  app.use("/api/parent/portal", parentPortalRouter);
  app.use("/api/payments", paymentRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

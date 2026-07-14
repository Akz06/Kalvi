import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
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

export function createApp() {
  const app = express();

  // Trust the first proxy (IDE preview proxy / reverse proxy) so that
  // express-rate-limit can read the real client IP from X-Forwarded-For.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));

  // Rate limiting on auth + onboarding to slow brute-force / abuse.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.NODE_ENV === "test" ? 1000 : 50,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authLimiter, authRouter);
  app.use("/api/schools", authLimiter, schoolRouter);
  app.use("/api/classes", academicsRoutes);
  app.use("/api/academic-years", academicYearRoutes);
  app.use("/api/students", studentRoutes);
  app.use("/api/staff", staffRoutes);
  app.use("/api/attendance", attendanceRoutes);
  app.use("/api/fees", feeRoutes);
  app.use("/api/exams", examRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/parent/auth", authLimiter, parentAuthRouter);
  app.use("/api/guardians", guardianRouter);
  app.use("/api/parent/portal", parentPortalRouter);
  app.use("/api/payments", paymentRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

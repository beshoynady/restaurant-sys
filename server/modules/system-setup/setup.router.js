import express from "express";
import rateLimit from "express-rate-limit";
import setupController from "./setup.controller.js";
import validate from "../../middlewares/validate.js";
import { setupSchema, paramsTokenSchema, paramsTokenStepSchema, stepDataSchema } from "./setup.validation.js";

const router = express.Router();

// ONBOARDING_API_DESIGN.md §5 — the two entry points reachable WITHOUT already possessing a
// session token (Begin, and the backward-compatible single-shot Initialize) get a much stricter
// per-IP ceiling than the app-wide limiter (server.js's 100/min) — this is a low-frequency,
// high-sensitivity operation, unlike everything else behind that global limiter.
const strictEntryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

// Autosave/status polling needs a much more permissive ceiling — an autosave timer firing every
// few seconds must not trip the same limiter meant to stop brute-forcing new onboarding attempts.
const sessionOperationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

/**
 * System Setup V2 — Tenant Provisioning Platform.
 * ONBOARDING_API_DESIGN.md §3 defines the eight operations below; POST /initialize is the
 * backward-compatible wrapper (Option A, confirmed) with no business logic of its own.
 * No auth middleware anywhere in this router — necessarily true, no UserAccount exists yet for
 * any of these calls; security is via the unguessable session token plus the rate limits above.
 */

// Backward-compatible single-shot endpoint — unchanged request/response shape.
router.post("/initialize", strictEntryLimiter, validate(setupSchema), setupController.initialize);

// Step-based wizard endpoints.
router.post("/session", strictEntryLimiter, setupController.begin);
router.post(
  "/session/:token/steps/:stepKey/validate",
  sessionOperationLimiter,
  validate(paramsTokenStepSchema, "params"),
  validate(stepDataSchema),
  setupController.validateStep,
);
router.patch(
  "/session/:token/steps/:stepKey",
  sessionOperationLimiter,
  validate(paramsTokenStepSchema, "params"),
  validate(stepDataSchema),
  setupController.saveDraft,
);
router.get("/session/:token", sessionOperationLimiter, validate(paramsTokenSchema, "params"), setupController.getStatus);
router.get("/session/:token/summary", sessionOperationLimiter, validate(paramsTokenSchema, "params"), setupController.getSummary);
router.post("/session/:token/complete", sessionOperationLimiter, validate(paramsTokenSchema, "params"), setupController.complete);
router.delete("/session/:token", sessionOperationLimiter, validate(paramsTokenSchema, "params"), setupController.cancel);
router.post("/session/:token/restart", sessionOperationLimiter, validate(paramsTokenSchema, "params"), setupController.restart);

export default router;

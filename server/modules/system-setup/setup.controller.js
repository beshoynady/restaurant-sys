import asyncHandler from "../../utils/asyncHandler.js";
import onboardingEngine from "./onboarding-engine.service.js";

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

class SetupController {
  /**
   * Backward-compatible convenience endpoint (ONBOARDING_API_DESIGN.md §6, Option A, confirmed).
   * Contains NO business logic of its own — begins a session, writes the whole payload into
   * draftInput in one shot, and calls the same complete() the step-based wizard calls. There is
   * only one implementation of onboarding; this is a thin adapter over it.
   */
  initialize = asyncHandler(async (req, res) => {
    const { owner, brand, branch, ownerIdentity, employeeProfile, tax } = req.body;

    const session = await onboardingEngine.begin({ ipAddress: req.ip });
    await onboardingEngine.saveDraft({ token: session.token, stepKey: "owner", data: owner });
    await onboardingEngine.saveDraft({ token: session.token, stepKey: "brand", data: brand });
    await onboardingEngine.saveDraft({ token: session.token, stepKey: "branch", data: branch });
    await onboardingEngine.saveDraft({ token: session.token, stepKey: "ownerIdentity", data: ownerIdentity });
    if (employeeProfile) {
      await onboardingEngine.saveDraft({ token: session.token, stepKey: "employeeProfile", data: employeeProfile });
    }
    if (tax) {
      await onboardingEngine.saveDraft({ token: session.token, stepKey: "tax", data: tax });
    }

    const result = await onboardingEngine.complete({ token: session.token });

    if (result.tokens) {
      res.cookie("refreshToken", result.tokens.refreshToken, REFRESH_COOKIE_OPTS);
    }

    res.status(201).json({
      success: true,
      message: "System initialized successfully",
      user: result.user,
      brand: result.brand,
      branch: result.branch,
      accessToken: result.tokens?.accessToken || null,
    });
  });

  begin = asyncHandler(async (req, res) => {
    const session = await onboardingEngine.begin({ ipAddress: req.ip });
    res.status(201).json({ success: true, data: session });
  });

  validateStep = asyncHandler(async (req, res) => {
    const result = await onboardingEngine.validateStep({ token: req.params.token, stepKey: req.params.stepKey, data: req.body });
    res.json({ success: true, data: result });
  });

  saveDraft = asyncHandler(async (req, res) => {
    const session = await onboardingEngine.saveDraft({ token: req.params.token, stepKey: req.params.stepKey, data: req.body });
    res.json({ success: true, data: session });
  });

  getStatus = asyncHandler(async (req, res) => {
    const session = await onboardingEngine.getStatus({ token: req.params.token });
    res.json({ success: true, data: session });
  });

  getSummary = asyncHandler(async (req, res) => {
    const summary = await onboardingEngine.getSummary({ token: req.params.token });
    res.json({ success: true, data: summary });
  });

  complete = asyncHandler(async (req, res) => {
    const idempotencyKey = req.header("Idempotency-Key") || null;
    const result = await onboardingEngine.complete({ token: req.params.token, idempotencyKey });

    if (result.tokens) {
      res.cookie("refreshToken", result.tokens.refreshToken, REFRESH_COOKIE_OPTS);
    }

    res.json({
      success: true,
      data: {
        state: result.state,
        user: result.user,
        brand: result.brand,
        branch: result.branch,
        validationReport: result.validationReport,
        accessToken: result.tokens?.accessToken || null,
      },
    });
  });

  cancel = asyncHandler(async (req, res) => {
    const session = await onboardingEngine.cancel({ token: req.params.token });
    res.json({ success: true, data: session });
  });

  restart = asyncHandler(async (req, res) => {
    const session = await onboardingEngine.restart({ token: req.params.token });
    res.status(201).json({ success: true, data: session });
  });
}

export default new SetupController();

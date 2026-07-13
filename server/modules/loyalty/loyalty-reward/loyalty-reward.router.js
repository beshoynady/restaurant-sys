// routes/loyalty/loyalty-reward.routes.js

import express from "express";
// Cross-domain final audit finding: this pointed at a nonexistent
// "./loyalty/loyalty-reward.controller.js" (the controller actually lives
// directly in this folder) — the router would throw "Cannot find module" on
// load. Also was never mounted in index.router.js, so this was dead code.
import LoyaltyRewardController from "./loyalty-reward.controller.js";

import authenticateToken from "../../../middlewares/authenticate.js";
// Was imported as a named export (`{ authenticateCustomerToken }`), but
// authenticate-customer.js only has a default export — this was `undefined`
// and would have crashed Express at router-registration time.
import authenticateCustomerToken from "../../../middlewares/authenticate-customer.js";
import authorize from "../../../middlewares/authorize.js";
import validate from "../../../middlewares/validate.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";

import {
  createLoyaltyRewardSchema,
  updateLoyaltyRewardSchema,
  paramsLoyaltyRewardSchema,
  paramsLoyaltyRewardIdsSchema,
  queryLoyaltyRewardSchema,
} from "./loyalty-reward.validation.js";

const router = express.Router();

/* ================= ADMIN ================= */

router.use("/admin", authenticateToken, checkModuleEnabled("loyalty"));

router.route("/admin")
  .post(
    // Was a single-arg authorize("loyalty_reward_create") call —
    // authorize(resource, action) always evaluates perm[undefined] with only
    // one arg, so this permanently denied every role. Fixed to the
    // 2-arg form against the new RESOURCE_ENUM entry "LoyaltyRewards".
    authorize("LoyaltyRewards", "create"),
    validate(createLoyaltyRewardSchema),
    LoyaltyRewardController.create
  )
  .get(
    authorize("LoyaltyRewards", "read"),
    validate(queryLoyaltyRewardSchema),
    LoyaltyRewardController.getAll
  );

router.route("/admin/:id")
  .get(
    authorize("LoyaltyRewards", "read"),
    validate(paramsLoyaltyRewardSchema, "params"),
    LoyaltyRewardController.getOne
  )
  .put(
    authorize("LoyaltyRewards", "update"),
    validate(updateLoyaltyRewardSchema),
    LoyaltyRewardController.update
  )
  .delete(
    authorize("LoyaltyRewards", "delete"),
    validate(paramsLoyaltyRewardSchema, "params"),
    LoyaltyRewardController.hardDelete
  );

/* ================= CUSTOMER ================= */

router.use("/customer", authenticateCustomerToken, checkModuleEnabled("loyalty"));

// Active rewards
router.get(
  "/customer",
  LoyaltyRewardController.getAll
);

export default router;

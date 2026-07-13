// routes/customers/online-customer.routes.js

import express from "express";
import onlineCustomerController from "./online-customer.controller.js";
import authenticateCustomer from "../../../middlewares/authenticate-customer.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import authorize from "../../../middlewares/authorize.js";

import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import {
  createOnlineCustomerSchema,
  updateOnlineCustomerSchema,
  paramsOnlineCustomerSchema,
  paramsOnlineCustomerIdsSchema,
  queryOnlineCustomerSchema,
} from "./online-customer.validation.js";

const router = express.Router();

/**
 * 🔹 Inject config
 */
const customerConfig = (req, res, next) => {
  req.populate = ["brand", "verifiedBy", "favorites"];
  next();
};

// =====================================================
// CRUD
// =====================================================

router.route("/")
  .post(
    authenticateToken,
    authorize("OnlineCustomers", "create"),
    checkModuleEnabled("crm"),
    customerConfig,
    validate(createOnlineCustomerSchema),
    onlineCustomerController.create
  )
  .get(
    authenticateToken,
    authorize("OnlineCustomers", "read"),
    checkModuleEnabled("crm"),
    customerConfig,
    validate(queryOnlineCustomerSchema),
    onlineCustomerController.getAll
  );

router.route("customer/:id")
  .get(
    authenticateCustomer,
    customerConfig,
    validate(paramsOnlineCustomerSchema, "params"),
    onlineCustomerController.getOne
  )
  router.route("admin/:id")

.get(
    authenticateToken,
    authorize("OnlineCustomers", "read"),
    checkModuleEnabled("crm"),
    customerConfig,
    validate(paramsOnlineCustomerSchema, "params"),
    onlineCustomerController.getOne
  )
  .put(
    authenticateToken,
    authorize("OnlineCustomers", "update"),
    checkModuleEnabled("crm"),
    customerConfig,
    validate(updateOnlineCustomerSchema),
    onlineCustomerController.update
  )
  .delete(
    authenticateToken,
    authorize("OnlineCustomers", "delete"),
    checkModuleEnabled("crm"),
    validate(paramsOnlineCustomerSchema, "params"),
    onlineCustomerController.hardDelete
  );

// =====================================================
// Soft Delete
// =====================================================

router.patch(
  "/soft-delete/:id",
  authenticateToken,
  authorize("OnlineCustomers", "delete"),
    checkModuleEnabled("crm"),
  validate(paramsOnlineCustomerSchema, "params"),
  onlineCustomerController.softDelete
);

router.patch(
  "/restore/:id",
  authenticateToken,
  authorize("OnlineCustomers", "update"),
    checkModuleEnabled("crm"),
  validate(paramsOnlineCustomerSchema, "params"),
  onlineCustomerController.restore
);

// =====================================================
// Bulk
// =====================================================

router.delete(
  "/bulk-delete",
  authenticateToken,
  authorize("OnlineCustomers", "delete"),
    checkModuleEnabled("crm"),
  validate(paramsOnlineCustomerIdsSchema),
  onlineCustomerController.bulkHardDelete
);

router.patch(
  "/bulk-soft-delete",
  authenticateToken,
  authorize("OnlineCustomers", "delete"),
    checkModuleEnabled("crm"),
  validate(paramsOnlineCustomerIdsSchema),
  onlineCustomerController.bulkSoftDelete
);

// =====================================================
// Business Logic
// =====================================================

router.patch(
  "/:id/add-points",
  authenticateToken,
  authorize("OnlineCustomers", "update"),
    checkModuleEnabled("crm"),
  onlineCustomerController.addPoints
);

router.patch(
  "/:id/recalc-tier",
  authenticateToken,
  authorize("OnlineCustomers", "update"),
    checkModuleEnabled("crm"),
  onlineCustomerController.recalcTier
);

router.patch(
  "/:id/set-default-address",
  authenticateToken,
  authorize("OnlineCustomers", "update"),
    checkModuleEnabled("crm"),
  onlineCustomerController.setDefaultAddress
);

export default router;
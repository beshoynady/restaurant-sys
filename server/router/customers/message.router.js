const express = require("express");
const router = express.Router();
const {
  createCustomerMessage,
  getCustomerMessages,
  getCustomerMessageById,
  updateCustomerMessage,
  softDeleteCustomerMessage,
  restoreCustomerMessage,
} = require("../../controllers/customers/message.controller");
// ----------------------------
// 🔹 Middlewares
// ----------------------------
const { authenticateToken } = require("../middlewares/authenticate");


router
  .route("/")
  .post(createCustomerMessage)
  .get(authenticateToken, getCustomerMessages);

router
  .route("/:id")
  .get(authenticateToken, getCustomerMessageById)
  .put(authenticateToken, updateCustomerMessage);
router
  .route("soft-delete/:id")
  .put(authenticateToken, softDeleteCustomerMessage);
router.patch(
  "/restore/:id",
  authenticateToken,
  
  restoreCustomerMessage,
);

module.exports = router;

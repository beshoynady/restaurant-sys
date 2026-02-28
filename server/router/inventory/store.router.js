const express = require("express");
const router = express.Router();
const {
  createStore,
  getAllStores,
  getStoreById,
  updateStore,
  deleteStore,
} = require("../../controllers/store.controller");

const { authenticateToken } = require("../../middlewares/authenticate");
const checkSubscription = require("../../middlewares/checkSubscription");

// Create a new store
router
  .route("/")
  .post(authenticateToken, checkSubscription, createStore)
  .get(authenticateToken, checkSubscription, getAllStores);

// Get a store by ID
router
  .route("/:id")
  .get(authenticateToken, checkSubscription, getStoreById)
  .put(authenticateToken, checkSubscription, updateStore)
  .delete(authenticateToken, checkSubscription, deleteStore);

module.exports = router;

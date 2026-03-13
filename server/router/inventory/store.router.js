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


// Create a new store
router
  .route("/")
  .post(authenticateToken,createStore)
  .get(authenticateToken,getAllStores);

// Get a store by ID
router
  .route("/:id")
  .get(authenticateToken,getStoreById)
  .put(authenticateToken,updateStore)
  .delete(authenticateToken,deleteStore);

module.exports = router;

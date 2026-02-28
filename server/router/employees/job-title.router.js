const express = require("express");
const router = express.Router();

const {
  createJobTitle,
  updateJobTitle,
  getJobTitles,
  getJobTitleById,
  softDeleteJobTitle,
  restoreJobTitle,
  deleteJobTitle,
} = require("../../controllers/job-title.controller.js");

const { authenticateToken } = require("../../middlewares/authenticate.js");
const checkSubscription = require("../../middlewares/checkSubscription.js");
const JobTitle = require("../models/jop-title.model.js");

router
  .route("/")
  .post(authenticateToken, checkSubscription, createJobTitle)
  .get(getJobTitles);

router
  .route("/:id")
  .get(getJobTitleById)
  .put(authenticateToken, checkSubscription, updateJobTitle)
  .delete(authenticateToken, checkSubscription, deleteJobTitle);

router
  .route("/:id/soft-delete")
  .put(authenticateToken, checkSubscription, softDeleteJobTitle);

router
  .route("/:id/restore")
  .put(authenticateToken, checkSubscription, restoreJobTitle);

module.exports = router;

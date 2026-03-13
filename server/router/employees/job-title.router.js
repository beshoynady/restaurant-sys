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
} = require("../../controllers/employees/job-title.controller.js");

const { authenticateToken } = require("../../middlewares/authenticate.js");

router
  .route("/")
  .post(authenticateToken,createJobTitle)
  .get(getJobTitles);

router
  .route("/:id")
  .get(authenticateToken, getJobTitleById)
  .put(authenticateToken,updateJobTitle)
  .delete(authenticateToken,deleteJobTitle);

router
  .route("/:id/soft-delete")
  .put(authenticateToken,softDeleteJobTitle);

router
  .route("/:id/restore")
  .put(authenticateToken,restoreJobTitle);

module.exports = router;

import express from "express";
const router = express.Router();

import {
  createJobTitle,
  updateJobTitle,
  getJobTitles,
  getJobTitleById,
  softDeleteJobTitle,
  restoreJobTitle,
  deleteJobTitle,
} from "../../controllers/employees/job-title.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";

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

export default router;

import express from "express";
import jobTitleController from "../../controllers/employees/job-title.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createJobTitleSchema, updateJobTitleSchema } from "../../validation/employees/job-title.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createJobTitleSchema), jobTitleController.create)
  .get(authenticateToken, jobTitleController.getAll)
;

router.route("/:id")
  .get(authenticateToken, jobTitleController.getOne)
  .put(authenticateToken, validate(updateJobTitleSchema), jobTitleController.update)
  .delete(authenticateToken, jobTitleController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, jobTitleController.restore)
;



export default router;

import express from "express";
import leaveRequestController from "../../controllers/employees/leave-request.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, leaveRequestController.create)
  .get(authenticateToken, leaveRequestController.getAll)
;

router.route("/:id")
  .get(authenticateToken, leaveRequestController.getOne)
  .put(authenticateToken, leaveRequestController.update)
  .delete(authenticateToken, leaveRequestController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, leaveRequestController.restore)
;



export default router;

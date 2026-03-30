import express from "express";
import employeeAdvanceController from "../../controllers/employees/employee-advance.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, employeeAdvanceController.create)
  .get(authenticateToken, employeeAdvanceController.getAll)
;

router.route("/:id")
  .get(authenticateToken, employeeAdvanceController.getOne)
  .put(authenticateToken, employeeAdvanceController.update)
  .delete(authenticateToken, employeeAdvanceController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, employeeAdvanceController.restore)
;



export default router;

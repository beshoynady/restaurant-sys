import express from "express";
import employeeController from "../../controllers/employees/employee.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, employeeController.create)
  .get(authenticateToken, employeeController.getAll)
;

router.route("/:id")
  .get(authenticateToken, employeeController.getOne)
  .put(authenticateToken, employeeController.update)
  .delete(authenticateToken, employeeController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, employeeController.restore)
;



export default router;

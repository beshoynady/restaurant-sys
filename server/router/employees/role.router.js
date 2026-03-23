import express from "express";
const router = express.Router();
import {
    createPermission,
    getAllRole,
    getPermissionById,
    getPermissionByEmployee,
    updatePermissionById,
    deletePermissionById
} from "../../controllers/employees/role.controller.js";

import {authenticateToken} from "../../middlewares/authenticate.js";


router.route('/')
    .post(authenticateToken,createPermission)
    .get(authenticateToken,getAllRole);

router.route('/:id')
    .get(authenticateToken,getPermissionById)
    .put(authenticateToken,updatePermissionById)
    .delete(authenticateToken,deletePermissionById);

    router.route('/employee/:id').get(authenticateToken,getPermissionByEmployee);

export default router;

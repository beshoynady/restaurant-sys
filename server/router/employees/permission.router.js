import express from "express";
const router = express.Router();
import {
    createPermission,
    getAllPermissions,
    getPermissionById,
    getPermissionByEmployee,
    updatePermissionById,
    deletePermissionById
} from "../../controllers/employees/permissions.controller.js";

import {authenticateToken} from "../../middlewares/authenticate.js";
import checkSubscription from "../../middlewares/checkSubscription.js";

router.route('/')
    .post(authenticateToken,createPermission)
    .get(authenticateToken,getAllPermissions);

router.route('/:id')
    .get(authenticateToken,getPermissionById)
    .put(authenticateToken,updatePermissionById)
    .delete(authenticateToken,deletePermissionById);

    router.route('/employee/:id').get(authenticateToken,getPermissionByEmployee);

export default router;

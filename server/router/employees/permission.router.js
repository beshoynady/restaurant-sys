const express = require('express');
const router = express.Router();
const {
    createPermission,
    getAllPermissions,
    getPermissionById,
    getPermissionByEmployee,
    updatePermissionById,
    deletePermissionById
} = require('../../controllers/employees/permissions.controller');

const {authenticateToken} = require("../../middlewares/authenticate");
const checkSubscription = require('../../middlewares/checkSubscription')

router.route('/')
    .post(authenticateToken,createPermission)
    .get(authenticateToken,getAllPermissions);

router.route('/:id')
    .get(authenticateToken,getPermissionById)
    .put(authenticateToken,updatePermissionById)
    .delete(authenticateToken,deletePermissionById);

    router.route('/employee/:id').get(authenticateToken,getPermissionByEmployee);

module.exports = router;

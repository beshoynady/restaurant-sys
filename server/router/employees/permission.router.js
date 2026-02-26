const express = require('express');
const router = express.Router();
const {
    createPermission,
    getAllPermissions,
    getPermissionById,
    getPermissionByEmployee,
    updatePermissionById,
    deletePermissionById
} = require('../controllers/permissions.controller');

const {authenticateToken} = require("../../middlewares/authenticate");
const checkSubscription = require('../../middlewares/checkSubscription')

router.route('/')
    .post(authenticateToken, checkSubscription, createPermission)
    .get(authenticateToken, checkSubscription, getAllPermissions);

router.route('/:id')
    .get(authenticateToken, checkSubscription, getPermissionById)
    .put(authenticateToken, checkSubscription, updatePermissionById)
    .delete(authenticateToken, checkSubscription, deletePermissionById);

    router.route('/employee/:id').get(authenticateToken, checkSubscription, getPermissionByEmployee);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
    createSupplier,
    getAllSuppliers,
    getSupplierById,
    updateSupplierById,
    deleteSupplierById
} = require('../controllers/supplier.controller');

const {authenticateToken} = require("../../middlewares/authenticate");
const checkSubscription = require('../../middlewares/checkSubscription')

router.route('/')
    .post(authenticateToken, checkSubscription, createSupplier)
    .get(authenticateToken, checkSubscription, getAllSuppliers);

router.route('/:id')
    .get(authenticateToken, checkSubscription, getSupplierById)
    .put(authenticateToken, checkSubscription, updateSupplierById)
    .delete(authenticateToken, checkSubscription, deleteSupplierById);

module.exports = router;

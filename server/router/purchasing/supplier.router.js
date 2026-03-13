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
    .post(authenticateToken,createSupplier)
    .get(authenticateToken,getAllSuppliers);

router.route('/:id')
    .get(authenticateToken,getSupplierById)
    .put(authenticateToken,updateSupplierById)
    .delete(authenticateToken,deleteSupplierById);

module.exports = router;

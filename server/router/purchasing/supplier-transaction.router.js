const express = require('express');
const router = express.Router();
const {
    createSupplierTransaction,
    getAllSupplierTransactions,
    getSupplierTransactionById,
    updateSupplierTransaction,
    deleteSupplierTransaction,
} = require('../controllers/supplier-transaction.controller');

const {authenticateToken} = require("../../middlewares/authenticate");
const checkSubscription = require('../../middlewares/checkSubscription')

router.route('/')
    .post(authenticateToken,createSupplierTransaction)
    .get(authenticateToken,getAllSupplierTransactions);

router.route('/:id')
    .get(authenticateToken,getSupplierTransactionById)
    .put(authenticateToken,updateSupplierTransaction)
    .delete(authenticateToken,deleteSupplierTransaction);

    
module.exports = router;

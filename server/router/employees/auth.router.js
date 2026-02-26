const express = require("express");
const router = express.Router();



const {
  async
} = require("../../controllers/employees/auth.controller");

const { authenticateToken } = require("../../middlewares/authenticate");




module.exports = router;
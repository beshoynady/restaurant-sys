const express = require("express");
const router = express.Router();
// const{signup, login, refresh, logout }= require('../controllers/auth.controller');
const { signup, login } = require("../controllers/auth.controller");

router.post("/signup", signup);
router.post("/login", login);
// router.get("/refresh",refresh);
// router.post("/logout",logout);

module.exports = router;

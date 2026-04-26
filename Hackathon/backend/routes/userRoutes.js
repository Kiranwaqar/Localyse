const express = require("express");
const { createUser, getUsers, loginUser, updateUser } = require("../controllers/userController");

const router = express.Router();

router.route("/").get(getUsers).post(createUser);
router.post("/signup", createUser);
router.post("/login", loginUser);
router.put("/:id", updateUser);

module.exports = router;

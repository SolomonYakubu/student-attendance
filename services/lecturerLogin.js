"use strict";
const dbConnect = require("../utils/connectLecturerDB");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

const lecturerLogin = async (event, arg) => {
  try {
    // Ensure the .db directory exists
    const dbDir = path.resolve("./.db");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = await dbConnect();
    const { staffID, password } = arg;

    if (!staffID || !password) {
      return event.sender.send("lecturer-login-res", {
        error: true,
        status: "incorrect login",
      });
    }

    // Find lecturer with the staffID
    const user = await db.findByStaffID(staffID);

    if (user) {
      console.log(user);
      const userPassword = user.password;
      const valid = await bcrypt.compare(password, userPassword);

      if (valid) {
        return event.sender.send("lecturer-login-res", {
          error: false,
          courses: JSON.parse(user.courses), // Already parsed in the DB module
          status: "success",
        });
      }
    }

    return event.sender.send("lecturer-login-res", {
      error: true,
      status: "incorrect login",
    });
  } catch (error) {
    console.log(error.message);
    return event.sender.send("lecturer-login-res", {
      error: true,
      status: "An error occurred",
    });
  }
};

module.exports = { lecturerLogin };

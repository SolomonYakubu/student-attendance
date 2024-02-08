const dbase = require("../utils/connectLecturerDB");
const lodash = require("lodash");
const bcrypt = require("bcrypt");
const fs = require("fs");
const lecturerLogin = async (event, arg) => {
  try {
    const file = "./.db";
    if (!fs.existsSync(file)) {
      fs.mkdirSync(file);
    }
    const db = await dbase();
    const { staffID, password } = arg;
    if (!staffID || !password) {
      return event.sender.send("lecturer-login-res", {
        error: true,
        status: "incorrect login",
      });
    }
    db.chain = lodash.chain(db.data);
    if (db.chain.get("lecturers").find({ staffID }).value()) {
      const user = await db.chain.get("lecturers").find({ staffID }).value();
      const userPassword = user.password;
      const valid = await bcrypt.compare(password, userPassword);
      if (valid) {
        return (
          db.chain.get("lecturers").find({ staffID }).value() &&
          event.sender.send("lecturer-login-res", {
            error: false,
            courses: user.courses,
            status: "success",
          })
        );
      }
      return event.sender.send("lecturer-login-res", {
        error: true,
        status: "incorrect login",
      });
    }
    return event.sender.send("lecturer-login-res", {
      error: true,
      status: "incorrect login",
    });
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = { lecturerLogin };

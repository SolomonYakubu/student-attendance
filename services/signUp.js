"use strict";
const dbase = require("../utils/connectLecturerDB");
const lodash = require("lodash");
const bcrypt = require("bcrypt");

const fs = require("fs");
const signUp = async (event, arg) => {
  try {
    const file = "./.db";
    if (!fs.existsSync(file)) {
      fs.mkdirSync(file);
    }
    const db = await dbase();
    console.log(arg);
    const { name, password, staffID, courses, department } = arg;
    if (!name || !password || !staffID || courses.length < 1) {
      return event.sender.send("signup-res", {
        error: true,

        status: "Fill out all fields",
      });
    }
    db.chain = lodash.chain(db.data);
    if (db.chain.get("lecturers").find({ staffID }).value()) {
      return event.sender.send("signup-res", {
        error: true,

        status: "Lecturer already Registered",
      });
    }

    // Create and query items using plain JS
    const hashedPassword = await bcrypt.hash(password, 10);

    db.data.lecturers.push({
      name,
      staffID,
      password: hashedPassword,
      courses,
      department,
    });
    await db.write();
    // const user = db.chain.get("users").remove({ matric: "ddd" }).value();
    // await db.write();
    // console.log(user);
    return (
      db.chain.get("lecturers").find({ staffID }).value() &&
      event.sender.send("signup-res", {
        error: false,

        status: "success",
      })
    );
  } catch (error) {
    console.log(error.message);
  }
};
module.exports = {
  signUp,
};

"use strict";
const dbConnect = require("../utils/connectLecturerDB");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

const signUp = async (event, arg) => {
  try {
    // Create database connection
    const db = await dbConnect();
    console.log(arg);
    const { name, password, staffID, courses, department } = arg;

    if (!name || !password || !staffID || courses.length < 1 || !department) {
      return event.sender.send("signup-res", {
        error: true,
        status: "Fill out all fields",
      });
    }

    // Check if lecturer already exists with the staffID
    const existingLecturer = await db.findByStaffID(staffID);
    if (existingLecturer) {
      return event.sender.send("signup-res", {
        error: true,
        status: "Lecturer already Registered",
      });
    }

    // Create lecturer with hashed password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store the lecturer in the database
    const lecturerId = await db.createLecturer({
      name,
      staffID,
      password: hashedPassword,
      department,
      courses, // The createLecturer method handles JSON conversion
    });

    if (lecturerId) {
      return event.sender.send("signup-res", {
        error: false,
        status: "success",
      });
    } else {
      return event.sender.send("signup-res", {
        error: true,
        status: "Failed to create lecturer",
      });
    }
  } catch (error) {
    console.error(error);
    return event.sender.send("signup-res", {
      error: true,
      status: "An error occurred",
    });
  }
};

module.exports = {
  signUp,
};

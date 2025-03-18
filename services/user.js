const path = require("path");
const { v4: uuid } = require("uuid");
const departments = require(path.resolve("department.json"));
const dbConnect = require("../utils/connectDB");

const registerUser = async (event, arg) => {
  console.log(arg);
  const department = arg.department;
  const departmentId = departments.courses.filter(
    (item) => item.name === department
  )[0].id;

  try {
    const db = await dbConnect();

    // Check if user already exists
    const existingUsers = await db.read();
    const existingUser = existingUsers.users.find(
      (user) => user.matric === arg.matric
    );

    if (existingUser) {
      return event.sender.send("reg-stats", {
        error: true,
        status: "Student Already Registered",
      });
    }

    // Validate courses
    if (arg.courses.length < 1) {
      return event.sender.send("reg-stats", {
        error: true,
        status: "You must Select Courses",
      });
    }

    // Prepare user data
    const userId = uuid();
    const userData = {
      id: userId,
      name: arg.name,
      matric: arg.matric,
      department: arg.department,
      courses: arg.courses,
      scanned: false,
      dp: arg.dp,
    };

    // Add user to database using the createUser method
    await db.createUser(userData);

    // Verify registration
    const verifyUser = await db.getUser(userId);
    if (verifyUser) {
      event.sender.send("reg-stats", {
        error: false,
        _id: userId,
        status: "success",
      });
    } else {
      event.sender.send("reg-stats", {
        error: true,
        status: "Failed to verify registration",
      });
    }
  } catch (error) {
    console.log(error.message);
    event.sender.send("reg-stats", {
      error: true,
      status: "Registration failed: " + error.message,
    });
  }
};

module.exports = {
  registerUser,
};

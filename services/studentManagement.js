const dbConnect = require("../utils/connectDB");
const path = require("path");
const fs = require("fs");

// Get all students from the database
const getAllStudents = async (event) => {
  console.log("Getting all students...");
  try {
    const db = await dbConnect();
    const data = await db.read();

    console.log(`Found ${data.users.length} students`);

    // Send message in a way that will be received by our event listener
    event.sender.send("message", {
      type: "students",
      students: data.users,
      success: true,
    });

    await db.close();
  } catch (error) {
    console.error("Error getting students:", error);
    event.sender.send("message", {
      type: "students",
      error: "Failed to load students: " + error.message,
      success: false,
    });
  }
};

// Update a student's information
const updateStudent = async (event, studentData) => {
  console.log("Updating student:", studentData.id);
  try {
    const db = await dbConnect();

    // Check if the matric number is already used by another student
    const data = await db.read();
    const existingUser = data.users.find(
      (user) => user.matric === studentData.matric && user.id !== studentData.id
    );

    if (existingUser) {
      console.log("Matric number in use by another student");
      event.sender.send("message", {
        type: "updateStudent",
        error: "Matric number is already in use by another student",
        success: false,
      });
      await db.close();
      return;
    }

    // Update the student data
    console.log("Updating student in database...");
    const result = await db.updateUser(studentData.id, {
      name: studentData.name,
      matric: studentData.matric,
      department: studentData.department,
      courses: studentData.courses,
    });

    if (result) {
      console.log("Student updated successfully");
      event.sender.send("message", {
        type: "updateStudent",
        success: true,
      });
    } else {
      console.log("Student update failed or no changes made");
      event.sender.send("message", {
        type: "updateStudent",
        error: "Student not found or no changes made",
        success: false,
      });
    }

    await db.close();
  } catch (error) {
    console.error("Error updating student:", error);
    event.sender.send("message", {
      type: "updateStudent",
      error: "Failed to update student: " + error.message,
      success: false,
    });
  }
};

// Delete a student
const deleteStudent = async (event, studentId) => {
  console.log("Deleting student:", studentId);
  try {
    const db = await dbConnect();

    // Get student data before deletion (for cleanup)
    const student = await db.getUser(studentId);

    if (!student) {
      console.log("Student not found for deletion");
      event.sender.send("message", {
        type: "deleteStudent",
        error: "Student not found",
        success: false,
      });
      await db.close();
      return;
    }

    // Delete the student from the database
    console.log("Deleting student from database...");
    const result = await db.deleteUser(studentId);

    if (result) {
      console.log("Student deleted from database, cleaning up related files");
      // Clean up student's fingerprint data if it exists
      try {
        const fingerprintDir = path.resolve(`.db/fingerprints/${studentId}`);
        if (fs.existsSync(fingerprintDir)) {
          fs.rmdirSync(fingerprintDir, { recursive: true });
          console.log(`Removed fingerprint directory: ${fingerprintDir}`);
        }

        // Clean up student's profile picture if it exists
        if (student.dp) {
          const dpPath = path.resolve(`.db/photos/${student.dp}`);
          if (fs.existsSync(dpPath)) {
            fs.unlinkSync(dpPath);
            console.log(`Removed profile picture: ${dpPath}`);
          }
        }
      } catch (cleanupErr) {
        console.error("Error during cleanup:", cleanupErr);
        // Continue with success response since the database entry was deleted
      }

      console.log("Student deletion completed successfully");
      event.sender.send("message", {
        type: "deleteStudent",
        success: true,
      });
    } else {
      console.log("Failed to delete student from database");
      event.sender.send("message", {
        type: "deleteStudent",
        error: "Failed to delete student",
        success: false,
      });
    }

    await db.close();
  } catch (error) {
    console.error("Error deleting student:", error);
    event.sender.send("message", {
      type: "deleteStudent",
      error: "Failed to delete student: " + error.message,
      success: false,
    });
  }
};

// New function to search for students by various criteria
const searchStudents = async (event, query) => {
  console.log("Searching students with query:", query);
  try {
    const db = await dbConnect();
    const data = await db.read();

    // If no query, return all students
    if (!query) {
      event.sender.send("message", {
        type: "searchResults", // Use searchResults type for consistency
        students: data.users,
        success: true,
      });
      await db.close();
      return;
    }

    // Search in all fields
    const lowerQuery = query.toLowerCase().trim(); // Added trim for more robust searching
    const results = data.users.filter(
      (student) =>
        (student.name && student.name.toLowerCase().includes(lowerQuery)) ||
        (student.matric && student.matric.toLowerCase().includes(lowerQuery)) ||
        (student.department &&
          student.department.toLowerCase().includes(lowerQuery)) ||
        (student.courses &&
          Array.isArray(student.courses) &&
          student.courses.some((course) =>
            course.toLowerCase().includes(lowerQuery)
          ))
    );

    console.log(`Search returned ${results.length} results`);

    // Always use searchResults message type for search results
    event.sender.send("message", {
      type: "searchResults",
      students: results,
      success: true,
    });

    await db.close();
  } catch (error) {
    console.error("Error searching students:", error);
    event.sender.send("message", {
      type: "searchResults",
      error: "Failed to search students: " + error.message,
      success: false,
      students: [], // Send empty array for consistency
    });
  }
};

module.exports = {
  getAllStudents,
  updateStudent,
  deleteStudent,
  searchStudents,
};

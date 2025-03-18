const populate = async (studentId, course) => {
  const attendanceDB = require("../utils/connectAttendanceDB");
  const userDB = require("../utils/connectDB");
  const courseAttendanceDB = require("../utils/connectCourseAttendanceDB");
  const { _24to12 } = require("../utils/formatTime");

  const day = new Date().getDate();
  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  const time = `${new Date().getHours()}:${new Date().getMinutes()}`;

  // Create attendance data object
  const attendanceData = {
    course,
    month,
    day,
    year,
    time,
  };

  // Connect to all databases
  const userDb = await userDB();
  const attendanceDb = await attendanceDB();
  const courseDb = await courseAttendanceDB();

  try {
    // Get user
    const user = await userDb.getUser(studentId);
    if (!user) {
      await userDb.close();
      await attendanceDb.close();
      await courseDb.close();
      return { status: "User not found" };
    }

    // Check if user is enrolled in the course
    if (!user.courses.includes(course)) {
      await userDb.close();
      await attendanceDb.close();
      await courseDb.close();
      return { status: "No Course" };
    }

    // Get student's attendance record
    let studentAttendance = await attendanceDb.getStudentAttendance(studentId);

    // Get course attendance record
    let courseAttendance = await courseDb.getCourseAttendanceByName(course);

    if (studentAttendance) {
      // Check for duplicate attendance for today
      const attendanceRecords = studentAttendance.attendance;
      const duplicateAttendance = attendanceRecords.find(
        (item) =>
          item.month === month &&
          item.day === day &&
          item.year === year &&
          item.course === course
      );

      if (duplicateAttendance) {
        await userDb.close();
        await attendanceDb.close();
        await courseDb.close();
        return { status: "duplicate" };
      }

      // Add new attendance record
      attendanceRecords.push(attendanceData);
      await attendanceDb.updateAttendance(studentAttendance.id, {
        attendance: attendanceRecords,
      });
    } else {
      // Create new attendance record for student
      await attendanceDb.createAttendance({
        student_id: studentId,
        attendance: [attendanceData],
      });
    }

    // Update course attendance
    if (courseAttendance) {
      const courseRecords = courseAttendance.attendance || [];
      let todayRecord = courseRecords.find(
        (item) => item.day === day && item.month === month && item.year === year
      );

      if (todayRecord) {
        todayRecord.count = (todayRecord.count || 0) + 1;
        await courseDb.updateCourseAttendance(courseAttendance.id, {
          attendance: courseRecords,
        });
      } else {
        courseRecords.push({
          day,
          month,
          year,
          count: 1,
        });
        await courseDb.updateCourseAttendance(courseAttendance.id, {
          attendance: courseRecords,
        });
      }
    } else {
      // Create new course attendance record
      await courseDb.createCourseAttendance({
        course,
        attendance: [
          {
            day,
            month,
            year,
            count: 1,
          },
        ],
      });
    }

    // Close all database connections
    await userDb.close();
    await attendanceDb.close();
    await courseDb.close();

    return { status: "marked", time: _24to12(time) };
  } catch (error) {
    console.error("Error marking attendance:", error);
    await userDb.close();
    await attendanceDb.close();
    await courseDb.close();
    return { status: "error", message: error.message };
  }
};

module.exports = {
  populate,
};

const _24to12 = require("../utils/formatTime")._24to12;
const {
  generateCourseAttendanceReport,
  generateMultiCourseReport,
} = require("./generateReport");

/**
 * Format course code to standardized format (ex: "cpe121" → "CPE 121")
 * @param {string} courseCode - The raw course code
 * @returns {string} - Properly formatted course code
 */
function formatCourseCode(courseCode) {
  return courseCode
    .replace(/\s/g, "")
    .split(/([a-zA-Z]+)/)
    .join(" ")
    .toUpperCase()
    .trim();
}

const getTotalEnrolled = async (course) => {
  const dbase = require("../utils/connectDB");
  const db = await dbase();

  try {
    const data = await db.read();
    const users = data.users.filter((user) => user.courses.includes(course));
    return users.length;
  } finally {
    db.close();
  }
};

const getMarkedToday = async (course) => {
  const dbase = require("../utils/connectAttendanceDB");
  const db = await dbase();

  try {
    const data = await db.read();
    const day = new Date().getDate();
    const month = new Date().getMonth();
    const year = new Date().getFullYear();

    // Flatten all attendance records
    let totalAttend = [];
    data.attendance.forEach((record) => {
      totalAttend = [...totalAttend, ...record.attendance];
    });

    return totalAttend.filter(
      (item) =>
        item.month === month &&
        item.day === day &&
        item.year === year &&
        item.course === course
    ).length;
  } finally {
    db.close();
  }
};

const getEachDayStats = async (course) => {
  const dbase = require("../utils/connectAttendanceDB");
  const db = await dbase();

  try {
    const data = await db.read();
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    const weekDays = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    // Flatten all attendance records
    let totalAttend = [];
    data.attendance.forEach((record) => {
      totalAttend = [...totalAttend, ...record.attendance];
    });

    let eachDay = [];
    for (let i = 0; i < 7; i++) {
      let currentDayNumberLength = totalAttend.filter(
        (item) =>
          item.month === month &&
          new Date(`${item.year}-${item.month + 1}-${item.day}`).getDay() ===
            i &&
          item.year === year &&
          item.course === course
      ).length;
      let today = { day: weekDays[i], attendance: currentDayNumberLength };
      eachDay.push(today);
    }
    return eachDay;
  } finally {
    db.close();
  }
};

const getTimeStats = async (course) => {
  const dbase = require("../utils/connectAttendanceDB");
  const db = await dbase();

  try {
    const data = await db.read();
    const month = new Date().getMonth();
    const year = new Date().getFullYear();

    // Flatten all attendance records
    let totalAttend = [];
    data.attendance.forEach((record) => {
      totalAttend = [...totalAttend, ...record.attendance];
    });

    let time = [];
    for (let i = 0; i < 24; i++) {
      let currentTimeNumberLength = totalAttend.filter(
        (item) =>
          item.month === month &&
          item.time.split(":")[0] == i &&
          item.year === year &&
          item.course === course
      ).length;
      let hours = {
        name: `${_24to12(`${i}:0`)} - ${_24to12(
          `${(i < 23 && `${i + 1}:0`) || "0:0"}`
        )}`,
        attendance: currentTimeNumberLength,
      };
      time.push(hours);
    }
    return time;
  } finally {
    db.close();
  }
};

const getTotalCount = async (course) => {
  const courseAttendanceDbase = require("../utils/connectCourseAttendanceDB");
  const db = await courseAttendanceDbase();

  try {
    const courseRecord = await db.getCourseAttendanceByName(course);

    if (!courseRecord) {
      return 0;
    }

    // The total count is simply the length of the attendance array
    // This represents the number of days attendance was taken
    return courseRecord.attendance.length;
  } finally {
    db.close();
  }
};

const getDefaulters = async (course) => {
  let defaulter = [];
  const userDbase = require("../utils/connectDB");
  const dbase = require("../utils/connectAttendanceDB");

  try {
    let courseCount = await getTotalCount(course);

    const db = await dbase();
    const attendanceData = await db.read();

    const userDb = await userDbase();
    const userData = await userDb.read();

    const users = userData.users.filter((item) =>
      item.courses.includes(course)
    );

    for (const user of users) {
      const studentAttendance = attendanceData.attendance.find(
        (a) => a.student_id === user.id
      );

      if (studentAttendance) {
        const courseAttendance = studentAttendance.attendance.filter(
          (a) => a.course === course
        ).length;

        const percentage = (courseAttendance / courseCount) * 100;

        if (percentage < 75) {
          defaulter.push({
            name: user.name,
            matric: user.matric,
            department: user.department,
            percentage,
          });
        }
      }
    }

    return defaulter;
  } finally {
    // Close all database connections
    const userDb = await userDbase();
    const db = await dbase();

    userDb.close();
    db.close();
  }
};

/**
 * Generate a comprehensive attendance report for a course
 * @param {string} course - The course code
 * @returns {Promise<Object>} - Detailed attendance report
 */
const generateReport = async (course) => {
  try {
    // Format course code to ensure consistency
    const formattedCourse = formatCourseCode(course);
    console.log(`Generating comprehensive report for ${formattedCourse}`);

    // Use the existing report generator
    const report = await generateCourseAttendanceReport(formattedCourse);

    return {
      success: true,
      report,
    };
  } catch (error) {
    console.error(`Error generating report for ${course}:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Generate attendance reports for multiple courses
 * @param {Array<string>} courses - Array of course codes
 * @returns {Promise<Object>} - Reports for each course
 */
const generateMultiReport = async (courses) => {
  try {
    // Format course codes
    const formattedCourses = courses.map((course) => formatCourseCode(course));
    console.log(`Generating reports for ${formattedCourses.length} courses`);

    // Use the existing multi-course report generator
    const reports = await generateMultiCourseReport(formattedCourses);

    return {
      success: true,
      reports,
    };
  } catch (error) {
    console.error("Error generating multiple reports:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Generate and return a detailed Excel-ready attendance report for a course
 */
const courseReport = async (event, course) => {
  try {
    console.log(`Processing course report request for: ${course}`);
    const reportResult = await generateReport(course);
    console.log("Report generated, sending response");
    return event.sender.send("course-report-res", reportResult);
  } catch (error) {
    console.error(`Error in courseReport function: ${error.message}`);
    return event.sender.send("course-report-res", {
      success: false,
      error: error.message || "Unknown error generating report",
    });
  }
};

/**
 * Generate reports for all courses a lecturer teaches
 */
const lecturerReports = async (event, courses) => {
  const reports = await generateMultiReport(courses);
  return event.sender.send("lecturer-reports-res", reports);
};

const stats = async (event, course) => {
  console.log(course);
  const totalEnrolled = await getTotalEnrolled(course);
  const markedToday = await getMarkedToday(course);
  const weekStats = await getEachDayStats(course);
  const timeStats = await getTimeStats(course);
  const courseCount = await getTotalCount(course);
  const defaulters = await getDefaulters(course);

  return event.sender.send("stats-res", {
    totalEnrolled,
    markedToday,
    weekStats,
    timeStats,
    courseCount,
    defaulters,
  });
};

module.exports = {
  stats,
  courseReport,
  lecturerReports,
  generateReport,
  generateMultiReport,
};

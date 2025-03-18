const fs = require("fs");
const path = require("path");
const connectDB = require("../utils/connectDB");
const connectAttendanceDB = require("../utils/connectAttendanceDB");
const connectCourseDB = require("../utils/connectCourseDB");
const connectCourseAttendanceDB = require("../utils/connectCourseAttendanceDB");

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

/**
 * Validates and formats a date from attendance record format
 * @param {Object} entry - Attendance entry with day, month, year, time fields
 * @returns {Object|null} - Formatted date object or null if invalid
 */
function validateAndFormatDate(entry) {
  try {
    if (!entry || !entry.day || !entry.month || !entry.year) return null;

    // Parse components from the attendance entry
    const day = parseInt(entry.day, 10);
    const month = parseInt(entry.month, 10) - 1; // JS months are 0-indexed
    const year = parseInt(entry.year, 10);

    // Parse time if available
    let hours = 0,
      minutes = 0;
    if (entry.time && typeof entry.time === "string") {
      const timeParts = entry.time.split(":");
      if (timeParts.length >= 2) {
        hours = parseInt(timeParts[0], 10) || 0;
        minutes = parseInt(timeParts[1], 10) || 0;
      }
    }

    // Create date object
    const date = new Date(year, month, day, hours, minutes);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }

    // Format date for report
    const isoString = date.toISOString();
    return {
      date: isoString.split("T")[0], // YYYY-MM-DD
      time: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
        2,
        "0"
      )}`,
      timestamp: isoString,
      fullDate: date,
      // Include original components for reference
      originalFormat: {
        day,
        month: month + 1, // Convert back to 1-indexed for display
        year,
        time: entry.time,
      },
    };
  } catch (error) {
    console.warn(`Invalid date in entry:`, entry, error.message);
    return null;
  }
}

/**
 * Gets the total attendance count for a course from the course attendance database
 * @param {string} course - The formatted course code
 * @returns {Promise<number>} - Total number of attendance days recorded
 */
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

/**
 * Generates attendance report for a specific course
 * @param {string} rawCourseCode - The code of the course to generate report for
 * @returns {Promise<Object>} - Report data ready for Excel export
 */
async function generateCourseAttendanceReport(rawCourseCode) {
  // Format course code to ensure consistency
  const courseCode = formatCourseCode(rawCourseCode);

  const db = await connectDB();
  const attendanceDB = await connectAttendanceDB();
  const courseDB = await connectCourseDB();

  try {
    // Get course details
    const course = await courseDB.getCourseByCode(courseCode);
    if (!course) {
      throw new Error(`Course ${courseCode} not found`);
    }

    console.log(
      `Generating report for course: ${courseCode} (ID: ${course.id})`
    );

    // Step 1: Get all students enrolled in this course from database.db
    console.log("Fetching enrolled students...");
    const usersData = await db.read();
    const enrolledStudents = usersData.users.filter(
      (user) =>
        user.courses &&
        user.courses.some((c) => formatCourseCode(c) === courseCode)
    );
    console.log(`Found ${enrolledStudents.length} enrolled students`);

    // Step 2: Get all attendance data
    console.log("Fetching attendance records...");
    const allAttendanceData = await attendanceDB.read();

    // Get the official total attendance count for this course
    console.log("Getting total attendance count from course database...");
    const uniqueSessionCount = await getTotalCount(courseCode);
    console.log(`Found ${uniqueSessionCount} official attendance sessions`);

    // Count total attendance entries for this course across all students
    let totalCourseEntries = 0;

    // Create a map of unique attendance dates to track sessions
    const sessionDatesMap = new Map();

    // Process all attendance records
    allAttendanceData.attendance.forEach((record) => {
      if (record.attendance) {
        // Filter for this specific course based on course field
        const courseAttendances = record.attendance.filter(
          (entry) => formatCourseCode(entry.course) === courseCode
        );

        totalCourseEntries += courseAttendances.length;

        // Track unique dates for session counting
        courseAttendances.forEach((entry) => {
          const dateInfo = validateAndFormatDate(entry);
          if (dateInfo) {
            const dateKey = `${entry.year}-${String(entry.month).padStart(
              2,
              "0"
            )}-${String(entry.day).padStart(2, "0")}`;
            if (!sessionDatesMap.has(dateKey)) {
              sessionDatesMap.set(dateKey, new Set());
            }
            sessionDatesMap.get(dateKey).add(record.student_id);
          }
        });
      }
    });

    // Convert session dates map to array
    const sessionDates = Array.from(sessionDatesMap.entries())
      .map(([date, students]) => ({
        date,
        studentCount: students.size,
      }))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    // Use uniqueSessionCount from getTotalCount, or default to 1 if not found
    const officialSessionCount = uniqueSessionCount || 1;

    console.log(
      `Found ${totalCourseEntries} total attendance entries for course ${courseCode}`
    );

    // Step 4: Generate report for each student
    console.log("Generating individual student reports...");
    const reportData = await Promise.all(
      enrolledStudents.map(async (student) => {
        console.log(`Processing student: ${student.name} (${student.matric})`);
        // Get student's attendance records
        const attendanceRecord = await attendanceDB.getStudentAttendance(
          student.id
        );

        // Calculate attendance statistics
        let attendanceCount = 0;
        let attendancePerDay = new Map(); // To count entries per day
        let attendanceDetails = [];

        if (attendanceRecord && attendanceRecord.attendance) {
          // Filter attendance entries for this course - each entry represents one attendance mark
          const courseAttendance = attendanceRecord.attendance.filter(
            (entry) => formatCourseCode(entry.course) === courseCode
          );

          // Count raw attendance entries (each array entry counts as one attendance)
          attendanceCount = courseAttendance.length;

          // Process each attendance record
          courseAttendance.forEach((entry) => {
            const dateKey = `${entry.year}-${String(entry.month).padStart(
              2,
              "0"
            )}-${String(entry.day).padStart(2, "0")}`;
            const timeString = entry.time || "00:00";

            // Count entries per day
            if (!attendancePerDay.has(dateKey)) {
              attendancePerDay.set(dateKey, 0);
            }
            attendancePerDay.set(dateKey, attendancePerDay.get(dateKey) + 1);

            // Build attendance detail
            attendanceDetails.push({
              date: dateKey,
              time: timeString,
              day: entry.day,
              month: entry.month,
              year: entry.year,
              course: entry.course,
            });
          });

          // Sort dates chronologically
          attendanceDetails.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            if (a.month !== b.month) return a.month - b.month;
            if (a.day !== b.day) return a.day - b.day;
            return String(a.time).localeCompare(String(b.time));
          });
        }

        // Calculate attendance rate based on official session count
        const daysAttended = attendancePerDay.size;
        const attendanceRate = (daysAttended / officialSessionCount) * 100;

        // Prepare student report row
        return {
          studentId: student.id,
          matricNumber: student.matric,
          name: student.name,
          department: student.department,
          courseCode: courseCode,
          uniqueSessions: officialSessionCount,
          totalAttendanceCount: attendanceCount,
          daysAttended: daysAttended,
          attendanceRateByDay: parseFloat(attendanceRate.toFixed(2)),
          attendancePerDay: Array.from(attendancePerDay.entries())
            .map(([date, count]) => ({
              date,
              count,
            }))
            .sort((a, b) => String(a.date).localeCompare(String(b.date))),
          attendanceDetails: attendanceDetails,
          lastAttendance:
            attendanceDetails.length > 0
              ? attendanceDetails[attendanceDetails.length - 1]
              : { date: "Never attended", time: "" },
        };
      })
    );

    // Step 5: Calculate summary statistics
    const averageAttendanceRate =
      reportData.length > 0
        ? reportData.reduce(
            (sum, student) => sum + student.attendanceRateByDay,
            0
          ) / reportData.length
        : 0;

    const reportSummary = {
      courseCode: courseCode,
      courseName: course.name || courseCode,
      totalStudents: enrolledStudents.length,
      uniqueSessions: officialSessionCount,
      totalAttendanceEntries: totalCourseEntries,
      sessionDates: sessionDates,
      averageAttendanceRate: parseFloat(averageAttendanceRate.toFixed(2)),
      generatedDate: new Date().toISOString(),
    };

    console.log("Report generation completed successfully");

    // Close database connections
    await db.close();
    await attendanceDB.close();
    await courseDB.close();

    return {
      summary: reportSummary,
      studentRecords: reportData,
    };
  } catch (error) {
    console.error("Error generating attendance report:", error);

    // Close database connections even if there's an error
    await db.close();
    await attendanceDB.close();
    await courseDB.close();

    throw error;
  }
}

/**
 * Generates attendance report for multiple courses
 * @param {Array<string>} courseCodes - Array of course codes to generate reports for
 * @returns {Promise<Object>} - Object with reports for each course
 */
async function generateMultiCourseReport(courseCodes) {
  const reports = {};

  for (const courseCode of courseCodes) {
    try {
      reports[courseCode] = await generateCourseAttendanceReport(courseCode);
    } catch (error) {
      console.error(
        `Failed to generate report for ${courseCode}:`,
        error.message
      );
      reports[courseCode] = {
        error: true,
        message: error.message,
        summary: {
          courseCode,
          totalStudents: 0,
          totalSessions: 0,
          sessionDates: [],
          averageAttendanceRate: 0,
          generatedDate: new Date().toISOString(),
        },
        studentRecords: [],
      };
    }
  }

  return reports;
}

module.exports = {
  generateCourseAttendanceReport,
  generateMultiCourseReport,
};

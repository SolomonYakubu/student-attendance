const connectCourseDB = require("./utils/connectCourseDB");
const {
  generateCourseAttendanceReport,
  generateMultiCourseReport,
} = require("./services/generateReport");

/**
 * Format course code to standardized format (ex: "cpe121" → "CPE 121")
 * @param {string} courseCode - The raw course code
 * @returns {string} - Properly formatted course code
 */
function formatCourseCode(courseCode) {
  return courseCode
    .replace(/\s/g, "") // Remove all whitespace
    .split(/([a-zA-Z]+)/) // Split by letter groups, keeping the letters
    .join(" ") // Join with spaces
    .toUpperCase() // Convert to uppercase
    .trim(); // Remove trailing/leading whitespace
}

async function runTest() {
  try {
    // Course code to test - ensure it's properly formatted
    let rawCourseCode = "CPE 121"; // User input could be in any format
    const courseCode = formatCourseCode(rawCourseCode);
    console.log(`Formatted course code: ${rawCourseCode} → ${courseCode}`);

    // First, ensure the course exists in the database
    const courseDB = await connectCourseDB();
    let course = await courseDB.getCourseByCode(courseCode);

    if (!course) {
      console.log(`Course ${courseCode} doesn't exist. Creating it...`);
      const courseId = await courseDB.createCourse(courseCode);
      console.log(`Created course with ID: ${courseId}`);

      // Verify course was created
      course = await courseDB.getCourseByCode(courseCode);
      if (!course) {
        throw new Error(`Failed to create course ${courseCode}`);
      }
    } else {
      console.log(`Course ${courseCode} exists with ID: ${course.id}`);
    }

    await courseDB.close();

    // Now generate the report
    console.log(`Generating report for ${courseCode}...`);
    const report = await generateCourseAttendanceReport(courseCode);
    console.log("Report generated successfully:");
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the test
runTest();

const XLSX = require("xlsx");
const path = require("path");
const { app, dialog } = require("electron");

/**
 * Generate and export an Excel report for course attendance
 * @param {Object} options Options object
 * @param {Object} options.event - The Electron event object
 * @param {string} options.courseCode - The course code
 * @param {Object} options.reportData - The report data
 * @returns {Promise<void>}
 */
async function exportAttendanceToExcel({ event, courseCode, reportData }) {
  try {
    // Create workbook with properties
    const workbook = XLSX.utils.book_new();
    workbook.Props = {
      Title: `${courseCode} Attendance Report`,
      Subject: "Student Attendance",
      Author: "Biometric Attendance System",
      CreatedDate: new Date(),
    };

    // Define color schemes
    const colors = {
      headerBackground: "4472C4", // Blue
      headerText: "FFFFFF", // White
      subHeaderBackground: "8EA9DB", // Light blue
      subHeaderText: "FFFFFF", // White
      borderColor: "B4C6E7", // Light blue border
      present: "C6EFCE", // Light green
      presentText: "006100", // Dark green
      absent: "FFC7CE", // Light red
      absentText: "9C0006", // Dark red
      multiplePresent: "92D050", // Darker green
      altRow: "EDF2F9", // Very light blue for alternating rows
      defaultText: "000000", // Black text
    };

    // Add sheets to workbook
    addSummarySheet(workbook, reportData, colors);
    addStudentsSheet(workbook, reportData, colors);
    addAttendanceMatrixSheet(workbook, reportData, colors);
    addIndividualStudentSheets(workbook, reportData, colors);

    // Show save dialog
    const { filePath } = await dialog.showSaveDialog({
      title: `Save ${courseCode} Attendance Report`,
      defaultPath: path.join(
        app.getPath("documents"),
        `${courseCode}_Attendance_Report.xlsx`
      ),
      filters: [{ name: "Excel Files", extensions: ["xlsx"] }],
    });

    if (filePath) {
      // Write the workbook to disk
      XLSX.writeFile(workbook, filePath);

      // Notify renderer that export is complete
      event.sender.send("export-excel-complete", {
        success: true,
        message: `Report saved to ${filePath}`,
      });
    }
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    event.sender.send("export-excel-complete", {
      success: false,
      error: error.message,
    });
  }
}

/**
 * Add summary sheet to workbook
 * @param {Object} workbook - XLSX workbook
 * @param {Object} reportData - Report data
 * @param {Object} colors - Color scheme
 */
function addSummarySheet(workbook, reportData, colors) {
  // Create summary worksheet
  const summaryData = [
    ["Course Attendance Report"], // Title row
    [],
    ["Course Code:", reportData.summary.courseCode],
    ["Course Name:", reportData.summary.courseName || ""],
    [
      "Generated Date:",
      new Date(reportData.summary.generatedDate).toLocaleString(),
    ],
    ["Total Students:", reportData.summary.totalStudents],
    ["Total Sessions:", reportData.summary.uniqueSessions],
    ["Total Attendance Entries:", reportData.summary.totalAttendanceEntries],
    [
      "Average Attendance Rate:",
      `${reportData.summary.averageAttendanceRate}%`,
    ],
    [],
    ["Session Dates:"],
    ["Date", "Student Count"],
  ];

  // Add session dates to summary
  reportData.summary.sessionDates.forEach((session) => {
    summaryData.push([session.date, session.studentCount]);
  });

  // Create summary sheet
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  // Style summary sheet
  summarySheet["!cols"] = [{ wch: 25 }, { wch: 35 }]; // Set column width

  // Title cell
  summarySheet.A1.s = {
    font: { bold: true, sz: 16, color: { rgb: colors.headerText } },
    fill: { fgColor: { rgb: colors.headerBackground } },
    alignment: { horizontal: "center", vertical: "center" },
  };

  summarySheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }]; // Merge title cells

  // Style headers
  for (let i = 2; i <= 8; i++) {
    const cell1 = XLSX.utils.encode_cell({ r: i, c: 0 });
    const cell2 = XLSX.utils.encode_cell({ r: i, c: 1 });
    summarySheet[cell1].s = {
      font: { bold: true, color: { rgb: colors.defaultText } },
      alignment: { horizontal: "right" },
    };
    summarySheet[cell2].s = {
      font: { color: { rgb: colors.defaultText } },
      alignment: { horizontal: "left" },
    };
  }

  // Session dates header
  const sessionHeaderCell = XLSX.utils.encode_cell({ r: 10, c: 0 });
  summarySheet[sessionHeaderCell].s = {
    font: { bold: true, color: { rgb: colors.headerText } },
    fill: { fgColor: { rgb: colors.headerBackground } },
    alignment: { horizontal: "left" },
  };

  // Session table headers
  const dateHeader = XLSX.utils.encode_cell({ r: 11, c: 0 });
  const countHeader = XLSX.utils.encode_cell({ r: 11, c: 1 });
  summarySheet[dateHeader].s = summarySheet[countHeader].s = {
    font: { bold: true, color: { rgb: colors.headerText } },
    fill: { fgColor: { rgb: colors.subHeaderBackground } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: colors.borderColor } },
      bottom: { style: "thin", color: { rgb: colors.borderColor } },
      left: { style: "thin", color: { rgb: colors.borderColor } },
      right: { style: "thin", color: { rgb: colors.borderColor } },
    },
  };

  // Style session data cells
  for (let i = 0; i < reportData.summary.sessionDates.length; i++) {
    const r = i + 12; // Start from row 12
    const dateCell = XLSX.utils.encode_cell({ r, c: 0 });
    const countCell = XLSX.utils.encode_cell({ r, c: 1 });

    const fillColor = i % 2 === 0 ? "FFFFFF" : colors.altRow;

    summarySheet[dateCell].s = summarySheet[countCell].s = {
      fill: { fgColor: { rgb: fillColor } },
      alignment: { horizontal: "center" },
      border: {
        top: { style: "thin", color: { rgb: colors.borderColor } },
        bottom: { style: "thin", color: { rgb: colors.borderColor } },
        left: { style: "thin", color: { rgb: colors.borderColor } },
        right: { style: "thin", color: { rgb: colors.borderColor } },
      },
    };
  }

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
}

/**
 * Add students sheet to workbook
 * @param {Object} workbook - XLSX workbook
 * @param {Object} reportData - Report data
 * @param {Object} colors - Color scheme
 */
function addStudentsSheet(workbook, reportData, colors) {
  const studentHeaders = [
    "Matric Number",
    "Name",
    "Department",
    "Total Attendance",
    "Days Attended",
    "Attendance Rate (%)",
    "Last Attendance",
  ];

  const studentData = [studentHeaders];

  // Add student rows
  reportData.studentRecords.forEach((student) => {
    const lastAttendance =
      student.lastAttendance.date === "Never attended"
        ? "Never attended"
        : `${student.lastAttendance.date} ${student.lastAttendance.time}`;

    studentData.push([
      student.matricNumber,
      student.name,
      student.department,
      student.totalAttendanceCount,
      student.daysAttended,
      student.attendanceRateByDay,
      lastAttendance,
    ]);
  });

  const studentSheet = XLSX.utils.aoa_to_sheet(studentData);

  // Set column widths
  studentSheet["!cols"] = [
    { wch: 15 }, // Matric
    { wch: 30 }, // Name
    { wch: 20 }, // Department
    { wch: 15 }, // Total
    { wch: 15 }, // Days
    { wch: 16 }, // Rate
    { wch: 25 }, // Last
  ];

  // Style headers
  const studentHeaderRow = 0;
  for (let c = 0; c < studentHeaders.length; c++) {
    const cell = XLSX.utils.encode_cell({ r: studentHeaderRow, c });
    studentSheet[cell].s = {
      font: { bold: true, color: { rgb: colors.headerText } },
      fill: { fgColor: { rgb: colors.headerBackground } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: colors.borderColor } },
        bottom: { style: "thin", color: { rgb: colors.borderColor } },
        left: { style: "thin", color: { rgb: colors.borderColor } },
        right: { style: "thin", color: { rgb: colors.borderColor } },
      },
    };
  }

  // Style data rows
  for (let r = 1; r < studentData.length; r++) {
    for (let c = 0; c < studentHeaders.length; c++) {
      const cell = XLSX.utils.encode_cell({ r, c });
      if (!studentSheet[cell]) continue;

      // Set fill color for alternating rows
      const fillColor = r % 2 === 0 ? colors.altRow : "FFFFFF";

      // Special formatting for attendance rate
      let format = undefined;
      if (c === 5) {
        // Attendance rate column
        format = "0.00%"; // Format as percentage

        // Color code attendance rate
        const rate = studentSheet[cell].v / 100; // Convert to decimal
        if (rate < 0.5) {
          studentSheet[cell].s = {
            font: { color: { rgb: colors.absentText }, bold: true },
            fill: { fgColor: { rgb: colors.absent } },
            alignment: { horizontal: "center" },
            format,
          };
          continue;
        } else if (rate < 0.75) {
          studentSheet[cell].s = {
            font: { color: { rgb: "9C5700" } }, // Orange text for warning
            fill: { fgColor: { rgb: "FFEB9C" } }, // Light orange
            alignment: { horizontal: "center" },
            format,
          };
          continue;
        }
      }

      const horizontalAlign = c >= 3 && c <= 5 ? "center" : "left"; // Numbers centered

      studentSheet[cell].s = {
        fill: { fgColor: { rgb: fillColor } },
        alignment: { horizontal: horizontalAlign },
        border: {
          top: { style: "thin", color: { rgb: colors.borderColor } },
          bottom: { style: "thin", color: { rgb: colors.borderColor } },
          left: { style: "thin", color: { rgb: colors.borderColor } },
          right: { style: "thin", color: { rgb: colors.borderColor } },
        },
        format,
      };
    }
  }

  // Freeze the header row
  studentSheet["!freeze"] = { xSplit: 0, ySplit: 1 };

  XLSX.utils.book_append_sheet(workbook, studentSheet, "Students");
}

/**
 * Add attendance matrix sheet to workbook
 * @param {Object} workbook - XLSX workbook
 * @param {Object} reportData - Report data
 * @param {Object} colors - Color scheme
 */
function addAttendanceMatrixSheet(workbook, reportData, colors) {
  // Get all unique session dates from the report
  const sessionDates = reportData.summary.sessionDates
    .map((s) => s.date)
    .sort();

  // Create fixed columns for student info
  const studentAttendanceHeaders = [
    "Matric Number",
    "Name",
    "Department",
    "Total",
    "Days",
    "Rate (%)",
  ];

  // Add date columns (formatted for better readability)
  const formattedDates = sessionDates.map((date) => {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });

  const fullHeaders = [...studentAttendanceHeaders, ...formattedDates];
  const studentAttendanceData = [fullHeaders];

  // Add one row per student
  reportData.studentRecords.forEach((student) => {
    const row = [
      student.matricNumber,
      student.name,
      student.department,
      student.totalAttendanceCount,
      student.daysAttended,
      student.attendanceRateByDay,
    ];

    // Create a map of the dates this student attended
    const attendanceDatesMap = {};
    student.attendancePerDay.forEach((day) => {
      attendanceDatesMap[day.date] = day.count;
    });

    // For each session date, add the attendance value
    sessionDates.forEach((date) => {
      const count = attendanceDatesMap[date] || 0;
      row.push(count > 0 ? "Present" : "Absent");
    });

    studentAttendanceData.push(row);
  });

  // Create the sheet
  const matrixSheet = XLSX.utils.aoa_to_sheet(studentAttendanceData);

  // Set column widths
  const matrixCols = [
    { wch: 15 }, // Matric
    { wch: 25 }, // Name
    { wch: 15 }, // Department
    { wch: 8 }, // Total
    { wch: 8 }, // Days
    { wch: 8 }, // Rate
  ];

  // Add date columns with uniform width
  for (let i = 0; i < sessionDates.length; i++) {
    matrixCols.push({ wch: 10 });
  }

  matrixSheet["!cols"] = matrixCols;

  // Style the headers
  for (let C = 0; C < fullHeaders.length; C++) {
    const cell = XLSX.utils.encode_cell({ r: 0, c: C });

    // Different style for date headers
    const isDateColumn = C >= studentAttendanceHeaders.length;
    const bgColor = isDateColumn ? "5B9BD5" : colors.headerBackground;

    matrixSheet[cell].s = {
      font: { bold: true, color: { rgb: colors.headerText } },
      fill: { fgColor: { rgb: bgColor } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: colors.borderColor } },
        bottom: { style: "thin", color: { rgb: colors.borderColor } },
        left: { style: "thin", color: { rgb: colors.borderColor } },
        right: { style: "thin", color: { rgb: colors.borderColor } },
      },
    };

    // Add tooltips for date headers (full date)
    if (isDateColumn) {
      const dateIndex = C - studentAttendanceHeaders.length;
      matrixSheet[cell].c = [
        {
          a: "Attendance System", // Author name
          t: sessionDates[dateIndex], // Full date as tooltip
          r: "<t>" + sessionDates[dateIndex] + "</t>", // HTML representation
        },
      ];
    }
  }

  // Style data cells
  for (let R = 1; R < studentAttendanceData.length; R++) {
    // Alternating row background
    const rowBg = R % 2 === 0 ? colors.altRow : "FFFFFF";

    for (let C = 0; C < fullHeaders.length; C++) {
      const cell = XLSX.utils.encode_cell({ r: R, c: C });
      if (!matrixSheet[cell]) continue;

      // Style based on column type
      if (C < 6) {
        // Student info columns
        const horizontalAlign = C >= 3 ? "center" : "left"; // Numbers centered

        matrixSheet[cell].s = {
          fill: { fgColor: { rgb: rowBg } },
          alignment: { horizontal: horizontalAlign },
          border: {
            top: { style: "thin", color: { rgb: colors.borderColor } },
            bottom: { style: "thin", color: { rgb: colors.borderColor } },
            left: { style: "thin", color: { rgb: colors.borderColor } },
            right: { style: "thin", color: { rgb: colors.borderColor } },
          },
        };
      } else {
        // Attendance status columns
        const value = matrixSheet[cell].v;
        let fillColor, textColor;

        if (value === "Present") {
          fillColor = colors.present;
          textColor = colors.presentText;
        } else {
          fillColor = colors.absent;
          textColor = colors.absentText;
        }

        matrixSheet[cell].s = {
          font: { bold: true, color: { rgb: textColor } },
          fill: { fgColor: { rgb: fillColor } },
          alignment: { horizontal: "center" },
          border: {
            top: { style: "thin", color: { rgb: colors.borderColor } },
            bottom: { style: "thin", color: { rgb: colors.borderColor } },
            left: { style: "thin", color: { rgb: colors.borderColor } },
            right: { style: "thin", color: { rgb: colors.borderColor } },
          },
        };
      }
    }
  }

  // Freeze panes at A1
  matrixSheet["!freeze"] = { xSplit: 2, ySplit: 1 };

  XLSX.utils.book_append_sheet(workbook, matrixSheet, "Attendance Matrix");
}

/**
 * Add individual student sheets to workbook
 * @param {Object} workbook - XLSX workbook
 * @param {Object} reportData - Report data
 * @param {Object} colors - Color scheme
 */
function addIndividualStudentSheets(workbook, reportData, colors) {
  reportData.studentRecords.forEach((student) => {
    if (student.attendanceDetails.length > 0) {
      // Create a title section
      const studentTitle = [
        [`Attendance Records for: ${student.name}`],
        [`Matric Number: ${student.matricNumber}`],
        [`Department: ${student.department}`],
        [`Attendance Rate: ${student.attendanceRateByDay}%`],
        [],
        ["Date", "Time", "Course"],
      ];

      const detailData = student.attendanceDetails.map((detail) => [
        detail.date,
        detail.time,
        detail.course,
      ]);

      // Combine title and data
      const completeData = [...studentTitle, ...detailData];

      const detailSheet = XLSX.utils.aoa_to_sheet(completeData);

      // Set column widths
      detailSheet["!cols"] = [
        { wch: 15 }, // Date
        { wch: 10 }, // Time
        { wch: 15 }, // Course
      ];

      // Style title section
      for (let r = 0; r < 4; r++) {
        const cell = XLSX.utils.encode_cell({ r, c: 0 });
        detailSheet[cell].s = {
          font: { bold: r === 0, sz: r === 0 ? 14 : 11 },
          alignment: { horizontal: "left" },
        };
      }

      // Style headers
      for (let c = 0; c < 3; c++) {
        const cell = XLSX.utils.encode_cell({ r: 5, c });
        detailSheet[cell].s = {
          font: { bold: true, color: { rgb: colors.headerText } },
          fill: { fgColor: { rgb: colors.headerBackground } },
          alignment: { horizontal: "center" },
          border: {
            top: { style: "thin", color: { rgb: colors.borderColor } },
            bottom: { style: "thin", color: { rgb: colors.borderColor } },
            left: { style: "thin", color: { rgb: colors.borderColor } },
            right: { style: "thin", color: { rgb: colors.borderColor } },
          },
        };
      }

      // Style data rows
      for (let r = 6; r < completeData.length; r++) {
        const fillColor = (r - 6) % 2 === 0 ? colors.altRow : "FFFFFF";

        for (let c = 0; c < 3; c++) {
          const cell = XLSX.utils.encode_cell({ r, c });
          if (!detailSheet[cell]) continue;

          detailSheet[cell].s = {
            fill: { fgColor: { rgb: fillColor } },
            alignment: { horizontal: "center" },
            border: {
              top: { style: "thin", color: { rgb: colors.borderColor } },
              bottom: { style: "thin", color: { rgb: colors.borderColor } },
              left: { style: "thin", color: { rgb: colors.borderColor } },
              right: { style: "thin", color: { rgb: colors.borderColor } },
            },
          };
        }
      }

      const sheetName = (student.matricNumber || student.name)
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 20);

      XLSX.utils.book_append_sheet(workbook, detailSheet, sheetName);
    }
  });
}

// Fix: Using standard method of CommonJS exports
module.exports = {
  exportAttendanceToExcel: exportAttendanceToExcel,
};

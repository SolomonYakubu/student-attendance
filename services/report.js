const getProfile = async (_id) => {
  const connectDB = require("../utils/connectDB");
  const db = await connectDB();
  const user = await db.getUser(_id);
  return user;
};

const getMonthAttendance = async (_id, course) => {
  const connectAttendanceDB = require("../utils/connectAttendanceDB");
  const db = await connectAttendanceDB();

  const month = new Date().getMonth();
  const year = new Date().getFullYear();

  const attendanceRecord = await db.getStudentAttendance(_id);
  if (!attendanceRecord) return 0;

  const attend = attendanceRecord.attendance;
  return (
    attend.filter(
      (item) =>
        item.month === month && item.year === year && item.course === course
    ).length || 0
  );
};

const getTotalAttendance = async (_id, course) => {
  const connectAttendanceDB = require("../utils/connectAttendanceDB");
  const db = await connectAttendanceDB();

  const attendanceRecord = await db.getStudentAttendance(_id);
  if (!attendanceRecord) return 0;

  const attend = attendanceRecord.attendance.filter(
    (item) => item.course === course
  );

  return attend.length || 0;
};

const getEachDayStats = async (_id, course) => {
  const connectAttendanceDB = require("../utils/connectAttendanceDB");
  const db = await connectAttendanceDB();

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

  const attendanceRecord = await db.getStudentAttendance(_id);
  if (!attendanceRecord) return weekDays.map((day) => ({ day, attendance: 0 }));

  const attend = attendanceRecord.attendance;

  let eachDay = [];
  for (let i = 0; i < 7; i++) {
    let currentDayNumberLength =
      attend.filter(
        (item) =>
          item.month === month &&
          new Date(`${item.year}/${item.month + 1}/${item.day}`).getDay() ===
            i &&
          item.year === year &&
          item.course === course
      ).length || 0;

    let today = { day: weekDays[i], attendance: currentDayNumberLength };
    eachDay.push(today);
  }
  return eachDay;
};

const getTimeStats = async (_id, course) => {
  const connectAttendanceDB = require("../utils/connectAttendanceDB");
  const { _24to12 } = require("../utils/formatTime");
  const db = await connectAttendanceDB();

  const month = new Date().getMonth();
  const year = new Date().getFullYear();

  const attendanceRecord = await db.getStudentAttendance(_id);
  if (!attendanceRecord)
    return Array(24)
      .fill()
      .map((_, i) => ({
        name: `${_24to12(`${i}:0`)} - ${_24to12(
          `${(i < 23 && `${i + 1}:0`) || "0:0"}`
        )}`,
        attendance: 0,
      }));

  const attend = attendanceRecord.attendance;

  let time = [];
  for (let i = 0; i < 24; i++) {
    let currentTimeNumberLength =
      attend.filter(
        (item) =>
          item.month === month &&
          item.time.split(":")[0] == i &&
          item.year === year &&
          item.course === course
      ).length || 0;

    let hours = {
      name: `${_24to12(`${i}:0`)} - ${_24to12(
        `${(i < 23 && `${i + 1}:0`) || "0:0"}`
      )}`,
      attendance: currentTimeNumberLength,
    };
    time.push(hours);
  }
  return time;
};

const getTotalCount = async (course) => {
  const courseAttendanceDbase = require("../utils/connectCourseAttendanceDB");
  const courseDb = await courseAttendanceDbase();

  const courseAttendance = await courseDb.getCourseAttendanceByName(course);
  console.log(courseAttendance.attendance.length);
  if (!courseAttendance) return 0;

  return courseAttendance.attendance.length || 0;
};

const report = async (event, arg) => {
  const connectDB = require("../utils/connectDB");
  const db = await connectDB();
  const { matric, course } = arg;
  console.log(matric, course);

  // Find user by matric
  const users = await db.read();
  const user = users.users.find((u) => u.matric === matric);
  if (!user) {
    return event.sender.send("report-res", { error: "User not found" });
  }

  const _id = user.id;
  const profile = await getProfile(_id);
  const monthAttendance = await getMonthAttendance(_id, course);
  const totalAttendance = await getTotalAttendance(_id, course);
  const weekStats = await getEachDayStats(_id, course);
  const timeStats = await getTimeStats(_id, course);
  const courseCount = await getTotalCount(course);

  console.log(matric);
  return event.sender.send("report-res", {
    profile,
    monthAttendance,
    totalAttendance,
    weekStats,
    timeStats,
    courseCount,
  });
};

module.exports = {
  report,
};

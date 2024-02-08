const getTotalEnrolled = async (course) => {
  const dbase = require("../utils/connectDB");
  const lodash = require("lodash");
  const db = await dbase();

  // console.log(db);
  db.chain = lodash.chain(db.data);
  const users = db.chain
    .get("users")
    .value()
    .filter((item) => item.courses.includes(course));
  return users.length;
};

const getMarkedToday = async (course) => {
  const dbase = require("../utils/connectAttendanceDB");
  const lodash = require("lodash");
  const db = await dbase();
  db.chain = lodash.chain(db.data);
  const day = new Date().getDate();
  const month = new Date().getMonth();
  const year = new Date().getFullYear();

  const attend = db.chain
    .get("attendance")
    .value()
    .map((item) => item.attendance);
  let totalAttend = [];
  for (let i = 0; i < attend.length; i++) {
    totalAttend = [...totalAttend, ...attend[i]];
  }
  //   console.log(totalAttend);
  return totalAttend.filter(
    (item) =>
      item.month === month &&
      item.day === day &&
      item.year === year &&
      item.course === course
  )?.length;
};
const getEachDayStats = async (course) => {
  const dbase = require("../utils/connectAttendanceDB");

  const lodash = require("lodash");
  const db = await dbase();
  db.chain = lodash.chain(db.data);
  const day = new Date().getDate();
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
  const attend = db.chain
    .get("attendance")
    .value()
    .map((item) => item.attendance);
  let totalAttend = [];
  for (let i = 0; i < attend.length; i++) {
    totalAttend = [...totalAttend, ...attend[i]];
  }
  //   console.log(totalAttend);
  let eachDay = [];
  // console.log(`${year}-${month}-${day}`);
  for (let i = 0; i < 7; i++) {
    let currentDayNumberLength = totalAttend.filter(
      (item) =>
        item.month === month &&
        new Date(`${item.year}-${item.month + 1}-${item.day}`).getDay() === i &&
        item.year === year &&
        item.course === course
    )?.length;
    let today = { day: weekDays[i], attendance: currentDayNumberLength };
    eachDay.push(today);
  }
  return eachDay;
};

const getTimeStats = async (course) => {
  const dbase = require("../utils/connectAttendanceDB");

  const lodash = require("lodash");
  const db = await dbase();
  db.chain = lodash.chain(db.data);
  const day = new Date().getDay();
  const { _24to12 } = require("../utils/formatTime");

  const month = new Date().getMonth();
  const year = new Date().getFullYear();

  const attend = db.chain
    .get("attendance")
    .value()
    .map((item) => item.attendance);
  let totalAttend = [];
  for (let i = 0; i < attend.length; i++) {
    totalAttend = [...totalAttend, ...attend[i]];
  }
  //   console.log(totalAttend);
  let time = [];
  for (let i = 0; i < 24; i++) {
    let currentTimeNumberLength = totalAttend.filter(
      (item) =>
        item.month === month &&
        item.time.split(":")[0] == i &&
        item.year === year &&
        item.course === course
    )?.length;
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
  const lodash = require("lodash");
  const courseDb = await courseAttendanceDbase();
  courseDb.chain = lodash.chain(courseDb.data);
  let courseAttendance = courseDb.chain.get("courses").find({ course }).value();
  // console.log(courseAttendance);
  return courseAttendance.count;
};
const getDefaulters = async (course) => {
  let defaulter = [];
  const userDbase = require("../utils/connectDB");
  const dbase = require("../utils/connectAttendanceDB");

  const lodash = require("lodash");

  let courseCount = await getTotalCount(course);

  const db = await dbase();
  db.chain = lodash.chain(db.data);

  const userDb = await userDbase();
  userDb.chain = lodash.chain(userDb.data);
  const user = userDb.chain
    .get("users")
    .value()
    .filter((item) => item.courses.includes(course));
  user.map((item) => {
    const courseAttendance = db.chain
      .get("attendance")
      .find({ _id: item._id })
      .value()
      ?.attendance.filter((item) => item.course === course).length;

    const percentage = (courseAttendance / courseCount) * 100;
    console.log(courseCount, courseAttendance, percentage);
    if (percentage < 75) {
      defaulter = [
        ...defaulter,
        {
          name: item.name,
          matric: item.matric,
          department: item.department,
          percentage,
        },
      ];
    }
  });

  return defaulter;
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
};

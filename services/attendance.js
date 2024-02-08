const populate = async (_id, course) => {
  const dbase = require("../utils/connectAttendanceDB");
  const lodash = require("lodash");
  const userDbase = require("../utils/connectDB");
  const courseAttendanceDbase = require("../utils/connectCourseAttendanceDB");
  const { _24to12 } = require("../utils/formatTime");
  const db = await dbase();
  db.chain = lodash.chain(db.data);

  const day = new Date().getDate();
  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  const time = `${new Date().getHours()}:${new Date().getMinutes()}`;
  const data = {
    course,
    month,
    day,
    year,
    time,
    // signedOut: false,
    // signOutTime: null,
  };
  const userDb = await userDbase();
  userDb.chain = lodash.chain(userDb.data);
  const user = userDb.chain.get("users").find({ _id }).value();
  const courseDb = await courseAttendanceDbase();
  courseDb.chain = lodash.chain(courseDb.data);
  let courseAttendance = courseDb.chain.get("courses").find({ course }).value();

  if (!user.courses.includes(course)) {
    return {
      status: "No Course",
    };
  }
  const userExist = db.chain.get("attendance").find({ _id }).value();

  if (userExist) {
    const attend = db.chain.get("attendance").find({ _id }).value().attendance;
    const valid = attend.filter(
      (item) =>
        item.month === month &&
        item.day === day &&
        item.year === year &&
        item.course === course
    );

    if (valid[0]) {
      return {
        status: "duplicate",
      };
    }

    db.chain.get("attendance").find({ _id }).value().attendance.push(data);

    console.log(courseAttendance, "course attendance");
    if (courseAttendance) {
      if (
        !(
          courseAttendance.month === month &&
          courseAttendance.day === day &&
          courseAttendance.year === year
        )
      ) {
        courseAttendance = {
          course,
          day,
          month,
          year,
          count: courseAttendance.count++,
        };
        await courseDb.write();
      }
      await courseDb.write();
    } else {
      console.log("Got here");
      courseDb.data.courses.push({ course, day, month, year, count: 1 });
      await courseDb.write();
    }
    courseDb.write();

    db.write();
    return { status: "marked", time: _24to12(time) };
  } else {
    db.data.attendance.push({
      _id,

      attendance: [data],
    });
    if (courseAttendance) {
      if (
        !(
          courseAttendance.month === month &&
          courseAttendance.day === day &&
          courseAttendance.year === year
        )
      ) {
        courseAttendance = {
          course,
          day,
          month,
          year,
          count: courseAttendance.count++,
        };
        await courseDb.write();
      }
      await courseDb.write();
    } else {
      console.log("Got here");
      courseDb.data.courses.push({ course, day, month, year, count: 1 });
      await courseDb.write();
    }
    courseDb.write();
    db.write();
    return { status: "marked", time: _24to12(time) };
  }
};

module.exports = {
  populate,
};

const populate = async (_id, courseCode) => {
  const dbase = require("../utils/connectAttendanceDB");
  const lodash = require("lodash");

  const { _24to12 } = require("../utils/formatTime");
  const db = await dbase();
  db.chain = lodash.chain(db.data);

  const day = new Date().getDate();
  const month = new Date().getMonth();
  const year = new Date().getFullYear();

  const time = `${new Date().getHours()}:${new Date().getMinutes()}`;
  const data = {
    month,
    day,
    year,
    time,
    signedOut: false,
    signOutTime: null,
    courseCode,
  };
  const userExist = db.chain.get("attendance").find({ _id }).value();

  if (userExist) {
    const attend = db.chain.get("attendance").find({ _id }).value().attendance;
    const valid = attend.filter(
      (item) => item.month === month && item.day === day && item.year === year
    );
    console.log(valid);
    if (valid[0]) {
      return {
        status: "duplicate",
      };
    }
    db.chain.get("attendance").find({ _id }).value().attendance.push(data);
    db.write();
    return { status: "marked", time: _24to12(time) };
  } else {
    db.data.attendance.push({
      _id,
      attendance: [data],
    });
    db.write();
    return { status: "marked", time: _24to12(time) };
  }
};

module.exports = {
  populate,
};

const signOut = async (_id) => {
  const dbase = require("../utils/connectAttendanceDB");
  const lodash = require("lodash");

  const { _24to12 } = require("../utils/formatTime");
  const db = await dbase();
  db.chain = lodash.chain(db.data);

  const day = new Date().getDate();
  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  const time = `${new Date().getHours()}:${new Date().getMinutes()}`;
  const currentTime = new Date().getHours() * 60 + new Date().getMinutes();
  let attend;
  try {
    attend = db.chain.get("attendance")?.find({ _id })?.value().attendance;
  } catch (error) {
    return { status: "not signed" };
  }

  const exist = attend?.filter(
    (item) => item.month === month && item.day === day && item.year === year
  );

  if (exist[0]) {
    const num = attend.length;
    if (attend[num - 1].signedOut == true) {
      return { status: "duplicate" };
    }

    const signInTime =
      +attend[num - 1].time.split(":")[0] * 60 +
      +attend[num - 1].time.split(":")[1];
    console.log(currentTime - signInTime);
    if (currentTime - signInTime >= 1) {
      attend[num - 1].signedOut = true;
      attend[num - 1].signOutTime = time;
      console.log(attend[num - 1]);
      await db.write();
      return { status: "success", time: _24to12(time) };
    }
    return { status: "not yet" };
  }
  return { status: "not signed" };
};

module.exports = {
  signOut,
};

/* eslint-disable no-unexpected-multiline */
/* eslint-disable no-useless-escape */
/* eslint-disable no-unused-vars */
const matchUser = async (event, arg) => {
  const exec = require("child_process").exec;
  const dbase = require("../utils/connectDB");
  const lodash = require("lodash");
  const attendance = require("./attendance");
  const signedOut = require("./signOut");
  let response;

  const path = require("path");
  const fs = require("fs");

  await exec(
    `cd .exec & fcmb.exe ./ match`,
    async function (error, stdout, stderr) {
      response = stdout.split("\n")[2]?.slice(0, 28).trim();

      if (
        !error &&
        (response == "" || response == "Fingerprint image is written")
      ) {
        const currentPath = path.resolve(".exec", `match.xyt`);
        const minPath = path.resolve(".db/minut", "m.lis");
        exec(
          `cd .exec/exec && bozorth3 -p \"${currentPath}\" -G \"${minPath}\"`,
          (err, stdo, stde) => {
            let arr = stdo.split("\r\n");
            let numArr = arr.map((str) => Number(str));
            let max = Math.max(...numArr);
            const index = numArr.indexOf(max);
            let minut;
            fs.readFile(
              path.resolve(".db/minut", "m.lis"),
              "utf8",
              async (err, data) => {
                minut = data
                  .split("\n")
                  [index].match("([a-zA-Z-0-9]+)(.xyt)")[1];
                // console.log(minut);
                const userId = minut.substring(0, minut.length - 1);
                const db = await dbase();
                db.chain = lodash.chain(db.data);
                const user = db.chain
                  .get("users")
                  .find({ _id: userId })
                  .value();
                console.log(user);
                if (max >= 23) {
                  if (arg.status === "signIn") {
                    const attendanceResult = await attendance.populate(
                      user._id,
                      arg.course
                    );
                    console.log(attendanceResult);
                    switch (attendanceResult.status) {
                      case "duplicate":
                        return event.sender.send("match-res", {
                          error: true,
                          status: "duplicate",
                        });
                      case "marked":
                        return event.sender.send("match-res", {
                          status: "marked",

                          user: { ...user, time: attendanceResult.time },
                        });
                      case "No Course":
                        return event.sender.send("match-res", {
                          status: "No Course",
                          error: true,
                        });
                      default:
                        return event.sender.send("match-res", {
                          error: true,
                          status: "try again",
                        });
                    }
                  }
                  if (arg.status === "signOut") {
                    const signOutResult = await signedOut.signOut(user._id);
                    switch (signOutResult.status) {
                      case "success":
                        return event.sender.send("match-res", {
                          user: { ...user, time: signOutResult.time },
                          status: "signed out",
                        });
                      case "not yet":
                        return event.sender.send("match-res", {
                          error: true,
                          status: "not yet",
                        });
                      case "duplicate":
                        return event.sender.send("match-res", {
                          error: true,
                          status: "duplicate",
                        });
                      default:
                        return event.sender.send("match-res", {
                          error: true,
                          status: "not signed",
                        });
                    }
                  }
                }

                return event.sender.send("match-res", {
                  error: true,
                  status: "not found",
                });
              }
            );
            console.log(numArr, index, max);
          }
        );
      } else if (response === undefined) {
        console.log("connect scanner");
        const res = {
          error: true,
          status: "connect scanner",
        };
        return event.sender.send("match-res", res);
      } else {
        const res = {
          error: true,
          status: "try again",
        };
        return event.sender.send("match-res", res);
      }
    }
  );
};

module.exports = {
  matchUser,
};

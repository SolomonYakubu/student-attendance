/* eslint-disable no-unexpected-multiline */
/* eslint-disable no-useless-escape */
/* eslint-disable no-unused-vars */
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs").promises;
const dbase = require("../utils/connectDB");
const attendance = require("./attendance");
const signedOut = require("./signOut");

const matchUser = async (event, arg) => {
  try {
    const scanResult = await new Promise((resolve, reject) => {
      exec(`cd .exec & fcmb.exe ./ match`, (error, stdout, stderr) => {
        const response = stdout.split("\n")[2]?.slice(0, 28).trim();

        if (
          error ||
          !response ||
          !(response === "" || response === "Fingerprint image is written")
        ) {
          if (response === undefined) {
            resolve({ error: true, status: "connect scanner" });
          } else {
            resolve({ error: true, status: "try again" });
          }
          return;
        }

        const currentPath = path.resolve(".exec", "match.xyt");
        const minPath = path.resolve(".db/minut", "m.lis");

        exec(
          `cd .exec/exec && bozorth3 -p "${currentPath}" -G "${minPath}"`,
          async (err, stdo) => {
            try {
              const numArr = stdo.split("\r\n").map(Number);
              const max = Math.max(...numArr);
              const index = numArr.indexOf(max);

              // Read and parse minutiae file
              const data = await fs.readFile(
                path.resolve(".db/minut", "m.lis"),
                "utf8"
              );
              const minutMatch = data
                .split("\n")
                [index].match("([a-zA-Z-0-9]+)(.xyt)");
              const minut = minutMatch ? minutMatch[1] : null;

              if (!minut) {
                resolve({ error: true, status: "not found" });
                return;
              }

              const userId = minut.substring(0, minut.length - 1);
              const db = await dbase();
              const user = await db.getUser(userId);

              if (user) {
                user._id = user.id; // Maintain compatibility with previous implementation
              }

              console.log(user);
              console.log(numArr, index, max);

              if (max >= 23 && user) {
                if (arg.status === "signIn") {
                  const attendanceResult = await attendance.populate(
                    user._id,
                    arg.course
                  );
                  console.log(attendanceResult);

                  switch (attendanceResult.status) {
                    case "duplicate":
                      resolve({ error: true, status: "duplicate" });
                      break;
                    case "marked":
                      resolve({
                        status: "marked",
                        user: { ...user, time: attendanceResult.time },
                      });
                      break;
                    case "No Course":
                      resolve({ status: "No Course", error: true });
                      break;
                    default:
                      resolve({ error: true, status: "try again" });
                  }
                  return;
                }

                if (arg.status === "signOut") {
                  const signOutResult = await signedOut.signOut(user._id);

                  switch (signOutResult.status) {
                    case "success":
                      resolve({
                        user: { ...user, time: signOutResult.time },
                        status: "signed out",
                      });
                      break;
                    case "not yet":
                      resolve({ error: true, status: "not yet" });
                      break;
                    case "duplicate":
                      resolve({ error: true, status: "duplicate" });
                      break;
                    default:
                      resolve({ error: true, status: "not signed" });
                  }
                  return;
                }
              }

              resolve({ error: true, status: "not found" });
            } catch (innerError) {
              console.error("Processing error:", innerError);
              resolve({ error: true, status: "processing error" });
            }
          }
        );
      });
    });

    return event.sender.send("match-res", scanResult);
  } catch (error) {
    console.error("Matching error:", error);
    return event.sender.send("match-res", {
      error: true,
      status: "system error",
    });
  }
};

module.exports = {
  matchUser,
};

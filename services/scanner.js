const getData = async (event, isDev, arg) => {
  const { _id, count } = arg;
  const exec = require("child_process").exec;
  const fs = require("fs");
  const path = require("path");

  // Use the new database connection
  const getDb = require("../utils/connectDB");
  let response;

  const file = "./.db/minut";
  if (!fs.existsSync(file)) {
    fs.mkdirSync(file);
  }

  await exec(
    `cd .exec & fcmb.exe ./ ${_id + count.toString()}`,
    async function (error, stdout, stderr) {
      response = stdout.split("\n")[2]?.slice(0, 28).trim();
      console.log(response);

      if (
        !error &&
        (response == "" || response == "Fingerprint image is written")
      ) {
        const currentPath = path.resolve(
          ".exec",
          `${_id + count.toString()}.xyt`
        );
        const newPath = path.resolve(
          ".db/minut",
          `${_id + count.toString()}.xyt`
        );

        fs.renameSync(currentPath, newPath, (err) => {
          // Error handling is empty in original code
        });

        const minPath = path.resolve(".db/minut", "m.lis");
        const startPath = path.resolve(".db/minut");

        fs.writeFile(`${minPath}`, "", (err) => {});

        const files = fs.readdirSync(startPath);
        for (let i = 0; i < files.length; i++) {
          let filename = path.join(startPath, files[i]);
          let stat = fs.lstatSync(filename);
          if (filename.endsWith(".xyt")) {
            fs.appendFile(
              minPath,
              path.resolve(filename + "\n"),
              "utf8",
              (err) => {
                if (err) throw err;
              }
            );
          }
        }

        const res = {
          error: false,
          status: "success",
          file: isDev
            ? path.join(".exec/bmp", `${_id + count.toString()}.bmp`)
            : path.join(
                process.resourcesPath,
                "..",
                ".exec/bmp",
                `${_id + count.toString()}.bmp`
              ),
        };

        // Connect to the database and update the user
        const db = await getDb();
        await db.updateUser(_id, { scanned: true });

        return event.sender.send("scanResult", res);
      } else if (response === undefined) {
        console.log("connect scanner");
        const res = {
          error: true,
          status: "connect scanner",
        };
        return event.sender.send("scanResult", res);
      } else {
        const res = {
          error: true,
          status: "try again",
        };
        return event.sender.send("scanResult", res);
      }
    }
  );
};

module.exports = {
  getData,
};

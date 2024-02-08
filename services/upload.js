const dbase = require("../utils/connectDB");
const lodash = require("lodash");
const path = require("path");
const fs = require("fs");
const upload = async (event, arg) => {
  try {
    const db = await dbase();
    // console.log(db);
    db.chain = lodash.chain(db.data);
    const base64Data = arg.img.replace(/^data:image\/jpeg;base64,/, "");
    const file = "./.db/profile";
    if (!fs.existsSync(file)) {
      fs.mkdirSync(file);
    }
    // const imgPath = path.join(".db", "profile", `${arg._id}.jpg`);
    const imgPath = `.db/profile/${arg._id}.jpg`;
    if (base64Data) {
      require("fs").writeFile(imgPath, base64Data, "base64", function (err) {
        console.log(err);
      });
      db.chain.get("users").find({ _id: arg._id }).value().dp = imgPath;
      await db.write();
      return event.sender.send("upload-dp-res", {
        error: false,
        status: "success",
      });
    }
  } catch (err) {
    console.log(err.message);
  }
};
module.exports = {
  upload,
};

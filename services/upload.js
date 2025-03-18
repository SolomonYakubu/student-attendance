const path = require("path");
const fs = require("fs");
const connectDB = require("../utils/connectDB");

const upload = async (event, arg) => {
  try {
    const db = await connectDB();

    const base64Data = arg.img.replace(/^data:image\/jpeg;base64,/, "");
    const file = "./.db/profile";
    if (!fs.existsSync(file)) {
      fs.mkdirSync(file, { recursive: true });
    }

    const imgPath = `.db/profile/${arg._id}.jpg`;

    if (base64Data) {
      // Write the image file
      await fs.promises.writeFile(imgPath, base64Data, "base64");

      // Update user's dp field in the database
      await db.updateUser(arg._id, { dp: imgPath });

      return event.sender.send("upload-dp-res", {
        error: false,
        status: "success",
      });
    }
  } catch (err) {
    console.log(err.message);
    return event.sender.send("upload-dp-res", {
      error: true,
      status: "failed",
      message: err.message,
    });
  }
};

module.exports = {
  upload,
};

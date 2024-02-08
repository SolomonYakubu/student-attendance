const multer = require("multer");
const { BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const express = require("express");
const app = express();
const port = 8081;
const dotenv = require("dotenv");
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const credentials = require(path.resolve("credentials.json"));
const tokenPath = path.resolve("token.json");

const syncData = () => {
  const storage = multer.diskStorage({
    destination: "uploads",
    filename: path.resolve(".db"),
  });
  app.use(express.static("public"));

  // Define a route for the root URL
  app.get("/", (req, res) => {
    res.sendFile(path.resolve("sync.html"));
  });

  // Start the server
  app.listen(port, () => {
    console.log(`Express app listening at http://localhost:${port}`);
  });
  const upload = multer({ storage: storage });
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );
  authorize();
  console.log(oAuth2Client);
  async function authorize() {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });
    const authWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });
    authWindow.loadURL(authUrl);
    authWindow.webContents.on("will-redirect", (event, url) => {
      const queryParams = new URL(url).searchParams;
      const code = queryParams.get("code");
      if (code) {
        oAuth2Client.getToken(code, async (err, token) => {
          console.log(token);
          oAuth2Client.setCredentials(token);
          oAuth2Client.on("tokens", (newToken) => {
            if (newToken.refresh_token) {
              token.refresh_token = newToken.refresh_token;
              fs.writeFileSync(tokenPath, JSON.stringify(token));
            }
          });
          fs.writeFile(tokenPath, JSON.stringify(token), (err) => {
            console.log("Access token stored");
          });
          if (!oAuth2Client.credentials) {
            return console.log("auth required");
          }
          const drive = google.drive({ version: "v3", auth: oAuth2Client });

          async function uploadFolder(
            folderPath,
            driveFolderName,
            parentFolderId = null
          ) {
            // Check if the folder already exists in Google Drive
            const existingFolder = await findExistingFolder(
              drive,
              driveFolderName,
              parentFolderId
            );

            // If the folder exists, delete it
            if (existingFolder) {
              await drive.files.delete({
                fileId: existingFolder.id,
              });
            }

            // Create a new folder in Google Drive
            const folderMetadata = {
              name: driveFolderName,
              mimeType: "application/vnd.google-apps.folder",
              parents: parentFolderId ? [parentFolderId] : [],
            };

            const { data: createdFolder } = await drive.files.create({
              resource: folderMetadata,
              fields: "id",
            });

            // Upload files and folders in the local folder to Google Drive
            const items = fs.readdirSync(folderPath);

            for (const item of items) {
              const itemPath = path.join(folderPath, item);

              if (fs.statSync(itemPath).isDirectory()) {
                // If it's a directory, recursively upload its contents with the current folder as the parent
                await uploadFolder(itemPath, item, createdFolder.id);
              } else {
                // If it's a file, upload it to the created folder
                const media = {
                  mimeType: "application/octet-stream",
                  body: fs.createReadStream(itemPath),
                };

                const fileMetadata = {
                  name: item,
                  parents: [createdFolder.id],
                };

                await drive.files.create({
                  resource: fileMetadata,
                  media: media,
                  fields: "id",
                  supportsAllDrives: true, // Add this line to support overwriting
                });
              }
            }

            console.log("Folder uploaded successfully.");
          }

          // Function to find an existing folder by name
          async function findExistingFolder(
            drive,
            folderName,
            parentFolderId = null
          ) {
            let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`;
            if (parentFolderId) {
              query += ` and '${parentFolderId}' in parents`;
            }

            const { data } = await drive.files.list({
              q: query,
              fields: "files(id)",
            });

            return data.files.length > 0 ? data.files[0] : null;
          }

          const folderPath = path.resolve(".db");
          const driveFolderName = ".db";

          uploadFolder(folderPath, driveFolderName);
          // const driveMetaData = {
          //   name: "attendance",
          //   parents: "1bPd3jlJ0_9YE0awSkLfk4tHD_UyuGj3U",
          // };
          // const driveMedia = {
          //   MimeType: "application/vnd.google-apps.folder",
          //   body: path.resolve(".db"),

          // };
          // drive.files.create(
          //   {
          //     resource: driveMetaData,
          //     media: driveMedia,
          //     fields: "id",
          //   },
          //   (err, driveFile) => {
          //     if (err) {
          //       console.log(err);
          //     }

          //     console.log("file uploaded", driveFile);
          //   }
          // );
          // const folderMetadata = {
          //   name: "attendance",
          //   mimeType: "application/vnd.google-apps.folder",
          // };

          // const { data: createdFolder } = await drive.files.create({
          //   resource: folderMetadata,
          //   fields: "id",
          // });

          // // Upload files in the local folder to Google Drive
          // const files = fs.readdirSync(path.resolve(".db"));

          // for (const file of files) {
          //   const filePath = `${path.resolve(".db")}/${file}`;

          //   const media = {
          //     mimeType: "application/octet-stream",
          //     body: fs.createReadStream(filePath),
          //   };

          //   const fileMetadata = {
          //     name: file,
          //     parents: [createdFolder.id],
          //   };

          //   await drive.files.create({
          //     resource: fileMetadata,
          //     media: media,
          //     fields: "id",
          //   });
          // }

          // console.log("Folder uploaded successfully.");
          authWindow.close();
        });
      }
    });
  }
};

module.exports = {
  syncData,
};

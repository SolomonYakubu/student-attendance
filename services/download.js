const multer = require("multer");
const { BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const { google } = require("googleapis");

const express = require("express");
const app = express();
const port = 8081;

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const credentials = require(path.resolve("credentials.json"));
const tokenPath = path.resolve("token.json");

const downloadData = () => {
  const storage = multer.diskStorage({
    destination: "uploads",
    filename: path.resolve(".db"),
  });
  app.use(express.static("public"));

  // Define a route for the root URL
  app.get("/", (req, res) => {
    res.sendFile(path.resolve("loader.html"));
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

          async function downloadFilesFromDrive(
            driveFolderName,
            localFolderPath
          ) {
            // Find the folder on Google Drive
            const folder = await findExistingFolder(drive, driveFolderName);

            if (!folder) {
              console.error(
                `Folder '${driveFolderName}' not found on Google Drive.`
              );
              return;
            }

            // Download all files and subfolders recursively
            await downloadFolderContents(drive, folder.id, localFolderPath);

            console.log("Files and subfolders downloaded successfully.");
            // app.close();
            authWindow.close();
          }

          async function downloadFolderContents(
            drive,
            folderId,
            localFolderPath
          ) {
            const { data } = await drive.files.list({
              q: `'${folderId}' in parents`,
              fields: "files(id, name, mimeType)",
            });

            for (const file of data.files) {
              const localFilePath = `${localFolderPath}/${file.name}`;

              if (file.mimeType === "application/vnd.google-apps.folder") {
                // If it's a folder, create a corresponding local folder and download its contents
                if (!fs.existsSync(localFilePath)) {
                  fs.mkdirSync(localFilePath);
                }
                await downloadFolderContents(drive, file.id, localFilePath);
              } else {
                // If it's a file, download it to the local directory
                const dest = fs.createWriteStream(localFilePath);
                const response = await drive.files.get(
                  { fileId: file.id, alt: "media" },
                  { responseType: "stream" }
                );

                await new Promise((resolve, reject) => {
                  response.data
                    .on("end", resolve)
                    .on("error", (error) => {
                      console.error(
                        `Error downloading file ${file.name}: ${error.message}`
                      );
                      reject(error);
                    })
                    .pipe(dest);
                });

                console.log(
                  `File '${file.name}' downloaded to ${localFilePath}`
                );
              }
            }
          }

          // Function to find an existing folder by name
          async function findExistingFolder(drive, folderName) {
            const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`;

            const { data } = await drive.files.list({
              q: query,
              fields: "files(id)",
            });

            return data.files.length > 0 ? data.files[0] : null;
          }

          // Usage
          const driveFolderName = ".db";
          const localFolderPath = path.resolve(".db");

          if (!fs.existsSync(localFolderPath)) {
            fs.mkdirSync(localFolderPath);
          }

          downloadFilesFromDrive(driveFolderName, localFolderPath);

          //   authWindow.close();
        });
      }
    });
  }
};

module.exports = {
  downloadData,
};

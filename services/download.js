const multer = require("multer");
const { BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const { google } = require("googleapis");
const crypto = require("crypto");

const express = require("express");
const app = express();
const port = 8081;

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const credentials = require(path.resolve("credentials.json"));
const tokenPath = path.resolve("token.json");
const syncMetadataPath = path.resolve(".sync_metadata.json");

// Function to load or create sync metadata
function loadSyncMetadata() {
  try {
    if (fs.existsSync(syncMetadataPath)) {
      return JSON.parse(fs.readFileSync(syncMetadataPath, "utf8"));
    }
  } catch (err) {
    console.log("Error reading sync metadata:", err);
  }
  return { files: {}, lastSync: 0 };
}

// Function to save sync metadata
function saveSyncMetadata(metadata) {
  fs.writeFileSync(syncMetadataPath, JSON.stringify(metadata, null, 2));
}

let progressWindow = null;

const downloadData = (event) => {
  const storage = multer.diskStorage({
    destination: "uploads",
    filename: path.resolve(".db"),
  });
  app.use(express.static("public"));

  // Define a route for the root URL
  // app.get("/", (req, res) => {
  //   res.sendFile(path.resolve("loader.html"));
  // });

  // app.listen(port, () => {
  //   console.log(`Express app listening at http://localhost:${port}`);
  // });

  // Create progress window
  progressWindow = new BrowserWindow({
    width: 500,
    height: 300,
    autoHideMenuBar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  progressWindow.loadFile(path.resolve("progress.html"));
  progressWindow.setTitle("Downloading Files");

  // Send initial progress
  progressWindow.webContents.on("did-finish-load", () => {
    progressWindow.webContents.send("sync-progress", {
      message: "Initializing download...",
      progress: 0,
      total: 100,
    });
  });

  const upload = multer({ storage: storage });
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  authorize();

  function updateProgress(message, current, total) {
    if (progressWindow && !progressWindow.isDestroyed()) {
      const progress = total > 0 ? Math.round((current / total) * 100) : 0;
      progressWindow.webContents.send("sync-progress", {
        message,
        progress: current,
        total,
      });
    }

    // Also send progress to the main window if there's an event
    if (event) {
      event.sender.send("download-status", {
        message,
        progress: Math.round((current / total) * 100),
        complete: current >= total,
      });
    }
  }

  async function authorize() {
    try {
      // Check if we have a stored token
      if (fs.existsSync(tokenPath)) {
        const token = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
        oAuth2Client.setCredentials(token);

        // Check if token is expired or will expire soon
        const expiryDate = token.expiry_date || 0;
        const tokenExpired = expiryDate <= Date.now();
        const tokenExpiringVery = expiryDate <= Date.now() + 5 * 60 * 1000; // 5 minutes buffer

        if (tokenExpired || tokenExpiringVery) {
          updateProgress("Refreshing expired token...", 5, 100);
          try {
            const { credentials } = await oAuth2Client.refreshAccessToken();
            oAuth2Client.setCredentials(credentials);
            fs.writeFileSync(tokenPath, JSON.stringify(credentials));
            console.log("Token refreshed successfully");
          } catch (refreshErr) {
            console.log(
              "Token refresh failed, initiating new auth flow:",
              refreshErr
            );
            // Fall through to the new auth flow below
            throw new Error("Token refresh failed");
          }
        }

        downloadFilesFromDrive();
        return;
      }
    } catch (err) {
      console.log("Error with stored token, initiating new auth flow:", err);
      updateProgress("Authentication needed...", 0, 1);
    }

    // If no valid token or refresh failed, authorize from scratch
    updateProgress("Please authenticate with Google Drive", 0, 1);
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });

    const authWindow = new BrowserWindow({
      width: 800,
      height: 600,
      parent: progressWindow,
      modal: true,
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
        updateProgress("Getting token...", 10, 100);

        oAuth2Client.getToken(code, async (err, token) => {
          if (err) {
            console.log("Error getting token:", err);
            updateProgress("Failed to authenticate", 0, 1);
            authWindow.close();
            return;
          }

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

          authWindow.close();
          downloadFilesFromDrive();
        });
      }
    });
  }

  async function downloadFilesFromDrive() {
    if (!oAuth2Client.credentials) {
      updateProgress("Authentication required", 0, 1);
      return console.log("auth required");
    }

    const drive = google.drive({ version: "v3", auth: oAuth2Client });
    const syncMetadata = loadSyncMetadata();

    updateProgress("Looking for database folder in Google Drive...", 15, 100);

    try {
      // Find the folder on Google Drive
      const driveFolderName = ".db";
      const localFolderPath = path.resolve(".db");

      // Add retries for folder lookup
      let folder = null;
      let retries = 3;

      while (retries > 0 && !folder) {
        try {
          folder = await findExistingFolder(drive, driveFolderName);
          if (!folder) {
            updateProgress(
              `Retrying folder lookup (${retries} attempts left)...`,
              15,
              100
            );
            retries--;
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second between attempts
          }
        } catch (err) {
          console.error(`Folder lookup attempt failed:`, err);
          retries--;
          if (retries <= 0) throw err;
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds on error
        }
      }

      if (!folder) {
        updateProgress(
          `Folder '${driveFolderName}' not found on Google Drive.`,
          0,
          1
        );
        console.error(`Folder '${driveFolderName}' not found on Google Drive.`);
        return;
      }

      // Make sure local folder exists
      if (!fs.existsSync(localFolderPath)) {
        fs.mkdirSync(localFolderPath, { recursive: true });
      }

      updateProgress("Scanning folder structure...", 20, 100);

      // Get a list of files in the Drive folder structure to calculate progress
      const fileList = await getDriveFilesRecursively(drive, folder.id);
      const totalFiles = fileList.length;

      updateProgress(
        `Found ${totalFiles} files. Starting download...`,
        25,
        100
      );

      // Download all files and subfolders recursively with better error handling
      let downloadedCount = 0;
      await downloadFolderContents(
        drive,
        folder.id,
        localFolderPath,
        driveFolderName,
        syncMetadata,
        downloadedCount,
        totalFiles
      );

      // Update last sync time
      syncMetadata.lastSync = Date.now();
      saveSyncMetadata(syncMetadata);

      updateProgress("Download completed successfully!", 100, 100);
      console.log("Files and subfolders downloaded successfully.");

      // Close the progress window after 3 seconds
      setTimeout(() => {
        if (progressWindow && !progressWindow.isDestroyed()) {
          progressWindow.close();
          progressWindow = null;
        }
      }, 3000);
    } catch (err) {
      console.error("Download failed:", err);
      updateProgress(`Download failed: ${err.message}`, 0, 1);
    }
  }

  // Get a list of all files in Drive recursively
  async function getDriveFilesRecursively(drive, folderId) {
    let allFiles = [];

    const { data } = await drive.files.list({
      q: `'${folderId}' in parents`,
      fields: "files(id, name, mimeType)",
    });

    for (const file of data.files) {
      if (file.mimeType === "application/vnd.google-apps.folder") {
        const childFiles = await getDriveFilesRecursively(drive, file.id);
        allFiles = allFiles.concat(childFiles);
      } else {
        allFiles.push(file);
      }
    }

    return allFiles;
  }

  // Improved download with error handling and retries
  async function downloadFolderContents(
    drive,
    folderId,
    localFolderPath,
    relativePath,
    syncMetadata,
    downloadedCount,
    totalFiles
  ) {
    let retries = 3;
    let success = false;
    let data;

    while (retries > 0 && !success) {
      try {
        const result = await drive.files.list({
          q: `'${folderId}' in parents`,
          fields: "files(id, name, mimeType, modifiedTime)",
          pageSize: 1000,
        });
        data = result.data;
        success = true;
      } catch (err) {
        console.error(
          `Error listing files in folder (${retries} attempts left):`,
          err
        );
        retries--;
        if (retries <= 0) throw err;
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds between attempts
      }
    }

    let currentDownloadedCount = downloadedCount;

    // Process folders first to ensure directory structure is created
    const folders = data.files.filter(
      (file) => file.mimeType === "application/vnd.google-apps.folder"
    );
    const regularFiles = data.files.filter(
      (file) => file.mimeType !== "application/vnd.google-apps.folder"
    );

    // First process all folders to create directory structure
    for (const folder of folders) {
      const folderPath = path.join(localFolderPath, folder.name);
      const relativeFolderPath = path.join(relativePath, folder.name);

      // Create folder if it doesn't exist
      if (!fs.existsSync(folderPath)) {
        try {
          fs.mkdirSync(folderPath, { recursive: true });
          console.log(`Created directory: ${folderPath}`);
        } catch (err) {
          console.error(`Error creating directory ${folderPath}:`, err);
          updateProgress(`Error creating directory ${folder.name}`, null, null);
        }
      }

      // Process subfolders and files inside this folder
      currentDownloadedCount = await downloadFolderContents(
        drive,
        folder.id,
        folderPath,
        relativeFolderPath,
        syncMetadata,
        currentDownloadedCount,
        totalFiles
      );
    }

    // Then process regular files
    for (const file of regularFiles) {
      const localPath = path.join(localFolderPath, file.name);
      const relativeFilePath = path.join(relativePath, file.name);

      // Make sure parent directory exists (extra safeguard)
      const parentDir = path.dirname(localPath);
      if (!fs.existsSync(parentDir)) {
        try {
          fs.mkdirSync(parentDir, { recursive: true });
          console.log(`Created parent directory: ${parentDir}`);
        } catch (dirErr) {
          console.error(
            `Error creating parent directory for ${localPath}:`,
            dirErr
          );
          updateProgress(
            `Error creating directory for ${file.name}`,
            null,
            null
          );
          continue; // Skip this file
        }
      }

      // If it's a file, check if we need to download it
      const fileMetadataEntry = syncMetadata.files[relativeFilePath] || {
        driveId: null,
        lastSyncHash: null,
        lastSyncTime: 0,
        version: 1,
      };

      const driveModified = new Date(file.modifiedTime).getTime();
      let needsDownload = false;

      // Check if file exists locally first
      if (!fs.existsSync(localPath)) {
        needsDownload = true;
      } else {
        // File exists - check if drive version is different/newer
        needsDownload =
          !fileMetadataEntry.driveId ||
          fileMetadataEntry.driveId !== file.id ||
          driveModified > fileMetadataEntry.lastSyncTime;
      }

      if (needsDownload) {
        updateProgress(
          `Downloading: ${file.name}`,
          25 + Math.floor(70 * (currentDownloadedCount / totalFiles)),
          100
        );

        // Download the file with retries
        let downloadSuccess = false;
        retries = 3;

        while (retries > 0 && !downloadSuccess) {
          try {
            // Download the file
            await new Promise((resolve, reject) => {
              drive.files
                .get(
                  { fileId: file.id, alt: "media" },
                  { responseType: "stream" }
                )
                .then((response) => {
                  // Extra check for parent directory
                  const dir = path.dirname(localPath);
                  if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                  }

                  const dest = fs.createWriteStream(localPath);
                  response.data
                    .on("end", () => {
                      console.log(
                        `File '${file.name}' downloaded to ${localPath}`
                      );
                      resolve();
                    })
                    .on("error", (error) => {
                      console.error(
                        `Error downloading file ${file.name}: ${error.message}`
                      );
                      reject(error);
                    });

                  response.data.pipe(dest);

                  // Add error handler to the destination stream
                  dest.on("error", (err) => {
                    console.error(`Error writing file ${localPath}:`, err);
                    reject(err);
                  });
                })
                .catch(reject);
            });

            downloadSuccess = true;

            // Update sync metadata
            try {
              const fileContent = fs.readFileSync(localPath);
              const fileHash = crypto
                .createHash("md5")
                .update(fileContent)
                .digest("hex");

              syncMetadata.files[relativeFilePath] = {
                driveId: file.id,
                lastSyncHash: fileHash,
                lastSyncTime: driveModified,
                version: fileMetadataEntry.version + 1,
              };

              // Save metadata after each successful file download
              saveSyncMetadata(syncMetadata);
            } catch (metadataErr) {
              console.error(
                `Error updating metadata for ${file.name}:`,
                metadataErr
              );
            }
          } catch (err) {
            console.error(
              `Download attempt failed (${retries} attempts left):`,
              err
            );
            retries--;
            if (retries <= 0) {
              updateProgress(
                `Failed to download ${file.name} after multiple attempts`,
                null,
                null
              );
              console.error(
                `Failed to download file after retries: ${file.name}`
              );
            }
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds between attempts
          }
        }
      }

      currentDownloadedCount++;
    }

    return currentDownloadedCount;
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
};

module.exports = {
  downloadData,
};

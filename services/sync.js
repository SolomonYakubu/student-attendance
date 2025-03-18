const multer = require("multer");
const { BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const express = require("express");
const app = express();
const port = 8045;
const dotenv = require("dotenv");
const { google } = require("googleapis");
const crypto = require("crypto");

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const credentials = require(path.resolve("credentials.json"));
const tokenPath = path.resolve("token.json");
const syncMetadataPath = path.resolve(".sync_metadata.json");

// Generate a unique machine ID to identify this device
const machineId = crypto
  .createHash("md5")
  .update(require("os").hostname())
  .digest("hex")
  .substr(0, 8);

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

// Check if files need syncing
function checkNeedsSync() {
  const syncMetadata = loadSyncMetadata();
  const dbFolder = path.resolve(".db");

  try {
    if (!fs.existsSync(dbFolder)) {
      return { needsSync: false, reason: "No database folder exists" };
    }

    // Check for changes in the files
    const changedFiles = checkFolderForChanges(dbFolder, "", syncMetadata);

    if (changedFiles.length > 0) {
      return {
        needsSync: true,
        reason: `${changedFiles.length} files have been modified`,
        changedFiles,
      };
    }

    // Check if last sync was more than 1 hour ago
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - syncMetadata.lastSync > oneHour) {
      return {
        needsSync: true,
        reason: "Last sync was more than 1 hour ago",
      };
    }

    return { needsSync: false, reason: "All files are in sync" };
  } catch (err) {
    console.error("Error checking sync status:", err);
    return { needsSync: true, reason: "Error checking sync status" };
  }
}

// Check folder for changes
function checkFolderForChanges(folderPath, relativePath, syncMetadata) {
  const changedFiles = [];

  if (!fs.existsSync(folderPath)) {
    return changedFiles;
  }

  const items = fs.readdirSync(folderPath);

  for (const item of items) {
    const itemPath = path.join(folderPath, item);
    const itemRelativePath = path.join(relativePath, item);

    if (fs.statSync(itemPath).isDirectory()) {
      // Recursively check subdirectories
      changedFiles.push(
        ...checkFolderForChanges(itemPath, itemRelativePath, syncMetadata)
      );
    } else {
      // Check if file has changed
      try {
        const fileContent = fs.readFileSync(itemPath);
        const fileHash = crypto
          .createHash("md5")
          .update(fileContent)
          .digest("hex");

        const fileInfo = syncMetadata.files[itemRelativePath];
        if (!fileInfo || fileInfo.lastSyncHash !== fileHash) {
          changedFiles.push(itemRelativePath);
        }
      } catch (err) {
        console.error(`Error checking file ${itemPath}:`, err);
      }
    }
  }

  return changedFiles;
}

let progressWindow = null;

const syncData = (event) => {
  const storage = multer.diskStorage({
    destination: "uploads",
    filename: path.resolve(".db"),
  });
  app.use(express.static("public"));

  // Define a route for the root URL
  // app.get("/", (req, res) => {
  //   res.sendFile(path.resolve("sync.html"));
  // });

  // app.listen(port, () => {
  //   console.log(`Express app listening at http://localhost:${port}`);
  // });
  const upload = multer({ storage: storage });
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

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
  progressWindow.setTitle("Syncing Files");

  // Send initial progress
  progressWindow.webContents.on("did-finish-load", () => {
    progressWindow.webContents.send("sync-progress", {
      message: "Initializing sync...",
      progress: 0,
      total: 100,
    });
  });

  authorize();

  async function authorize() {
    try {
      // Check if we have a stored token
      if (fs.existsSync(tokenPath)) {
        const token = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
        oAuth2Client.setCredentials(token);
        syncFiles();
        return;
      }
    } catch (err) {
      console.log("Error loading stored token:", err);
      updateProgress("Error loading authentication token", 0, 1);
    }

    // If no valid token, authorize from scratch
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
          syncFiles();
        });
      }
    });
  }

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
      event.sender.send("sync-status", {
        message,
        progress: Math.round((current / total) * 100),
        complete: current >= total,
      });
    }
  }

  async function syncFiles() {
    if (!oAuth2Client.credentials) {
      updateProgress("Authentication required", 0, 1);
      return console.log("Auth required");
    }

    const drive = google.drive({ version: "v3", auth: oAuth2Client });
    const syncMetadata = loadSyncMetadata();
    const currentTime = Date.now();

    try {
      updateProgress("Checking for changes...", 15, 100);
      // Ensure the base folder exists in Google Drive
      const driveFolderName = ".db";
      const baseFolder = await getOrCreateFolder(drive, driveFolderName);

      // Calculate total files to sync for progress reporting
      const filesToSync = getAllLocalFiles(path.resolve(".db"));
      const totalFiles = filesToSync.length;
      updateProgress(`Found ${totalFiles} files to check`, 20, 100);

      // Process local files and sync with Google Drive
      await processLocalDirectory(
        path.resolve(".db"),
        baseFolder.id,
        driveFolderName,
        0,
        totalFiles
      );

      // Update last sync time
      syncMetadata.lastSync = currentTime;
      saveSyncMetadata(syncMetadata);

      updateProgress("Sync completed successfully!", 100, 100);
      console.log("Sync completed successfully!");

      // Close the progress window after 3 seconds
      setTimeout(() => {
        if (progressWindow && !progressWindow.isDestroyed()) {
          progressWindow.close();
          progressWindow = null;
        }
      }, 3000);
    } catch (err) {
      console.error("Sync failed:", err);
      updateProgress(`Sync failed: ${err.message}`, 0, 1);
    }
  }

  // Get a list of all local files
  function getAllLocalFiles(folderPath) {
    let files = [];

    const items = fs.readdirSync(folderPath);

    for (const item of items) {
      const itemPath = path.join(folderPath, item);

      if (fs.statSync(itemPath).isDirectory()) {
        files = files.concat(getAllLocalFiles(itemPath));
      } else {
        files.push(itemPath);
      }
    }

    return files;
  }

  // Get or create a folder in Google Drive
  async function getOrCreateFolder(drive, folderName, parentId = null) {
    let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    const { data } = await drive.files.list({
      q: query,
      fields: "files(id, name, modifiedTime)",
    });

    if (data.files.length > 0) {
      return data.files[0];
    }

    updateProgress(`Creating folder: ${folderName}`, 20, 100);

    // Create folder if it doesn't exist
    const folderMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : [],
    };

    const { data: createdFolder } = await drive.files.create({
      resource: folderMetadata,
      fields: "id, name",
    });

    return createdFolder;
  }

  // Process local directory and sync with Google Drive
  async function processLocalDirectory(
    localPath,
    parentFolderId,
    relativePath,
    processedCount,
    totalFiles
  ) {
    const syncMetadata = loadSyncMetadata();
    const drive = google.drive({ version: "v3", auth: oAuth2Client });

    const items = fs.readdirSync(localPath);
    let currentProcessedCount = processedCount;

    for (const item of items) {
      const itemPath = path.join(localPath, item);
      const itemRelativePath = path.join(relativePath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        // Create or get the folder in Drive
        const driveFolder = await getOrCreateFolder(
          drive,
          item,
          parentFolderId
        );
        currentProcessedCount = await processLocalDirectory(
          itemPath,
          driveFolder.id,
          itemRelativePath,
          currentProcessedCount,
          totalFiles
        );
      } else {
        // Handle file syncing with conflict prevention
        await syncFile(
          drive,
          itemPath,
          item,
          parentFolderId,
          itemRelativePath,
          stats
        );
        currentProcessedCount++;

        // Update progress (scaling from 20% to 95%)
        const progressPercent =
          20 + Math.floor(75 * (currentProcessedCount / totalFiles));
        updateProgress(
          `Processing file ${currentProcessedCount} of ${totalFiles}: ${item}`,
          progressPercent,
          100
        );
      }
    }

    return currentProcessedCount;
  }

  // Sync individual file with conflict prevention
  async function syncFile(
    drive,
    localPath,
    fileName,
    parentFolderId,
    relativePath,
    stats
  ) {
    const syncMetadata = loadSyncMetadata();

    // Create file hash for change detection
    const fileContent = fs.readFileSync(localPath);
    const fileHash = crypto.createHash("md5").update(fileContent).digest("hex");
    const localModifiedTime = stats.mtimeMs;

    // Get file metadata or create entry
    const fileMetadataEntry = syncMetadata.files[relativePath] || {
      driveId: null,
      lastSyncHash: null,
      lastSyncTime: 0,
      version: 1,
    };

    // Check if file exists on Drive
    let driveFile = null;
    if (fileMetadataEntry.driveId) {
      try {
        const { data } = await drive.files.get({
          fileId: fileMetadataEntry.driveId,
          fields: "id, modifiedTime, md5Checksum",
        });
        driveFile = data;
      } catch (err) {
        // File no longer exists on Drive
        fileMetadataEntry.driveId = null;
        console.log(`File no longer exists on Drive: ${relativePath}`);
      }
    }

    // If file hasn't changed locally, no need to sync
    if (fileHash === fileMetadataEntry.lastSyncHash && driveFile) {
      return;
    }

    if (driveFile) {
      // Check for conflicts - if drive file was modified after our last sync
      const driveModified = new Date(driveFile.modifiedTime).getTime();

      if (driveModified > fileMetadataEntry.lastSyncTime) {
        // Potential conflict - remote file has changed since our last sync

        // Download the current version from drive to check if it's actually different
        const tempPath = `${localPath}.temp`;
        try {
          await drive.files
            .get(
              { fileId: fileMetadataEntry.driveId, alt: "media" },
              { responseType: "stream" }
            )
            .then((res) => {
              return new Promise((resolve, reject) => {
                const dest = fs.createWriteStream(tempPath);
                res.data.pipe(dest);
                dest.on("finish", resolve);
                dest.on("error", reject);
              });
            });

          // Compare the remote and local files
          const remoteContent = fs.readFileSync(tempPath);
          const remoteHash = crypto
            .createHash("md5")
            .update(remoteContent)
            .digest("hex");

          // If files are different, then we need to decide which one to keep
          if (remoteHash !== fileHash) {
            // For actual conflicts, use the modification time to decide
            if (localModifiedTime > driveModified) {
              // Local file is newer, update remote file
              console.log(
                `Local version is newer for ${relativePath}. Uploading...`
              );
              await updateDriveFile(
                drive,
                fileMetadataEntry.driveId,
                localPath
              );
            } else {
              // Remote file is newer, update local file
              console.log(
                `Remote version is newer for ${relativePath}. Downloading...`
              );
              fs.copyFileSync(tempPath, localPath);
            }
          }

          // Clean up temp file
          fs.unlinkSync(tempPath);
        } catch (err) {
          console.error(
            `Error handling potential conflict for ${relativePath}:`,
            err
          );
          // If unable to resolve conflict, create a conflict copy
          await createConflictCopy(
            drive,
            localPath,
            fileName,
            parentFolderId,
            fileMetadataEntry
          );
        }
      } else {
        // No conflict, update existing file
        await updateDriveFile(drive, fileMetadataEntry.driveId, localPath);
        console.log(`Updated file: ${relativePath}`);
      }
    } else {
      // File doesn't exist in Drive, create it
      const fileMetadata = {
        name: fileName,
        parents: [parentFolderId],
        properties: {
          machineId: machineId,
          version: fileMetadataEntry.version.toString(),
        },
      };

      const media = {
        mimeType: "application/octet-stream",
        body: fs.createReadStream(localPath),
      };

      const { data } = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: "id, modifiedTime",
      });

      fileMetadataEntry.driveId = data.id;
      console.log(`Uploaded new file: ${relativePath}`);
    }

    // Update metadata after successful sync
    fileMetadataEntry.lastSyncHash = fileHash;
    fileMetadataEntry.lastSyncTime = Date.now();
    fileMetadataEntry.version++;
    syncMetadata.files[relativePath] = fileMetadataEntry;
    saveSyncMetadata(syncMetadata);
  }

  // Helper function to update a file on Google Drive
  async function updateDriveFile(drive, fileId, localPath) {
    const media = {
      mimeType: "application/octet-stream",
      body: fs.createReadStream(localPath),
    };

    await drive.files.update({
      fileId: fileId,
      media: media,
      fields: "id, modifiedTime",
    });
  }

  // Create a conflict copy only when necessary and can't be resolved automatically
  async function createConflictCopy(
    drive,
    localPath,
    fileName,
    parentFolderId,
    fileMetadataEntry
  ) {
    console.log(`Creating conflict copy for: ${fileName}`);
    updateProgress(`Creating conflict copy for: ${fileName}`, null, null);

    // Create a new file with machine ID in the name to avoid conflicts
    const conflictName = `${fileName}.conflict-${machineId}-v${fileMetadataEntry.version}`;

    const fileMetadata = {
      name: conflictName,
      parents: [parentFolderId],
      properties: {
        isConflict: "true",
        machineId: machineId,
        originalName: fileName,
        version: fileMetadataEntry.version.toString(),
      },
    };

    const media = {
      mimeType: "application/octet-stream",
      body: fs.createReadStream(localPath),
    };

    await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id",
    });

    console.log(`Created conflict version: ${conflictName}`);
    updateProgress(
      `Created conflict file for ${fileName}. Please resolve manually.`,
      null,
      null
    );
  }
};

module.exports = {
  syncData,
  checkNeedsSync,
};

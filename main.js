const {
  BrowserWindow,
  app,
  ipcMain,
  Notification,
  screen,
} = require("electron");
const path = require("path");

const { getData } = require("./services/scanner");

const { registerUser } = require("./services/user");
const { matchUser } = require("./services/match");
const { upload } = require("./services/upload");
const {
  stats,
  courseReport,
  lecturerReports,
  generateReport,
  generateMultiReport,
} = require("./services/stats");
const { report } = require("./services/report");
const { login } = require("./services/login");
const { addCourse } = require("./services/addCourse");
const { loadCourse } = require("./services/loadCourses");
const { signUp } = require("./services/signUp");
const { lecturerLogin } = require("./services/lecturerLogin");
const { syncData } = require("./services/sync");
const { downloadData } = require("./services/download");
const { exportAttendanceToExcel } = require("./services/excelExport");
const XLSX = require("xlsx");
const fs = require("fs");
const { dialog } = require("electron");
const isDev = !app.isPackaged;

// Fix: Make sure we're importing correctly
const excelExport = require("./services/excelExport");

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const win = new BrowserWindow({
    width,
    height,
    // backgroundColor: "white",
    icon: path.join(__dirname, "icon.ico"),
    autoHideMenuBar: isDev ? true : true,
    webPreferences: {
      devTools: isDev ? true : false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  win.maximize();
  win.loadFile("index.html");
}

if (isDev) {
  require("electron-reload")(__dirname, {
    electron: path.join(__dirname, "node_modules", ".bin", "electron"),
  });
}

ipcMain.on("notify", (_, message) => {
  new Notification({ title: "Notifiation", body: message }).show();
});
ipcMain.handle("execute", async (event, _id) => {
  await getData(event, isDev, _id);

  // return response;
});
ipcMain.handle("register", async (event, arg) => {
  await registerUser(event, arg);
});
ipcMain.handle("match", async (event, arg) => {
  await matchUser(event, arg);
});
ipcMain.handle("upload-dp", async (event, arg) => {
  await upload(event, arg);
});
ipcMain.handle("get-stats", async (event, arg) => {
  await stats(event, arg);
});
ipcMain.handle("get-report", async (event, arg) => {
  await report(event, arg);
});
ipcMain.handle("get-login", async (event, arg) => {
  await login(event, arg);
});
ipcMain.handle("add-course", async (event, arg) => {
  await addCourse(event, arg);
});
ipcMain.handle("load-course", async (event) => {
  await loadCourse(event);
});
ipcMain.handle("sign-up", async (event, arg) => {
  await signUp(event, arg);
});
ipcMain.handle("lecturer-login", async (event, arg) => {
  await lecturerLogin(event, arg);
});
ipcMain.handle("sync-data", async (event, arg) => {
  await syncData(event, arg);
});
ipcMain.handle("download-data", async (event, arg) => {
  await downloadData(event, arg);
});

// Add these new IPC handlers after your existing handlers

// Handler for generating course reports - fix by using async/await pattern
ipcMain.on("course-report", async (event, course) => {
  try {
    // Generate the report and send back directly
    const reportResult = await generateReport(course);
    event.sender.send("course-report-res", reportResult);
  } catch (error) {
    console.error("Error in course-report handler:", error);
    event.sender.send("course-report-res", {
      success: false,
      error: error.message || "Failed to generate report",
    });
  }
});

// Handler for exporting report to Excel
ipcMain.on("export-report-excel", async (event, courseCode, reportData) => {
  try {
    // Fix: Use the proper import reference
    await excelExport.exportAttendanceToExcel({ event, courseCode, reportData });
  } catch (error) {
    console.error("Error in export-report-excel handler:", error);
    event.sender.send("export-excel-complete", {
      success: false,
      error: error.message || "Failed to export report",
    });
  }
});

app.whenReady().then(createWindow);

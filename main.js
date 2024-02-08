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
const { stats } = require("./services/stats");
const { report } = require("./services/report");
const { login } = require("./services/login");
const { addCourse } = require("./services/addCourse");
const { loadCourse } = require("./services/loadCourses");
const { signUp } = require("./services/signUp");
const { lecturerLogin } = require("./services/lecturerLogin");
const { syncData } = require("./services/sync");
const { downloadData } = require("./services/download");
const isDev = !app.isPackaged;

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
app.whenReady().then(createWindow);

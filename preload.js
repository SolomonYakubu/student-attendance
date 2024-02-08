const { ipcRenderer, contextBridge } = require("electron");

const path = require("path");

const send = (handler) =>
  ipcRenderer.once(handler, (event, result) => {
    return window.postMessage(result);
  });
contextBridge.exposeInMainWorld("electron", {
  notificationApi: {
    sendNotification(message) {
      ipcRenderer.send("notify", message);
    },
  },
  batteryApi: {},
  filesApi: {},
  runScan: (_id) => {
    ipcRenderer.invoke("execute", _id);
    // console.log(res);
    send("scanResult");
    // return res;
  },
  register: (data) => {
    ipcRenderer.invoke("register", data).then(() => {});
    send("reg-stats");
  },
  match: (data) => {
    ipcRenderer.invoke("match", data).then(() => {});
    send("match-res");
  },
  uploadDP: (data) => {
    ipcRenderer.invoke("upload-dp", data).then(() => {});
    send("upload-dp-res");
  },
  stats: (data) => {
    ipcRenderer.invoke("get-stats", data).then(() => {});
    send("stats-res");
  },
  report: (id) => {
    ipcRenderer.invoke("get-report", id).then(() => {});
    send("report-res");
  },
  login: (data) => {
    ipcRenderer.invoke("get-login", data).then(() => {});
    send("login-res");
  },
  addCourse: (data) => {
    ipcRenderer.invoke("add-course", data).then(() => {});
    send("course-res");
  },
  loadCourses: () => {
    ipcRenderer.invoke("load-course").then(() => {});
    send("loadcourse-res");
  },
  signUp: (data) => {
    ipcRenderer.invoke("sign-up", data).then(() => {});
    send("signup-res");
  },
  lecturerLogin: (data) => {
    ipcRenderer.invoke("lecturer-login", data).then(() => {});
    send("lecturer-login-res");
  },
  syncData: () => {
    ipcRenderer.invoke("sync-data").then(() => {});
    send("syncdata-res");
  },
  downloadData: () => {
    ipcRenderer.invoke("download-data").then(() => {});
    send("downloaddata-res");
  },
  path: path,
});

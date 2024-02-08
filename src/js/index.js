import React from "react";
import ReactDOM from "react-dom";
import { transitions, positions, Provider as AlertProvider } from "react-alert";
import AlertTemplate from "react-alert-template-basic";
import App from "./App";
import { HashRouter } from "react-router-dom";
import "./index.css";
const options = {
  // you can also just use 'bottom center'
  position: positions.BOTTOM_CENTER,
  timeout: 1500,
  offset: "30px",
  // you can also just use 'scale'
  transition: transitions.SCALE,
  
};
ReactDOM.render(
  <HashRouter>
    <AlertProvider template={AlertTemplate} {...options}>
      <App />
    </AlertProvider>
  </HashRouter>,
  document.getElementById("root")
);

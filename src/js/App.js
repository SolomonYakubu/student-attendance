import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Register from "./pages/Register";
import Stats from "./pages/Stats";
import Report from "./pages/Report";
import Login from "./pages/Login";
import Courses from "./pages/Courses";
import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Match from "./pages/Match";
import Start from "./pages/Start";
import Splash from "./pages/Splash";
import SignUp from "./pages/SignUp";

export default function App() {
  const [canRoute, setCanRoute] = useState(true);
  const [splash, setSplash] = useState(true);
  const [login, setLogin] = useState(true);
  const [pages, setPages] = useState([
    {
      name: "Home",
      url: "/",
      active: true,
      iconActive: "./src/img/home.gif",
      icon: "./src/img/home.svg",
    },
    {
      name: "Register",
      url: "/register",
      active: false,
      iconActive: "./src/img/register.gif",
      icon: "./src/img/register.svg",
    },
    {
      name: "Take Attendance",
      url: "/match",
      active: false,
      iconActive: "./src/img/attendance.gif",
      icon: "./src/img/attendance.svg",
    },

    {
      name: "Stats",
      url: "/stats",
      active: false,
      iconActive: "./src/img/stats.gif",
      icon: "./src/img/stats.svg",
    },
    {
      name: "Report",
      url: "/report",
      active: false,
      iconActive: "./src/img/report.gif",
      icon: "./src/img/report.svg",
    },
  ]);
  return (
    <>
      {(splash && <Splash setSplash={setSplash} />) ||
        (!login && <Login setLogin={setLogin} />) || (
          <>
            <Sidebar canRoute={canRoute} pages={pages} setPages={setPages} />

            <div className="flex flex-row justify-end items-center w-screen gap-2 min-h-screen transition-all">
              <Routes>
                <Route path="/" element={<Home />} />

                <Route path="/match" element={<Match />} />

                <Route path="/login" element={<Login />} />
                <Route path="/start" element={<Start />} />

                <Route
                  path="/register"
                  element={<Register setCanRoute={setCanRoute} />}
                />

                <Route
                  path="/courses"
                  element={<Courses setCanRoute={setCanRoute} />}
                />
                <Route
                  path="/signup"
                  element={<SignUp setCanRoute={setCanRoute} />}
                />
                <Route
                  path="/stats"
                  element={<Stats setCanRoute={setCanRoute} />}
                />
                <Route
                  path="/report"
                  element={<Report setCanRoute={setCanRoute} />}
                />
              </Routes>
            </div>
          </>
        )}
    </>
  );
}

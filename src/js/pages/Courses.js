import { useState, useEffect } from "react";
import React from "react";
import { useAlert } from "react-alert";
import Sidebar from "../components/Sidebar";

import { Zoom } from "react-reveal";
export default function Courses() {
  const [pages, setPages] = useState([
    {
      name: "Home",
      url: "/start",
      active: true,
      iconActive: "./src/img/home.gif",
      icon: "./src/img/home.svg",
    },
    {
      name: "Login",
      url: "/login",
      active: false,
      iconActive: "./src/img/stats.gif",
      icon: "./src/img/stats.svg",
    },
    {
      name: "Sign Up(Lecturer)",
      url: "/signup",
      active: false,
      iconActive: "./src/img/signup.gif",
      icon: "./src/img/signup.svg",
    },
    {
      name: "Add Course(s)",
      url: "/courses",
      active: false,
      iconActive: "./src/img/course.gif",
      icon: "./src/img/course.svg",
    },
  ]);
  const [courses, setCourses] = useState([]);
  const getCourses = (event) => {
    if (event.source === window) {
      if (event.data.error) {
        alert.show(event.data.status, { type: "error" });
      } else {
        console.log(event.data);
        setCourses(event.data.courses);
      }
    }
    window.removeEventListener("message", getCourses);
  };
  useEffect(() => {
    window.electron.loadCourses();
    window.addEventListener("message", getCourses);
  }, []);
  const alert = useAlert();
  const getResponse = (event) => {
    if (event.source === window) {
      if (event.data.error) {
        alert.show(event.data.status, { type: "error" });
      } else {
        window.electron.loadCourses();
        window.addEventListener("message", getCourses);
        alert.show("Course Registered", { type: "success" });
      }
    }
    window.removeEventListener("message", getResponse);
  };
  const submitCourse = (e) => {
    e.preventDefault();
    const course = e.target.course.value;

    window.electron.addCourse(course);
    e.target.course.value = "";
    window.addEventListener("message", getResponse);
  };
  return (
    <>
      {" "}
      <Sidebar canRoute={true} pages={pages} setPages={setPages} />
      <Zoom>
        <div className="container pt-6 pb-14">
          <h1 className="text-white text-5xl my-5">Register Courses</h1>
          <div className="sub-container flex flex-col items-center justify-center p-5 w-3/5 overflow-y-scroll">
            <form onSubmit={submitCourse} className="flex">
              <input
                type="text"
                placeholder="Input course code"
                className="input"
                id="course"
              />
              <button className="btn btn-primary">Register</button>
            </form>
            <div className="flex items-center justify-center flex-wrap gap-2 m-5 p-3">
              {courses?.map((item, index) => (
                <div key={index} className="rounded-full bg-slate-300 p-1">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Zoom>
    </>
  );
}

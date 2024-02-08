import React, { useState, useEffect } from "react";
import { useAlert } from "react-alert";
import { useNavigate } from "react-router-dom";
import { AiOutlineClose } from "react-icons/ai";
import Sidebar from "../components/Sidebar";

import departments from "../../department.json";
import { Zoom } from "react-reveal";
export default function Login() {
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
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [modal, showModal] = useState(false);
  const [searchCourses, setSearchCourses] = useState();
  const alert = useAlert();
  const navigate = useNavigate();
  const getCourses = (event) => {
    if (event.source === window) {
      if (event.data.error) {
        alert.show(event.data.status, { type: "error" });
      } else {
        setCourses(event.data.courses);
      }
    }
    window.removeEventListener("message", getCourses);
  };
  console.log(selectedCourses);
  useEffect(() => {
    window.electron.loadCourses();
    window.addEventListener("message", getCourses);
  }, []);
  const getResponse = (event) => {
    if (event.source === window) {
      if (event.data.error) {
        alert.show(event.data.status, { type: "error" });
      } else {
        alert.show("Sign Up Successful", { type: "success" });
        setTimeout(() => navigate("/login"), 1500);
      }
    }
    window.removeEventListener("message", getResponse);
  };
  const onSubmit = (e) => {
    e.preventDefault();
    if (e.target.password.value !== e.target.confirm_password.value) {
      alert.show("Passwords do not match", { type: "error" });
      return;
    }
    const name = e.target.name.value;
    const staffID = e.target.staff_id.value;
    const department = e.target.department.value;
    const password = e.target.password.value;
    window.electron.signUp({
      name,
      password,
      department,
      staffID,
      courses: selectedCourses,
    });
    window.addEventListener("message", getResponse);
  };
  return (
    <>
      {" "}
      <Sidebar canRoute={true} pages={pages} setPages={setPages} />
      <Zoom>
        <div className="container pt-6 pb-14">
          {/* Modal */}
          {modal && (
            <div className="absolute shadow-2xl bg-bg2 w-1/2 flex flex-col justify-center items-center p-4 transition-all duration-700 sub-container">
              <h2 className="text-white my-2">Select Courses</h2>
              <div className="flex justify-center items-center border border-white border-solid p-5 gap-4">
                <input
                  type="text"
                  placeholder="Search Course"
                  className="input"
                  id="course"
                  onChange={(e) =>
                    setSearchCourses(
                      courses?.find((item) =>
                        item.includes(e.target.value.toUpperCase())
                      )
                    )
                  }
                />
                {searchCourses && (
                  <div
                    className="rounded-full bg-gray-400 p-2 hover:opacity-30 flex items-center justify-center gap-1"
                    onClick={() => {
                      !selectedCourses.includes(searchCourses) &&
                        setSelectedCourses((val) => [...val, searchCourses]);
                      const newCourses = courses.filter(
                        (val) => val !== searchCourses
                      );
                      setCourses(newCourses);
                      setSearchCourses("");
                    }}
                  >
                    {searchCourses}
                  </div>
                )}
              </div>

              <div className=" flex items-center justify-center flex-wrap gap-3 p-5">
                {courses?.map((item, index) => (
                  <button
                    className="rounded-full bg-gray-400 p-2 hover:opacity-30"
                    key={index}
                    onClick={() => {
                      setSelectedCourses((prev) => [...prev, item]);
                      const newCourses = courses.filter((val) => val !== item);
                      setCourses(newCourses);
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className=" w-4/6 my-5 h-1 bg-white"></div>
              <h2 className="text-white my-2">Selected Courses</h2>
              <div className=" flex items-center justify-center flex-wrap gap-3 p-5">
                {selectedCourses?.map((item, index) => (
                  <div
                    className="rounded-full bg-gray-400 p-2 hover:opacity-30 flex items-center justify-center gap-1"
                    key={index}
                    onClick={() => {
                      setCourses((val) => [...val, item]);
                      const newSelectedCourses = selectedCourses.filter(
                        (val) => val !== item
                      );
                      setSelectedCourses(newSelectedCourses);
                    }}
                  >
                    {item} <AiOutlineClose />
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="btn btn-primary bg-gradient-to-b from-primary to-grad w-100 my-15 fs-16 float-right"
                onClick={() => showModal(false)}
              >
                Done
              </button>
            </div>
          )}
          <form
            className="sub-container flex flex-col items-center justify-center p-5 py-10 w-3/5"
            onSubmit={onSubmit}
          >
            <input
              type="text"
              className="input mb-3 w-full"
              placeholder="Full Name"
              id="name"
              required
            />
            <input
              type="text"
              className="input mb-3 w-full"
              placeholder="Staff ID"
              id="staff_id"
              required
            />

            <select
              id="department"
              className="input w-full  mb-3"
              placeholder="Select Department"
              required
            >
              <option>Select Department</option>
              {departments.courses.map((item, index) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>

            <input
              type="password"
              className="input mb-3 w-full"
              placeholder="Password"
              id="password"
              required
            />
            <input
              type="password"
              className="input mb-3 w-full"
              placeholder="Confirm Password"
              id="confirm_password"
              required
            />
            <div className=" w-full flex flex-col justify-between items-start m-2">
              <button
                type="button"
                className="btn btn-primary bg-gradient-to-b from-green-600 to-green-300 w-100 my-15 fs-16"
                onClick={() => showModal(true)}
              >
                Select Courses
              </button>
            </div>
            <div className=" w-4/6 my-5 h-1 bg-white"></div>
            <h2 className="text-white my-2">Selected Courses</h2>
            <div className=" flex items-center justify-center flex-wrap gap-3 p-5">
              {selectedCourses?.map((item, index) => (
                <div
                  className="rounded-full bg-gray-400 p-2 hover:opacity-30 flex items-center justify-center gap-1"
                  key={index}
                  onClick={() => {
                    setCourses((val) => [...val, item]);
                    const newSelectedCourses = selectedCourses.filter(
                      (val) => val !== item
                    );
                    setSelectedCourses(newSelectedCourses);
                  }}
                >
                  {item} <AiOutlineClose />
                </div>
              ))}
            </div>

            <button className="btn btn-primary font-bold text-lg bg-gradient-to-b from-primary to-grad self-start">
              Sign Up
            </button>
          </form>
        </div>
      </Zoom>
    </>
  );
}

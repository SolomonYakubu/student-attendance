import React, { useState } from "react";
import { useAlert } from "react-alert";
import { useNavigate } from "react-router-dom";
// eslint-disable-next-line react/prop-types
export default function LecturerLogin({ setLoggedIn, setAttendanceCourse }) {
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);

  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const alert = useAlert();
  const getLogin = (event) => {
    if (event.source === window) {
      if (event.data.error) {
        alert.show(event.data.status, { type: "error" });
      } else {
        alert.show("Login Successful", { type: "success" });
        setSuccess(true);

        setCourses(event.data.courses);
      }
    }
    window.removeEventListener("message", getLogin);
  };
  const onSubmit = (e) => {
    e.preventDefault();
    const staffID = e.target.staff_id.value;
    const password = e.target.password.value;
    window.electron.lecturerLogin({ staffID, password });
    window.addEventListener("message", getLogin);
  };
  return (
    <div className="w-screen h-screen flex justify-center items-center">
      {(!success && (
        <form
          className="flex flex-col justify-center items-center p-12 w-1/3   rounded sub-container"
          onSubmit={onSubmit}
        >
          <h1 className="font-bold text-2xl text-white text-center my-4 ">
            Login
          </h1>
          <input
            type="text"
            className="input mb-3 w-full"
            placeholder="Staff ID"
            id="staff_id"
            required
          />
          <input
            type="password"
            className="input mb-3 w-full"
            placeholder="Password"
            id="password"
            required
          />

          <div className="flex items-center justify-start gap-3 my-3 cursor-pointer">
            <p className="text-white self-start">No account yet?</p>
            <p className="text-blue-500 " onClick={() => navigate("/signup")}>
              Sign Up
            </p>
          </div>
          <button className="btn btn-primary font-bold text-lg bg-gradient-to-b from-primary to-grad self-start">
            Login
          </button>
        </form>
      )) || (
        <div className="absolute shadow-2xl sub-container w-1/2 flex flex-col justify-center items-center p-4 transition-all duration-700">
          <h2 className="text-white font-bold text-lg my-2">Select Course</h2>
          <div className=" flex items-center justify-center flex-wrap gap-5 p-5">
            {courses?.map((item, index) => (
              <button
                className={`${
                  item === selectedCourses &&
                  "bg-gradient-to-r from-green-300 to-green-700 font-bold scale-125 shadow-lg shadow-green-200"
                } rounded-full bg-gray-400 p-2 hover:opacity-30 transition-all duration-700`}
                key={index}
                onClick={() => {
                  setSelectedCourses(item);
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            className="btn btn-primary font-bold text-lg bg-gradient-to-b from-primary to-grad my-7"
            onClick={() => {
              setLoggedIn(true);
              setAttendanceCourse(selectedCourses);
            }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

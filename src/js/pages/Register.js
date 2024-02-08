import React, { useState, useEffect } from "react";

import { useAlert } from "react-alert";
import Enroll from "../components/Enroll";
import Upload from "../components/Upload";
import { AiOutlineClose } from "react-icons/ai";
import { Zoom } from "react-reveal";
import departments from "../../department.json";
// eslint-disable-next-line react/prop-types
export default function Register({ setCanRoute }) {
  // const navigate = useNavigate();
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [id, setId] = useState("");
  const [reg, setReg] = useState(false);
  const [_id, set_id] = useState("");
  const [upload, setUpload] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [modal, showModal] = useState(false);
  const [searchCourses, setSearchCourses] = useState();
  const alert = useAlert();
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
  console.log(searchCourses);
  useEffect(() => {
    window.electron.loadCourses();
    window.addEventListener("message", getCourses);
  }, []);
  const getRegStats = (event) => {
    if (event.source === window) {
      console.log(event.data);
      if (event.data.error) {
        alert.show(event.data.status, { type: "error" });
      } else {
        alert.show("Data Recorded Successfully", { type: "success" });
        setName("");
        setDepartment("");
        setId("");
        set_id("");

        setReg(true);

        set_id(event.data._id);
        setCanRoute(false);
      }
    }
    window.removeEventListener("message", getRegStats);
  };
  const onSubmit = (e) => {
    e.preventDefault();
    if (name == "" || id == "" || department == "") {
      alert.show("fill out all fields", { type: "error" });
      return;
    }
    window.electron.register({
      name,
      matric: id,
      department,
      courses: selectedCourses,
    });
    window.addEventListener("message", getRegStats);
  };
  return (
    <Zoom>
      <div className=" flex flex-col py-9 container">
        {/* Modal */}

        {modal && (
          <div className="sub-container absolute shadow-2xl bg-bg2 w-1/2 flex flex-col justify-center items-center p-4 transition-all duration-700">
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
        <div className="flex flex-row justify-around items-center text-white w-40 mb-3">
          <div
            className={`${
              (!reg && !upload && "opacity-100") || "opacity-40"
            } border-solid rounded-full bg-white w-8 h-8`}
          ></div>
          <div
            className={`${
              (reg && !upload && "opacity-100") || "opacity-40"
            } border-solid rounded-full bg-white w-8 h-8`}
          ></div>
          <div
            className={`${
              (reg && upload && "opacity-100") || "opacity-40"
            } border-solid rounded-full bg-white w-8 h-8`}
          ></div>
        </div>
        {!reg && !upload ? (
          <>
            <h1 className=" text-white text-5xl mb-4">Register</h1>
            {/* <input
            type={"button"}
            className="btn btn-secondary w-10"
            style={{ alignSelf: "flex-start" }}
            onClick={() => {
              navigate("/");
            }}
            value="< Back"
          /> */}

            <form
              onSubmit={onSubmit}
              className="sub-container flex flex-col items-center justify-center w-3/5 p-10 "
            >
              <div className=" w-full flex flex-col justify-between items-start m-2">
                <label htmlFor="name" className="text-white">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  className="input w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className=" w-full flex flex-col justify-between items-start m-2">
                <label htmlFor="department" className="text-white fs-16">
                  Department
                </label>

                <select
                  id="department"
                  className="input w-full"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                >
                  {departments.courses.map((item, index) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className=" w-full flex flex-col justify-between items-start m-2">
                <label htmlFor="id" className="text-white fs-16">
                  Matric Number
                </label>
                <input
                  type="text"
                  className="input w-full"
                  id="id"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  required={true}
                />
              </div>
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
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className=" w-full flex flex-col justify-between items-start m-2">
                <button className="btn btn-primary bg-gradient-to-b from-primary to-grad w-100 my-15 fs-16">
                  Submit
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            {(!upload && reg && (
              <Upload setReg={setReg} setUpload={setUpload} _id={_id} />
            )) || (
              <Enroll
                _id={_id}
                setReg={setReg}
                setUpload={setUpload}
                reg={reg}
                setCanRoute={setCanRoute}
              />
            )}
          </>
        )}
      </div>
    </Zoom>
  );
}

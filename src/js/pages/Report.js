import React, { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";

import { useAlert } from "react-alert";
import { Zoom } from "react-reveal";
import { ReportPrint } from "../components/ReportPrint";
export default function Report() {
  const [openModal, setOpenModal] = useState(false);

  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState("");
  const componentRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });
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
  console.log(selectedCourses);
  useEffect(() => {
    window.electron.loadCourses();
    window.addEventListener("message", getCourses);
  }, []);

  return (
    <Zoom>
      <div
        className="container pt-6 pb-14 relative whitespace-pre-wrap"
        ref={componentRef}
      >
        <h1 className="text-white text-5xl my-2">Report</h1>
        {/* Modal */}
        {openModal && (
          <div className="absolute shadow-2xl sub-container w-1/2 flex flex-col justify-center items-center p-4 transition-all duration-700 top-28 bg-bg1 z-30">
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
                setOpenModal(false);
              }}
            >
              Done
            </button>
          </div>
        )}
        <ReportPrint
          selectedCourses={selectedCourses}
          setOpenModal={setOpenModal}
          ref={componentRef}
        />
        <button className="btn btn-primary my-2 " onClick={handlePrint}>
          Print Report
        </button>
      </div>
    </Zoom>
  );
}

import React, { useEffect, useState, useRef, forwardRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { PieChart, Pie } from "recharts";
import { Zoom } from "react-reveal";
import { useReactToPrint } from "react-to-print";
import { useAlert } from "react-alert";
export default forwardRef(function Stats() {
  const [data, setData] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState("");
  // New state variables for reports
  const [report, setReport] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState(null);
  const alert = useAlert();
  const componentRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  // Event listener for course report response
  const handleCourseReportResponse = (event) => {
    if (event.source === window) {
      console.log("Stats received report response:", event.data);
      setIsGeneratingReport(false);

      if (event.data && event.data.success) {
        setReport(event.data.report);
        setReportError(null);
      } else {
        alert.show(event.data.error, { type: "error" });
        setReportError(
          (event.data && event.data.error) || "Failed to generate report"
        );
        setReport(null);
      }
    }
    window.removeEventListener("message", handleCourseReportResponse);
  };

  // Function to generate a detailed report
  const generateDetailedReport = () => {
    if (!selectedCourses) {
      alert.show("Please select a course first", { type: "error" });
      // alert("Please select a course first");
      return;
    }

    console.log(`Requesting report for course: ${selectedCourses}`);
    setIsGeneratingReport(true);
    setReport(null);
    setReportError(null);

    // Add event listener before sending request
    window.addEventListener("message", handleCourseReportResponse);

    // Send the request
    window.electron.courseReport(selectedCourses);
  };

  // Function to export report as Excel
  const exportToExcel = () => {
    if (!report) {
      alert("No report data to export");
      return;
    }

    window.electron.exportReportToExcel(selectedCourses, report);
    window.addEventListener("message", (event) => {
      if (event.source === window) {
        if (event.data.error) {
          console.log("Error exporting report:", event.data.error);
          alert.show(
            "Error exporting report, make sure file is not already open",
            { type: "error" }
          );
        } else {
          console.log("Report exported successfully");
          alert.show("Report exported successfully", { type: "success" });
        }
      }
      window.removeEventListener("message", exportToExcel);
    });
  };

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

  const getStats = (event) => {
    console.log(event.data);
    setData(event.data);
    window.removeEventListener("message", getStats);
  };

  useEffect(() => {
    window.electron.loadCourses();
    window.addEventListener("message", getCourses);
  }, []);

  useEffect(() => {
    if (selectedCourses) {
      window.electron.stats(selectedCourses);
      window.addEventListener("message", getStats);
    }
  }, [selectedCourses]);

  return (
    <Zoom>
      <div className="container pt-6 pb-14 relative">
        <h1 className="text-white text-5xl my-2">Stats</h1>

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

        <div className="sub-container flex flex-col justify-center items-center p-5 w-4/5">
          <div className="flex justify-between w-full mb-4">
            <button
              type="button"
              onClick={() => setOpenModal(true)}
              className="btn btn-primary bg-gradient-to-b from-primary to-green-500"
            >
              Select Course
            </button>

            {/* New Report Generation Button */}
            <button
              type="button"
              onClick={generateDetailedReport}
              disabled={isGeneratingReport || !selectedCourses}
              className={`btn ${
                isGeneratingReport ? "btn-disabled" : "btn-success"
              } bg-gradient-to-b from-blue-500 to-blue-700`}
            >
              {isGeneratingReport
                ? "Generating..."
                : "Generate Detailed Report"}
            </button>
          </div>

          <p className="font-bold text-white my-5 self-start">
            Course: {selectedCourses || "xxxxxx"}
          </p>

          {/* Basic Stats Section */}
          <div className="flex flex-wrap justify-center gap-2 items-start p-8">
            <div className="bg-bg1 text-lg text-white p-3 h-48 w-72 flex flex-col justify-around flex-1">
              <div className="bg-bg2 font-bold w-100 h-2/5 flex items-center p-3">
                Total Enrolled: {data.totalEnrolled}
              </div>
              <div className="bg-bg2 font-bold w-100 h-2/5 flex items-center p-3">
                Marked today: {data.markedToday}
              </div>
              <div className="bg-bg2 font-bold w-100 h-2/5 flex items-center p-3">
                Total Attendance: {data.courseCount}
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <BarChart
                width={500}
                height={300}
                data={data.weekStats}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid stroke="#ccc" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#8884d8" />
                <YAxis dataKey="attendance" stroke="#8884d8" />
                <Tooltip />
                <Legend />
                <Bar dataKey="attendance" fill="#8884d8" />
              </BarChart>
              <h3 className="font-bold text-lg text-white">
                Each Day Attendance Frequency
              </h3>
            </div>
          </div>

          {/* Pie Chart Section */}
          <PieChart width={400} height={400}>
            <Pie
              dataKey="attendance"
              isAnimationActive={true}
              data={data.timeStats}
              cx="50%"
              cy="50%"
              outerRadius={150}
              fill="#8884d8"
              label
              stroke="blue"
              strokeWidth={2}
            />
            <Tooltip />
          </PieChart>
          <h3 className="font-bold text-lg text-white">
            Attendance Frequency By Time
          </h3>

          {/* Defaulters Section */}
          <div
            className="flex flex-col items-center justify-center my-5 bg-inherit shadow-lg py-5 px-5"
            ref={componentRef}
          >
            <h2 className="font-bold text-xl text-white">Defaulters</h2>
            <p className="font-bold text-white my-5 self-start">
              Course: {selectedCourses || "xxxxxx"}
            </p>
            <table className="w-full text-white font-bold ">
              <thead>
                <tr className="font-extrabold">
                  <th className="p-2">S/N</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Matric</th>
                  <th className="p-2">Department</th>
                  <th className="p-2">Rate</th>
                </tr>
              </thead>
              <tbody>
                {data?.defaulters?.map((item, index) => (
                  <tr key={index} className="">
                    <td className="p-2">{index + 1}.</td>
                    <td className="p-2">{item.name}</td>
                    <td className="p-2">{item.matric}</td>
                    <td className="p-2">{item.department}</td>
                    <td className="p-2">{item.percentage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={handlePrint}
              style={{
                padding: "10px",
                color: "#fff",
                background: "#50c878",
                border: "none",
                borderRadius: "10px",
                fontSize: "20px",
                alignSelf: "flex-end",
                marginTop: "20px",
              }}
            >
              Print
            </button>
          </div>

          {/* New Detailed Report Section */}
          {reportError && (
            <div
              className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-5"
              role="alert"
            >
              <p className="font-bold">Error generating report</p>
              <p>{reportError}</p>
            </div>
          )}

          {report && (
            <div className="w-full mt-8 bg-bg1 p-4 rounded-lg shadow-lg">
              <h2 className="text-white text-2xl font-bold mb-4">
                Course Attendance Report
              </h2>
              <div className="flex justify-between items-center mb-4">
                <div className="text-white">
                  <p>
                    <strong>Course:</strong> {report.summary.courseCode}
                  </p>
                  <p>
                    <strong>Total Students:</strong>{" "}
                    {report.summary.totalStudents}
                  </p>
                  <p>
                    <strong>Total Sessions:</strong>{" "}
                    {report.summary.uniqueSessions}
                  </p>
                  <p>
                    <strong>Average Attendance Rate:</strong>{" "}
                    {report.summary.averageAttendanceRate}%
                  </p>
                </div>

                <button
                  onClick={exportToExcel}
                  className="btn btn-success bg-green-600 hover:bg-green-700 px-6 py-3"
                >
                  Export to Excel
                </button>
              </div>

              <h3 className="text-white text-xl font-bold mt-6 mb-3">
                Student Attendance Summary
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="bg-bg2 font-bold">
                      <th className="p-2 text-left">Matric Number</th>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-center">Sessions Attended</th>
                      <th className="p-2 text-center">Total Attendance</th>
                      <th className="p-2 text-center">Attendance Rate</th>
                      <th className="p-2 text-left">Last Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.studentRecords.map((student, index) => (
                      <tr
                        key={index}
                        className={
                          index % 2 === 0 ? "bg-bg2 bg-opacity-30" : ""
                        }
                      >
                        <td className="p-2">{student.matricNumber}</td>
                        <td className="p-2">{student.name}</td>
                        <td className="p-2 text-center">
                          {student.daysAttended} / {student.uniqueSessions}
                        </td>
                        <td className="p-2 text-center">
                          {student.totalAttendanceCount}
                        </td>
                        <td className="p-2 text-center">
                          {student.attendanceRateByDay}%
                        </td>
                        <td className="p-2">
                          {student.lastAttendance.date === "Never attended"
                            ? "Never attended"
                            : `${student.lastAttendance.date} ${student.lastAttendance.time}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Zoom>
  );
});

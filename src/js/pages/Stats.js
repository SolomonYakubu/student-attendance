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
// const data = [
//   {
//     name: "Page A",
//     uv: 4000,
//     pv: 2400,
//     amt: 2400,
//   },
//   {
//     name: "Page B",
//     uv: 3000,
//     pv: 1398,
//     amt: 2210,
//   },
//   {
//     name: "Page C",
//     uv: 2000,
//     pv: 9800,
//     amt: 2290,
//   },
//   {
//     name: "Page D",
//     uv: 2780,
//     pv: 3908,
//     amt: 2000,
//   },
//   {
//     name: "Page E",
//     uv: 1890,
//     pv: 4800,
//     amt: 2181,
//   },
//   {
//     name: "Page F",
//     uv: 2390,
//     pv: 3800,
//     amt: 2500,
//   },
//   {
//     name: "Page G",
//     uv: 3490,
//     pv: 4300,
//     amt: 2100,
//   },
// ];
// const data01 = [
//   { name: "Group A", value: 400 },
//   { name: "Group B", value: 300 },
//   { name: "Group C", value: 300 },
//   { name: "Group D", value: 200 },
//   { name: "Group E", value: 278 },
//   { name: "Group F", value: 189 },
// ];

export default forwardRef(function Stats() {
  const [data, setData] = useState([]);
  const [openModal, setOpenModal] = useState(false);

  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState("");

  const componentRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });
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
  const getStats = (event) => {
    console.log(event.data);
    setData(event.data);

    window.removeEventListener("message", getStats);
  };

  useEffect(() => {
    window.electron.stats(selectedCourses);
    window.addEventListener("message", getStats);
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
          <button
            type="button"
            onClick={() => setOpenModal(true)}
            className="btn btn-primary bg-gradient-to-b from-primary to-green-500"
          >
            Select Course
          </button>
          <p className="font-bold text-white my-5 self-start">
            Course: {selectedCourses || "xxxxxx"}
          </p>
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
                {/* <Bar dataKey="uv" fill="#82ca9d" /> */}
              </BarChart>
              <h3 className="font-bold text-lg text-white">
                Each Day Attendance Frequency
              </h3>
            </div>
          </div>
          {/* <ResponsiveContainer width="100%" height="100%"> */}
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
            {/* <Pie dataKey="value" data={data01} cx={500} cy={200} innerRadius={40} outerRadius={80} fill="#82ca9d" /> */}
            <Tooltip />
          </PieChart>
          <h3 className="font-bold text-lg text-white">
            Attendance Frequency By Time
          </h3>
          {/* </ResponsiveContainer> */}
          <div
            className="flex flex-col items-center justify-center my-5 bg-inherit shadow-lg py-5 px-5"
            ref={componentRef}
          >
            <h2 className="font-bold text-xl text-white">Defaulters</h2>
            <p className="font-bold text-white my-5 self-start">
              Course: {selectedCourses || "xxxxxx"}
            </p>
            <table className="w-full text-white font-bold ">
              <tr className=" font-extrabold">
                <th className="p-2">S/N</th>
                <th className="p-2">Name</th>
                <th className="p-2">Matric</th>
                <th className="p-2">Department</th>
                <th className="p-2">Rate</th>
              </tr>
              {data?.defaulters?.map((item, index) => (
                <tr key={index} className="">
                  <td className="p-2">{index + 1}.</td>
                  <td className="p-2">{item.name}</td>
                  <td className="p-2">{item.matric}</td>
                  <td className="p-2">{item.department}</td>
                  <td className="p-2">{item.percentage}</td>
                </tr>
              ))}
            </table>
            <button
              onClick={handlePrint}
              style={{
                // width: "30vw",
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
        </div>
      </div>
      <div></div>
    </Zoom>
  );
});

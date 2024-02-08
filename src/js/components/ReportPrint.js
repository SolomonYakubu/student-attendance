/* eslint-disable react/display-name */
import React, { useState } from "react";

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
export const ReportPrint = React.forwardRef((props, ref) => {
  const [data, setData] = useState([]);
  const [img, setImg] = useState("");
  const [date, setDate] = useState("");

  const getReport = (event) => {
    window.removeEventListener("message", getReport);

    if (event.data.profile) {
      let today = new Date();
      let dd = String(today.getDate()).padStart(2, "0");
      let mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
      let yyyy = today.getFullYear();
      today = mm + "/" + dd + "/" + yyyy;
      setDate(today);
      setData(event.data);
      const imgPath =
        event.data.profile.dp &&
        window.electron.path.resolve("", event.data.profile.dp);

      setImg(imgPath);
      return;
    }
    alert.show("Student Not Registered", { type: "error" });
  };
  const onSubmit = (e) => {
    e.preventDefault();
    window.electron.report({
      matric: e.target.id.value,
      course: props.selectedCourses,
    });
    window.addEventListener("message", getReport);
  };
  return (
    <div
      className="sub-container flex flex-col items-center justify-center p-5 w-4/5"
      ref={ref}
    >
      <form
        onSubmit={onSubmit}
        className="w-full flex justify-between gap-2 items-center"
      >
        <input
          type={"text"}
          placeholder="Input Matric Number to generate report"
          className="input flex-1"
          id="id"
          required
        />
        <button
          type="button"
          onClick={() => props.setOpenModal(true)}
          className="btn btn-primary bg-gradient-to-b from-primary to-green-500"
        >
          Select Course
        </button>
        <button className="btn btn-primary bg-gradient-to-b from-primary to-grad">
          Generate Report
        </button>
      </form>

      <p className="font-bold text-white my-5 self-start">
        Course: {props.selectedCourses || "xxxxxx"}
      </p>

      <div className="flex justify-between bg-[#0d0d0d] m-3  w-full gap-2 flex-wrap items-start p-3">
        <div className="h-full w-48 mt-3 p-2">
          {
            <>
              {(img && (
                <img
                  className=" w-full h-full"
                  height="300"
                  width="150"
                  src={img}
                  alt=""
                />
              )) || (
                <div className="w-full h-48 bg-[#111111] text-white text-center  flex  p-2">
                  Profile Image
                </div>
              )}{" "}
            </>
          }
        </div>

        <div className=" p-3 text-white  flex flex-col justify-around items-start flex-1">
          <div className="  w-100  flex items-center mb-2">
            Name: {(data && data?.profile?.name) || "xxxxxxxx"}
          </div>
          <div className="  w-100  flex items-center mb-2">
            Student ID: {(data && data?.profile?.matric) || "xxxxxxxx"}
          </div>
          <div className="  w-100  flex items-center mb-2">
            Department: {(data && data?.profile?.department) || "xxxxxxxx"}
          </div>

          <div className="  w-100  flex items-center mb-2">
            Date: {(data && date) || "xxxxxxxx"}
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-2 flex-wrap items-start p-3">
        <div className="bg-bg1 text-white text-lg  p-3 h-48 w-72 flex flex-col justify-around">
          <div className="bg-bg2 font-bold w-100 h-2/5 flex items-center p-3">
            Total Attendance: {data?.totalAttendance} / {data?.courseCount}
          </div>
          <div className="bg-bg2 font-bold w-100 h-2/5 flex items-center p-3">
            Attendance Rate(%):{" "}
            {((data?.totalAttendance / data?.courseCount) * 100).toFixed(2)}
          </div>
          <div className="bg-bg2 font-bold w-100 h-2/5 flex items-center p-3">
            Attendance(This Month): {data?.monthAttendance}
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center">
          <BarChart
            width={500}
            height={300}
            data={data?.weekStats}
            margin={{
              top: 0,
              right: 0,
              left: 0,
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
          data={data?.timeStats}
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
    </div>
  );
});

import React from "react";
import { useNavigate } from "react-router-dom";
// import { fingerprint } from "../../img/test.bmp";
import { GoSignIn } from "react-icons/go";
import { TiTick, TiChartBar } from "react-icons/ti";
import { TbFileReport } from "react-icons/tb";
import { Zoom } from "react-reveal";
export default function Home() {
  const navigate = useNavigate();
  const link = [
    { name: "Register", link: "/register", icon: <GoSignIn size={40} /> },
    { name: "Take Attendance", link: "/match", icon: <TiTick size={40} /> },
    { name: "Stats", link: "/stats", icon: <TiChartBar size={40} /> },
    { name: "Report", link: "/report", icon: <TbFileReport size={40} /> },
  ];

  return (
    <div className="container flex flex-col h-[95vh]">
      <div className="flex justify-between w-1/2 items-center self-end bg-primary bg-opacity-20 rounded p-2 m-1">
        <p className="text-white font-bold text-2xl">
          Staff ID: {JSON.parse(localStorage.getItem("session")).id}
        </p>
        <div className="flex gap-2 self-end p-5">
          <button
            className="btn btn-primary self-end"
            onClick={() => window.electron.syncData()}
          >
            Sync to cloud
          </button>
          <button
            className="btn btn-primary self-end"
            onClick={() => window.electron.downloadData()}
          >
            Download Data
          </button>
          <button
            className="btn  self-end bg-red-600"
            onClick={() => {
              navigate("/login");
            }}
          >
            Logout
          </button>
        </div>
      </div>
      <Zoom>
        {/* <h1 className="text-white text-5xl my-2">Home</h1> */}
        <div className="sub-container flex flex-col items-center justify-center h-3/4 w-3/5">
          <img
            src="./src/img/finger.svg"
            onMouseOver={(e) => {
              e.target.src = "./src/img/finger.gif";
            }}
            onMouseLeave={(e) => {
              e.target.src = "./src/img/finger.svg";
            }}
            className="h-36 w-36 invert"
            // height="200"
            // width="200"
          />
          <div className="h-2/3 w-full flex flex-wrap items-center justify-center gap-2">
            {link.map((item, index) => (
              <div key={index} className=" w-2/5 h-2/5">
                <button
                  className=" btn-primary bg-gradient-to-b from-primary to-grad flex flex-col justify-center items-center rounded-full animate-pulse w-full h-full"
                  onClick={() => {
                    navigate(item.link);
                  }}
                >
                  {item.icon}
                  {item.name}
                </button>
              </div>
            ))}
          </div>
          {/* 
        <div className="h-2/5 w-full flex flex-wrap items-start justify-center gap-x-12">
          {link2.map((item, index) => (
            <div key={index} className=" w-2/5 h-2/3">
              <button
                className=" btn-primary bg-gradient-to-b from-primary to-grad flex flex-col justify-center items-center rounded-lg w-full h-full"
                onClick={() => {
                  navigate(item.link);
                }}
              >
                {item.icon}
                {item.name}
              </button>
            </div>
          ))}
        </div> */}
          {/* <button
          className="btn btn-primary w-4/5 m-2"
          onClick={() => {
            navigate("./match");
          }}
        >
          Take Attendance
        </button>
        <button
          className="btn btn-primary w-4/5 m-2"
          onClick={() => {
            navigate("./register");
          }}
        >
          Register
        </button> */}
          {/* <button
          className="btn btn-primary w-50 m-15"
          onClick={() => {
            navigate("./upload");
          }}
        >
          Upload
        </button> */}
        </div>
      </Zoom>
    </div>
  );
}

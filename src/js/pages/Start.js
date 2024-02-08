import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// import { fingerprint } from "../../img/test.bmp";
import Sidebar from "../components/Sidebar";
import { GoSignIn } from "react-icons/go";
import { TiTick, TiChartBar } from "react-icons/ti";
import { TbFileInvoice, TbFileReport, TbSignLeft } from "react-icons/tb";
import { Zoom } from "react-reveal";
export default function Home() {
  const navigate = useNavigate();
  const link = [
    { name: "Login", link: "/login", icon: <GoSignIn size={40} /> },
    { name: "Sign Up", link: "/signup", icon: <TbSignLeft size={40} /> },
    { name: "Add Course", link: "/courses", icon: <TbFileInvoice size={40} /> },
  ];
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

  return (
    <>
      <Sidebar canRoute={true} pages={pages} setPages={setPages} />

      <div className="container flex flex-col h-[95vh]">
        <Zoom>
          <h1 className="text-white text-5xl my-2">Home</h1>
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
    </>
  );
}

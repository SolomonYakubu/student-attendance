/* eslint-disable react/no-unescaped-entities */
import React from "react";
import { BsArrowBarRight } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
export default function Splash({ setSplash }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-center h-screen w-screen">
      <div className="sub-container p-6 h-4/5 w-3/5 text-white flex flex-col justify-center gap-2 items-center">
        <img
          src="./src/img/finger.svg"
          onMouseOver={(e) => {
            e.target.src = "./src/img/finger.gif";
          }}
          onMouseLeave={(e) => {
            e.target.src = "./src/img/finger.svg";
          }}
          className="h-40 w-40 invert-[70%] animate-bounce"
          // height="200"
          // width="200"
        />
        <h2 className="text-3xl text-center font-bold m-3 bg-primary bg-opacity-20 rounded p-2">
          Fingerprint Biometrics Attendance System Designed for FUTMINNA
        </h2>

        <p>
          Before Clicking "Continue" Make Sure your PC Date/Time is Accurate
        </p>

        <button
          className="btn btn-primary bg-gradient-to-b from-primary to-grad flex justify-center items-center animate-pulse"
          onClick={() => {
            navigate("/start");
            setSplash(false);
          }}
        >
          Continue <BsArrowBarRight size={30} />
        </button>
      </div>
    </div>
  );
}

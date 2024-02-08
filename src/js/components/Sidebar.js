/* eslint-disable react/prop-types */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAlert } from "react-alert";
import Courses from "../pages/Courses";
export default function Sidebar({ canRoute, pages, setPages }) {
  const navigate = useNavigate();
  const alert = useAlert();
  const location = useLocation();
  //   const [indexActive, setIndexActive] = useState(0);
  // const [pages, setPages] = useState(page);
  // useEffect(() => {

  //   console.log(page);

  // }, [navigate, location]);
  const isPage = pages.filter((item) => item.url == location.pathname);
  console.log(pages, isPage);
  const getRoute = useCallback(
    (e) => {
      // setRouteIndex(e?.target.value);
      if (isPage.length < 1) {
        return;
      }
      let index;
      let indexActive = 0;
      for (let i = 0; i < pages?.length; i++) {
        if (pages[i]?.url === location.pathname) {
          index = i;
        }
        if (pages[i]?.active === true) {
          indexActive = i;
        }
      }

      if (location.pathname == "/register" && !canRoute) {
        return alert.show("You must complete registration first", {
          type: "error",
        });
      }
      let newIndex = e?.target?.getAttribute("data-index") || index;

      let newPages = pages;

      newPages[indexActive].active = false;
      newPages[newIndex].active = true;

      setPages(() => newPages);
      e = index;
      navigate(pages[newIndex].url);
    },
    [pages, location, canRoute, setPages]
  );
  useEffect(() => {
    getRoute();
  }, [navigate]);
  return (
    <div
      className={`w-1/5 top-[15%] left-0 fixed h-screen z-40 
       ${isPage.length < 1 && "hidden"}
      `}
    >
      {/* <input
        type={"button"}
        className="btn btn-secondary"
        style={{ alignSelf: "flex-start", fontSize: "16px" }}
        onClick={() => {
          navigate(-2);
        }}
        value="< Back"
      /> */}

      {pages?.map((item, index) => (
        <button
          // value={index}
          key={index}
          data-index={index}
          className={`flex items-center justify-between px-5 text-sm transition-all duration-1000 sub-container  ${
            (item.active && " m-2 sidebar-scale ") || "sidebar m-2"
          }`}
          onClick={getRoute}
        >
          <img
            src={(item.active && item.iconActive) || item.icon}
            height="40"
            width="40"
          />
          {item.name}
        </button>
      ))}
    </div>
  );
}

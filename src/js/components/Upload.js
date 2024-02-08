import React, { useState } from "react";
import Webcam from "react-webcam";
import { useAlert } from "react-alert";
import imageToBase64 from "image-to-base64/browser";
export default function Upload({ _id, setUpload, setReg }) {
  const [img, setImg] = useState();

  const [cam, setCam] = useState(false);
  const [path, setPath] = useState("");
  const alert = useAlert();
  const onImageChange = (e) => {
    const [file] = e.target.files;
    if (!file.path.match("png|jpg|jpeg")) {
      return alert.show("Upload a valid file", { type: "error" });
    }
    // setImg(URL.createObjectURL(file));
    imageToBase64(file.path) // Path to the image
      .then((response) => {
        console.log(response); // "cGF0aC90by9maWxlLmpwZw=="
        setImg(`data:image/jpeg;base64,${response}`);
        setPath(file.path);
      })
      .catch((error) => {
        alert.show("An error occured", { type: "error" });
      });
  };

  const WebcamComponent = () => <Webcam />;
  const videoConstraints = {
    width: 150,
    height: 150,
    facingMode: "user",
  };

  const webcamRef = React.useRef(null);

  const capture = React.useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();

    setImg(imageSrc);
    setPath("");
  }, [webcamRef]);
  const getUploadRes = (event) => {
    if (event.source === window) {
      if (!event.data.error) {
        alert.show(event.data.status, { type: "success" });
        setUpload(true);
        // setReg(false)
      } else {
        alert.show("Something went wrong, try again", { type: "error" });
      }
    }
    window.removeEventListener("message", getUploadRes);
  };
  return (
    <>
      {(!cam && (
        <div
          className="sub-container w-3/5 flex flex-col justify-center items-center p-5"
          style={{ overflow: "hidden" }}
        >
          <div className=" h-2/4 w-2/5 mt-2 p-2 m-4">
            {
              <>
                {(img && (
                  <img className="w-full h-full" src={img} alt="" />
                )) || (
                  <div
                    className="w-full h-full bg-[#0d0d0d] text-white flex flex-row p-2"
                    style={{ textAlign: "center", height: "300px" }}
                  >
                    Click on "Upload" to select an image or "Take Snapshot" to
                    snap a picture then "Next"
                  </div>
                )}{" "}
              </>
            }
          </div>
          <div className="text-white p-3 self-start">
            {(path && path) || "No file chosen"}
          </div>
          <input
            type="file"
            onChange={onImageChange}
            className="custom-file-input btn-primary text-white w-3/4 bg-gradient-to-b from-primary to-grad"
          />

          <button
            className="btn btn-primary w-3/4 m-3 bg-gradient-to-b from-primary to-grad"
            onClick={() => setCam(true)}
          >
            Take Snapshot
          </button>
          <input
            type="button"
            value={"Next >"}
            className="btn btn-secondary fs-16"
            style={{ alignSelf: "flex-end" }}
            onClick={async () => {
              if (img) {
                await electron.uploadDP({
                  img,
                  _id,
                });
                await window.addEventListener("message", getUploadRes);
              } else {
                alert.show("Upload a picture or take a snapshot", {
                  type: "error",
                });
              }
            }}
          />
        </div>
      )) || (
        <div className=" w-4/5 h-[70vh] flex flex-col justify-center items-center sub-container p-4">
          <Webcam
            audio={false}
            height={200}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            width={220}
            videoConstraints={videoConstraints}
            className="w-full mb-3 h-5/6"
          />
          <button
            onClick={(e) => {
              e.preventDefault();
              capture();
              setCam(false);
            }}
            className="btn btn-primary w-3/6 bg-gradient-to-b from-primary to-grad"
          >
            Capture
          </button>
        </div>
      )}
    </>
  );
}

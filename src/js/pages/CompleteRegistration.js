import React, { useState, useEffect } from "react";
import { Zoom } from "react-reveal";
import { useAlert } from "react-alert";
import Upload from "../components/Upload";
import Enroll from "../components/Enroll";
import { AiOutlineLoading } from "react-icons/ai";

export default function CompleteRegistration() {
  const [matric, setMatric] = useState("");
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [needsPhoto, setNeedsPhoto] = useState(false);
  const [needsFingerprint, setNeedsFingerprint] = useState(false);
  const [step, setStep] = useState("search"); // search, photo, fingerprint, complete
  const alert = useAlert();

  // Handle the search response from the backend
  const handleSearchResponse = (event) => {
    if (event.source === window && event.data) {
      setLoading(false);
      console.log("Search response:", event.data);

      if (event.data.type === "findUser") {
        if (event.data.success && event.data.user) {
          setUserData(event.data.user);

          // Determine what registration steps are incomplete
          const user = event.data.user;
          const photoMissing = !user.dp;
          const fingerprintMissing = !user.scanned;

          setNeedsPhoto(photoMissing);
          setNeedsFingerprint(fingerprintMissing);

          if (photoMissing && fingerprintMissing) {
            setStep("photo"); // Start with photo upload if both are missing
            alert.show("Both photo and fingerprint need to be completed", {
              type: "info",
            });
          } else if (photoMissing) {
            setStep("photo");
            alert.show("Photo upload needed", { type: "info" });
          } else if (fingerprintMissing) {
            setStep("fingerprint");
            alert.show("Fingerprint enrollment needed", { type: "info" });
          } else {
            setStep("complete");
            alert.show("Registration is already complete!", {
              type: "success",
            });
          }
        } else {
          alert.show(event.data.error || "Student not found", {
            type: "error",
          });
        }
      }
    }
    window.removeEventListener("message", handleSearchResponse);
  };

  // Search for the student by matric number
  const searchStudent = () => {
    if (!matric) {
      alert.show("Please enter a matric number", { type: "error" });
      return;
    }

    setLoading(true);
    window.addEventListener("message", handleSearchResponse);
    window.electron.findUserByMatric(matric);
  };

  // Move to next step
  const handlePhotoComplete = () => {
    if (needsFingerprint) {
      setStep("fingerprint");
    } else {
      setStep("complete");
    }
  };

  // Handle completion of all steps
  const handleRegistrationComplete = () => {
    setStep("complete");
    alert.show("Registration completed successfully!", { type: "success" });
  };

  return (
    <Zoom>
      <div className="flex flex-col py-9 container">
        <h1 className="text-white text-5xl mb-4">Complete Registration</h1>

        {step === "search" && (
          <div className="sub-container flex flex-col items-center justify-center w-3/5 p-10">
            <p className="text-white mb-4">
              Enter your matric number to complete your registration
            </p>
            <div className="w-full flex flex-col justify-between items-start m-2">
              <label htmlFor="matric" className="text-white fs-16">
                Matric Number
              </label>
              <input
                type="text"
                className="input w-full"
                id="matric"
                value={matric}
                onChange={(e) => setMatric(e.target.value)}
                required={true}
              />
            </div>
            <button
              onClick={searchStudent}
              className="btn btn-primary bg-gradient-to-b from-primary to-grad relative w-full mt-4 disabled:opacity-50 disabled:pointer-events-none"
              disabled={loading}
            >
              {loading && (
                <AiOutlineLoading
                  size={20}
                  className="animate-spin mr-5 absolute left-2"
                />
              )}{" "}
              Search
            </button>
          </div>
        )}

        {step === "photo" && userData && (
          <div className="w-full">
            <div className="mb-4">
              <h2 className="text-white text-2xl">Upload Photo</h2>
              <p className="text-white">
                Complete profile photo upload for {userData.name}
              </p>
            </div>
            <Upload
              _id={userData.id}
              setReg={() => {}}
              setUpload={() => handlePhotoComplete()}
            />
          </div>
        )}

        {step === "fingerprint" && userData && (
          <div className="w-full">
            <div className="mb-4">
              <h2 className="text-white text-2xl">Enroll Fingerprint</h2>
              <p className="text-white">
                Complete fingerprint enrollment for {userData.name}
              </p>
            </div>
            <Enroll
              _id={userData.id}
              setReg={() => {}}
              setUpload={() => {}}
              setCanRoute={() => {}}
              reg={true}
              onComplete={handleRegistrationComplete}
            />
          </div>
        )}

        {step === "complete" && (
          <div className="sub-container flex flex-col items-center justify-center w-3/5 p-10">
            <div className="bg-green-800 bg-opacity-30 p-6 rounded-lg border border-green-600 mb-6">
              <h2 className="text-white text-2xl mb-2">
                Registration Complete!
              </h2>
              <p className="text-white">
                All registration steps have been completed successfully.
              </p>
              {userData && (
                <div className="mt-4">
                  <p className="text-white">
                    <strong>Name:</strong> {userData.name}
                  </p>
                  <p className="text-white">
                    <strong>Matric Number:</strong> {userData.matric}
                  </p>
                  <p className="text-white">
                    <strong>Department:</strong> {userData.department}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => setStep("search")}
              className="btn btn-primary bg-gradient-to-b from-blue-600 to-blue-800"
            >
              Search Another Student
            </button>
          </div>
        )}
      </div>
    </Zoom>
  );
}

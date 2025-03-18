import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Zoom } from "react-reveal";
import { useAlert } from "react-alert";
import departments from "../../department.json";
import {
  FaEdit,
  FaTrashAlt,
  FaSearch,
  FaSortAmountDown,
  FaSortAmountUp,
  FaTimesCircle,
} from "react-icons/fa";
import { debounce } from "lodash";

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingStudent, setEditingStudent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "ascending",
  });
  const [errorMessage, setErrorMessage] = useState(null);
  const [searchCourses, setSearchCourses] = useState("");
  const [availableCourses, setAvailableCourses] = useState([]);
  const alert = useAlert();

  console.log("ManageStudents component rendered");

  // Sort function for students
  const sortStudents = useCallback((studentsArray, sortConfig) => {
    const sortableStudents = [...studentsArray];
    if (sortConfig.key) {
      sortableStudents.sort((a, b) => {
        // Handle null or undefined values
        const valueA = a[sortConfig.key] || "";
        const valueB = b[sortConfig.key] || "";

        if (valueA < valueB) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (valueA > valueB) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableStudents;
  }, []);

  // Request sort handler
  const requestSort = useCallback(
    (key) => {
      let direction = "ascending";
      if (sortConfig.key === key && sortConfig.direction === "ascending") {
        direction = "descending";
      }
      setSortConfig({ key, direction });
    },
    [sortConfig]
  );

  // Consolidated message handler to process all message types
  const handleMessages = useCallback(
    (event) => {
      if (event.source !== window || !event.data) return;

      console.log("ManageStudents received message:", event.data.type);

      // Handle students data
      if (event.data.type === "students") {
        console.log(
          "Processing students data:",
          event.data.students?.length || 0,
          "students"
        );
        if (event.data.success && event.data.students) {
          setStudents(event.data.students);
          setFilteredStudents(sortStudents(event.data.students, sortConfig));
          setErrorMessage(null);
        } else {
          console.error("Error in students response:", event.data.error);
          setErrorMessage(event.data.error || "Failed to load students data");
        }
        setLoading(false);
      }

      // Handle search results
      else if (event.data.type === "searchResults") {
        console.log(
          "Processing search results:",
          event.data.students?.length || 0,
          "results"
        );
        if (event.data.success && event.data.students) {
          // Update filtered students list with search results
          setFilteredStudents(sortStudents(event.data.students, sortConfig));
          setErrorMessage(null);
        } else {
          console.error("Error in search results:", event.data.error);
          setErrorMessage(event.data.error || "Failed to search students");
        }
        setLoading(false);
      }

      // Handle student update response
      else if (event.data.type === "updateStudent") {
        console.log("Processing update response");
        if (event.data.success) {
          alert.show("Student updated successfully", { type: "success" });
          // Refresh the student list
          setLoading(true);
          window.electron.getAllStudents();
        } else {
          alert.show(event.data.error || "Failed to update student", {
            type: "error",
          });
        }
      }

      // Handle student deletion response
      else if (event.data.type === "deleteStudent") {
        console.log("Processing delete response");
        if (event.data.success) {
          alert.show("Student deleted successfully", { type: "success" });
          // Update local state to reflect deletion
          setStudents((prev) =>
            prev.filter((student) => student.id !== studentToDelete)
          );
          setFilteredStudents((prev) =>
            prev.filter((student) => student.id !== studentToDelete)
          );
        } else {
          alert.show(event.data.error || "Failed to delete student", {
            type: "error",
          });
        }
        setShowDeleteModal(false);
        setStudentToDelete(null);
      }
    },
    [alert, sortConfig, sortStudents, studentToDelete]
  );

  // Replace individual event handlers with consolidated handler
  useEffect(() => {
    console.log("Setting up unified message event listener");
    window.addEventListener("message", handleMessages);

    console.log("Requesting initial students data");
    window.electron.getAllStudents();
    window.electron.loadCourses();

    return () => {
      console.log("Cleaning up unified message event listener");
      window.removeEventListener("message", handleMessages);
    };
  }, [handleMessages]);

  // Handle course data response separately since it uses a different structure
  const handleCoursesResponse = useCallback((event) => {
    if (event.source === window && event.data && event.data.courses) {
      console.log("Received courses:", event.data.courses);
      setCourses(event.data.courses);
      setAvailableCourses(event.data.courses);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleCoursesResponse);

    return () => {
      window.removeEventListener("message", handleCoursesResponse);
    };
  }, [handleCoursesResponse]);

  // Modified search function to be more reliable
  const performSearch = useCallback((term) => {
    console.log("Performing search for:", term);
    setLoading(true);
    window.electron.searchStudents(term);
  }, []);

  // Throttled search function
  const debouncedSearch = useMemo(
    () => debounce((term) => performSearch(term), 300),
    [performSearch]
  );

  // Effect to handle search term changes - simplified
  useEffect(() => {
    if (searchTerm && searchTerm.length >= 2) {
      console.log("Search term changed, searching for:", searchTerm);
      debouncedSearch(searchTerm);
    } else if (searchTerm === "") {
      console.log("Search term cleared, showing all students");
      window.electron.getAllStudents();
    }

    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm, debouncedSearch]);

  // Filter available courses based on search
  const getFilteredCourses = () => {
    if (!searchCourses) return availableCourses;

    const searchTermLower = searchCourses.toLowerCase().trim();
    return availableCourses.filter((course) =>
      course.toLowerCase().includes(searchTermLower)
    );
  };

  // Add a selected course
  const addCourse = (course) => {
    if (!selectedCourses.includes(course)) {
      setSelectedCourses((prev) => [...prev, course]);
      setAvailableCourses((prev) => prev.filter((c) => c !== course));
    }
    setSearchCourses("");
  };

  // Remove a selected course
  const removeCourse = (course) => {
    setSelectedCourses((prev) => prev.filter((c) => c !== course));
    setAvailableCourses((prev) => [...prev, course]);
  };

  // Open edit modal with student data
  const handleEditClick = useCallback(
    (student) => {
      console.log("Edit student:", student);
      setEditingStudent({
        ...student,
        department: student.department || "",
      });

      // Reset course selections
      setSelectedCourses(student.courses || []);

      // Update available courses
      if (courses.length) {
        const studentCourses = student.courses || [];
        setAvailableCourses(
          courses.filter((course) => !studentCourses.includes(course))
        );
      }

      setShowEditModal(true);
    },
    [courses]
  );

  // Handle edit form field changes
  const handleEditChange = useCallback((e) => {
    const { name, value } = e.target;
    setEditingStudent((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  // Submit student update - remove unnecessary event listeners
  const handleUpdateStudent = useCallback(() => {
    if (
      !editingStudent.name ||
      !editingStudent.matric ||
      !editingStudent.department
    ) {
      alert.show("Please fill in all required fields", { type: "error" });
      return;
    }

    const updatedStudent = {
      ...editingStudent,
      courses: selectedCourses,
    };

    console.log("Updating student:", updatedStudent);
    window.electron.updateStudent(updatedStudent);
    setShowEditModal(false);
  }, [alert, editingStudent, selectedCourses]);

  // Handle delete confirmation
  const handleDeleteClick = useCallback((studentId) => {
    setStudentToDelete(studentId);
    setShowDeleteModal(true);
  }, []);

  // Confirm and process deletion - remove unnecessary event listeners
  const handleConfirmDelete = useCallback(() => {
    console.log("Deleting student ID:", studentToDelete);
    window.electron.deleteStudent(studentToDelete);
  }, [studentToDelete]);

  // Getting sort indicator
  const getSortIndicator = useCallback(
    (column) => {
      if (sortConfig.key === column) {
        return sortConfig.direction === "ascending" ? (
          <FaSortAmountUp className="inline ml-1" />
        ) : (
          <FaSortAmountDown className="inline ml-1" />
        );
      }
      return null;
    },
    [sortConfig]
  );

  // Show course badges
  const CourseBadges = ({ courses }) => (
    <div className="flex flex-wrap gap-1 justify-center">
      {courses && courses.length > 0 ? (
        courses.slice(0, 2).map((course, i) => (
          <span key={i} className="px-2 py-1 bg-green-700 text-xs rounded-full">
            {course}
          </span>
        ))
      ) : (
        <span>None</span>
      )}
      {courses && courses.length > 2 && (
        <span className="px-2 py-1 bg-blue-700 text-xs rounded-full">
          +{courses.length - 2}
        </span>
      )}
    </div>
  );

  return (
    <Zoom>
      <div className="flex flex-col py-9 container">
        <h1 className="text-white text-5xl mb-4">Manage Students</h1>
        {errorMessage && (
          <div className="mb-6 bg-red-600 text-white p-3 rounded-lg">
            <p className="font-bold">Error</p>
            <p>{errorMessage}</p>
          </div>
        )}
        {/* Search Bar */}
        <div className="sub-container flex flex-col items-center justify-center w-full p-5 mb-6">
          <div className="w-full flex flex-col justify-between items-start m-2">
            <label htmlFor="search" className="text-white">
              Search Students
            </label>
            <div className="relative w-full">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                id="search"
                placeholder="Search by name, matric number, department, or course..."
                className="input w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="w-full flex justify-between items-center mt-4">
            <div className="text-white">
              Found {filteredStudents.length} student
              {filteredStudents.length !== 1 ? "s" : ""}
            </div>
            <div className="stats-badge bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-2 rounded-lg shadow-lg">
              <span className="text-white font-semibold">
                Total: {students.length} students
              </span>
            </div>
          </div>
        </div>
        {/* Students Table */}
        <div className="sub-container flex flex-col items-center justify-center w-full p-5">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
              <p className="text-white ml-3">Loading students data...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-white text-lg mb-2">
                {searchTerm
                  ? "No students match your search"
                  : "No students found"}
              </p>
              <p className="text-gray-400">
                {searchTerm
                  ? "Try adjusting your search criteria"
                  : "Start by adding students through registration"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-white border-collapse">
                <thead>
                  <tr className="bg-bg2 border-b border-gray-700">
                    <th
                      className="p-4 text-left cursor-pointer hover:bg-bg1"
                      onClick={() => requestSort("name")}
                    >
                      Name {getSortIndicator("name")}
                    </th>
                    <th
                      className="p-4 text-left cursor-pointer hover:bg-bg1"
                      onClick={() => requestSort("matric")}
                    >
                      Matric {getSortIndicator("matric")}
                    </th>
                    <th
                      className="p-4 text-left cursor-pointer hover:bg-bg1"
                      onClick={() => requestSort("department")}
                    >
                      Department {getSortIndicator("department")}
                    </th>
                    <th className="p-4 text-center">Courses</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, index) => (
                    <tr
                      key={student.id}
                      className={`border-b border-gray-800 ${
                        index % 2 === 0 ? "bg-bg2 bg-opacity-30" : ""
                      } hover:bg-bg2 hover:bg-opacity-50 transition-colors`}
                    >
                      <td className="p-4 font-medium">
                        {student.name || "N/A"}
                      </td>
                      <td className="p-4">{student.matric || "N/A"}</td>
                      <td className="p-4">{student.department || "N/A"}</td>
                      <td className="p-4 text-center">
                        <CourseBadges courses={student.courses} />
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center space-x-3">
                          <button
                            className="bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 p-2 rounded-lg"
                            onClick={() => handleEditClick(student)}
                            title="Edit student"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="bg-gradient-to-b from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 p-2 rounded-lg"
                            onClick={() => handleDeleteClick(student.id)}
                            title="Delete student"
                          >
                            <FaTrashAlt />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* Edit Modal */}
        {showEditModal && editingStudent && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50 p-4">
            <div className="sub-container absolute shadow-2xl bg-bg2 w-11/12 max-w-2xl flex flex-col justify-center items-center p-6 transition-all duration-700">
              <h2 className="text-white text-2xl font-bold mb-6">
                Edit Student
              </h2>
              <div className="w-full flex flex-col justify-between items-start m-2">
                <label htmlFor="name" className="text-white">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="input w-full"
                  value={editingStudent.name || ""}
                  onChange={handleEditChange}
                />
              </div>
              <div className="w-full flex flex-col justify-between items-start m-2">
                <label htmlFor="matric" className="text-white">
                  Matric Number
                </label>
                <input
                  type="text"
                  id="matric"
                  name="matric"
                  className="input w-full"
                  value={editingStudent.matric || ""}
                  onChange={handleEditChange}
                />
              </div>
              <div className="w-full flex flex-col justify-between items-start m-2">
                <label htmlFor="department" className="text-white">
                  Department
                </label>
                <select
                  id="department"
                  name="department"
                  className="input w-full"
                  value={editingStudent.department || ""}
                  onChange={handleEditChange}
                >
                  <option value="">Select Department</option>
                  {departments.courses.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full flex flex-col justify-between items-start m-2">
                <label className="text-white">Courses</label>
                <div className="flex justify-center items-center border border-white border-solid p-5 gap-4 w-full">
                  <input
                    type="text"
                    placeholder="Search Course"
                    className="input"
                    id="courseSearch"
                    value={searchCourses}
                    onChange={(e) => setSearchCourses(e.target.value)}
                  />
                  {searchCourses && getFilteredCourses().length > 0 && (
                    <div
                      className="rounded-full bg-gray-400 p-2 hover:opacity-30 flex items-center justify-center gap-1"
                      onClick={() => addCourse(getFilteredCourses()[0])}
                    >
                      {getFilteredCourses()[0]}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center flex-wrap gap-3 p-5 w-full">
                  {getFilteredCourses().map((item, index) => (
                    <button
                      className="rounded-full bg-gray-400 p-2 hover:opacity-30"
                      key={index}
                      onClick={() => addCourse(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <div className="w-4/6 my-5 h-1 bg-white"></div>
                <h2 className="text-white my-2">Selected Courses</h2>

                <div className="flex items-center justify-center flex-wrap gap-3 p-5 w-full">
                  {selectedCourses.map((item, index) => (
                    <div
                      className="rounded-full bg-gray-400 p-2 hover:opacity-30 flex items-center justify-center gap-1"
                      key={index}
                      onClick={() => removeCourse(item)}
                    >
                      {item} <FaTimesCircle />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6 w-full">
                {" "}
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  {" "}
                  Cancel{" "}
                </button>{" "}
                <button
                  className="btn btn-primary bg-gradient-to-b from-primary to-grad"
                  onClick={handleUpdateStudent}
                >
                  {" "}
                  Save Changes{" "}
                </button>{" "}
              </div>{" "}
            </div>{" "}
          </div>
        )}{" "}
        {/* Delete Confirmation Modal */}{" "}
        {showDeleteModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50 p-4">
            {" "}
            <div className="sub-container absolute shadow-2xl bg-bg2 w-11/12 max-w-md flex flex-col justify-center items-center p-6 transition-all duration-700">
              {" "}
              <h2 className="text-white text-2xl font-bold mb-4">
                {" "}
                Confirm Deletion{" "}
              </h2>{" "}
              <div className="bg-red-900 bg-opacity-30 border border-red-800 rounded-lg p-4 mb-6 w-full">
                {" "}
                <p className="text-white">
                  {" "}
                  Are you sure you want to delete this student? This action
                  cannot be undone and will remove:{" "}
                </p>{" "}
                <ul className="list-disc list-inside text-white mt-2 space-y-1">
                  {" "}
                  <li>Student data</li> <li>Fingerprint records</li>{" "}
                  <li>Attendance history</li> <li>Profile picture</li>{" "}
                </ul>
              </div>
              <div className="flex justify-end space-x-3 w-full">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setStudentToDelete(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary bg-gradient-to-b from-red-600 to-red-300"
                  onClick={handleConfirmDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Zoom>
  );
}

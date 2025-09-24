import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCourse } from "../../contexts/CourseContext";
import axios from "axios";
import "../styles/Preparation.css";
/**
 * This component is designed for the following lecturer functionality:
 * Creating and managing preparation content per week
 * Full CRUD operations on resources belonging to a specific week
 */
export default function Preparation() {
  // Resource state management

  const { id } = useParams(); // Extract course ID from URL parameters
  const { currentCourse, selectCourse } = useCourse(); // Access course context for current course state
  const [course, setCourse] = useState(currentCourse); // Current course data
  const [loading, setLoading] = useState(!currentCourse); // Loading state for initial data
  const [weeks, setWeeks] = useState([]); // Array of preparation weeks
  const [showCreateWeek, setShowCreateWeek] = useState(false); // Create visibility for the week form
  // Data for the new week form
  const [newWeek, setNewWeek] = useState({
    week_number: "",
    welcome_message: "",
  }); 
  const [showResourceForm, setShowResourceForm] = useState(null); // Which week to show resource form for
  const [editingResource, setEditingResource] = useState(null); // Resource being edited
  const [resourceData, setResourceData] = useState({ title: "", url: "" }); // Data for the resource form

  //Load course data if not available in context
  useEffect(() => {
    if (!currentCourse && id) {
      axios
        .get(`http://localhost:8000/courses/${id}/`)
        .then((res) => {
          setCourse(res.data);
          selectCourse(res.data); // Update global course context
        })
        .catch((err) => console.error("Failed to fetch course:", err))
        .finally(() => setLoading(false));
    }
  }, [id, currentCourse, selectCourse]);
  // Load preparation weeks when course is available
  useEffect(() => {
    if (course) {
      fetchWeeks();
    }
  }, [course]);
  /**
   * Fetches all preparation weeks for the current course
   * Displays error message if fetch fails
   */
  const fetchWeeks = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8000/courses/${id}/preparation/weeks/`
      );
      setWeeks(response.data);
    } catch (error) {
      console.error("Failed to fetch data: ", error);
      alert("Failed to fetch preparation data.");
    }
  };
  /**
   * Creates a new preparation week: lecturer creates week data
   * Resets form and refreshes data on success
   */
  const createWeek = async () => {
    try {
      await axios.post(
        `http://localhost:8000/courses/${id}/preparation/weeks/`,
        newWeek
      );
      setNewWeek({ week_number: "", welcome_message: "" });
      setShowCreateWeek(false);
      fetchWeeks(); // Refresh data after successful creation
    } catch (error) {
      console.error("Failed to create week: ", error);
      alert("Failed to create week.");
    }
  };
  /**
   * Adds a new resource to a specific preparation week
   * @param {number} weekId - ID of the week to add resource to
   * @param {Object} resourceData - Resource data (resource title, url)
   */
  const addResource = async (weekId, resourceData) => {
    try {
      await axios.post(
        `http://localhost:8000/courses/${id}/preparation/weeks/${weekId}/resources/`,
        resourceData
      );
      fetchWeeks(); // Refresh data after successful addition
    } catch (error) {
      console.error("Failed to add resource:", error);
    }
  };
  /**
   * Updates an existing resource within a preparation week
   * @param {number} weekId - ID of the week containing the resource
   * @param {number} resourceId - ID of the resource to update
   * @param {Object} resourceData - Updated resource data
   */
  const updateResource = async (weekId, resourceId, resourceData) => {
    try {
      await axios.put(
        `http://localhost:8000/courses/${id}/preparation/weeks/${weekId}/resources/${resourceId}/`,
        resourceData
      );
      fetchWeeks(); // Refresh data after successful update
    } catch (error) {
      console.error("Failed to update resource:", error);
      alert("Error updating resource.");
    }
  };
  /**
   * Deletes a resource from a preparation week
   * @param {number} weekId - ID of the week containing the resource
   * @param {number} resourceId - ID of the resource to delete
   */
  const deleteResource = async (weekId, resourceId) => {
    try {
      await axios.delete(
        `http://localhost:8000/courses/${id}/preparation/weeks/${weekId}/resources/${resourceId}/`
      );
      fetchWeeks();
    } catch (error) {
      console.error("Failed to delete resource:", error);
      alert("Error deleting resource.");
    }
  };
  /**
   * Toggles the resource form for a specific week
   * Shows/hides the form and manages edit vs create mode
   * @param {number} weekId - ID of the week to manage resources for
   * @param {Object|null} resource - Resource to edit (null for new resource)
   */
  const toggleResourceForm = (weekId, resource = null) => {
    if (showResourceForm === weekId) {
      // Close form and reset all states
      setShowResourceForm(null);
      setEditingResource(null);
      setResourceData({ title: "", url: "" });
    } else {
      // Open form for specific week
      setShowResourceForm(weekId);
      setEditingResource(resource?.id || null);
      // Pre-populate form for editing, or use empty values for new resource
      setResourceData(
        resource
          ? { title: resource.title, url: resource.url }
          : { title: "", url: "" }
      );
    }
  };

  /**
   * Handles resource form submission (create or update)
   * Validates input, calls appropriate API function, and resets form
   * @param {number} weekId - ID of the week the resource belongs to
   */
  const handleResourceSubmit = async (weekId) => {
    // Validate required fields
    if (!resourceData.title || !resourceData.url) {
      alert("Please fill in all fields");
      return;
    }
    // Determine if editing existing resource or creating new one
    if (editingResource) {
      await updateResource(weekId, editingResource, resourceData);
    } else {
      await addResource(weekId, resourceData);
    }
    // Reset form state after successful submission
    setShowResourceForm(null);
    setEditingResource(null);
    setResourceData({ title: "", url: "" });
  };
  // Loading and error states
  if (loading) return <p>Loading preparation tools...</p>;
  if (!course) return <p>Course not found.</p>;

  return (
    <div className="preparation-container">
      <div className="preparation-header">
        <h1>Lecturer Preparation: {course.title}</h1>
      </div>

      <div className="weeks-list">
        <button
          className="accordion"
          onClick={() => setShowCreateWeek(!showCreateWeek)}
        >
          Create New Week
        </button>

        <div className={`panel ${showCreateWeek ? "active" : ""}`}>
          <div className="panel-content">
            <div className="form-group">
              <label>Week Number:</label>
              <input
                type="number"
                value={newWeek.week_number}
                placeholder="e.g., 3"
                onChange={(e) =>
                  setNewWeek({ ...newWeek, week_number: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Welcome Message:</label>
              <textarea
                value={newWeek.welcome_message}
                placeholder="e.g., Welcome to Week 3! This week, we will..."
                onChange={(e) =>
                  setNewWeek({ ...newWeek, welcome_message: e.target.value })
                }
              />
            </div>
            <div className="form-actions">
              <button className="form-button1" onClick={createWeek}>
                {" "}
                Create
              </button>
            </div>
          </div>
        </div>
        {weeks.map((week) => (
          <div key={week.id} className="week-card">
            <div className="week-header">
              <h2>Week {week.week_number}</h2>
              <p>{week.welcome_message}</p>
            </div>

            <div className="week-content">
              <div className="resources-section">
                <div className="resources-header">
                  <button
                    className="accordion"
                    onClick={() => toggleResourceForm(week.id)}
                  >
                    Add Resource
                  </button>
                </div>

                <div
                  className={`panel ${
                    showResourceForm === week.id ? "active" : ""
                  }`}
                >
                  <div className="panel-content">
                    <div className="form-group">
                      <label>Title:</label>
                      <input
                        type="text"
                        value={resourceData.title}
                        placeholder="e.g., Day 1 ..."
                        onChange={(e) =>
                          setResourceData({
                            ...resourceData,
                            title: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Link:</label>
                      <input
                        type="url"
                        value={resourceData.url}
                        placeholder="e.g., https://..."
                        onChange={(e) =>
                          setResourceData({
                            ...resourceData,
                            url: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-actions">
                      <button
                        className="form-button1"
                        onClick={() => handleResourceSubmit(week.id)}
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                </div>

                <div className="resources-list">
                  {week.preparation_resources.map((resource) => (
                    <div key={resource.id} className="resource-item">
                      <div className="resource-info">
                        <p>
                          <strong>{resource.title}</strong>
                        </p>
                        <a href={resource.url}>{resource.url}</a>
                      </div>
                      <div className="resource-actions">
                        <button
                          className="form-button1"
                          onClick={() => toggleResourceForm(week.id, resource)}
                        >
                          Edit
                        </button>
                        <button
                          className="form-button2"
                          onClick={() => {
                            deleteResource(week.id, resource.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

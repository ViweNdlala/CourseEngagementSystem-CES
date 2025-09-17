import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCourse } from "../../contexts/CourseContext";
import axios from "axios";
import "../styles/Preparation.css";

export default function Preparation() {
  const { id } = useParams();
  const { currentCourse, selectCourse } = useCourse();
  const [course, setCourse] = useState(currentCourse);
  const [loading, setLoading] = useState(!currentCourse);
  const [weeks, setWeeks] = useState([]);
  const [showCreateWeek, setShowCreateWeek] = useState(false);
  const [newWeek, setNewWeek] = useState({
    week_number: "",
    welcome_message: "",
  });

  const [showResourceForm, setShowResourceForm] = useState(null);
  const [editingResource, setEditingResource] = useState(null);
  const [resourceData, setResourceData] = useState({ title: "", url: "" });

  useEffect(() => {
    if (!currentCourse && id) {
      axios
        .get(`http://localhost:8000/courses/${id}/`)
        .then((res) => {
          setCourse(res.data);
          selectCourse(res.data);
        })
        .catch((err) => console.error("Failed to fetch course:", err))
        .finally(() => setLoading(false));
    }
  }, [id, currentCourse, selectCourse]);

  useEffect(() => {
    if (course) {
      fetchWeeks();
    }
  }, [course]);

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

  const createWeek = async () => {
    try {
      await axios.post(
        `http://localhost:8000/courses/${id}/preparation/weeks/`,
        newWeek
      );
      setNewWeek({ week_number: "", welcome_message: "" });
      setShowCreateWeek(false);
      fetchWeeks();
    } catch (error) {
      console.error("Failed to create week: ", error);
      alert("Failed to create week.");
    }
  };

  const addResource = async (weekId, resourceData) => {
    try {
      await axios.post(
        `http://localhost:8000/courses/${id}/preparation/weeks/${weekId}/resources/`,
        resourceData
      );
      fetchWeeks();
    } catch (error) {
      console.error("Failed to add resource:", error);
    }
  };

  const updateResource = async (weekId, resourceId, resourceData) => {
    try {
      await axios.put(
        `http://localhost:8000/courses/${id}/preparation/weeks/${weekId}/resources/${resourceId}/`,
        resourceData
      );
      fetchWeeks();
    } catch (error) {
      console.error("Failed to update resource:", error);
      alert("Error updating resource.");
    }
  };

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

  const toggleResourceForm = (weekId, resource = null) => {
    if (showResourceForm === weekId) {
      setShowResourceForm(null);
      setEditingResource(null);
      setResourceData({ title: "", url: "" });
    } else {
      setShowResourceForm(weekId);
      setEditingResource(resource?.id || null);
      setResourceData(
        resource
          ? { title: resource.title, url: resource.url }
          : { title: "", url: "" }
      );
    }
  };

  const handleResourceSubmit = async (weekId) => {
    if (!resourceData.title || !resourceData.url) {
      alert("Please fill in all fields");
      return;
    }

    if (editingResource) {
      await updateResource(weekId, editingResource, resourceData);
    } else {
      await addResource(weekId, resourceData);
    }

    setShowResourceForm(null);
    setEditingResource(null);
    setResourceData({ title: "", url: "" });
  };
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
              <button 
              className="form-button1" 
              onClick={createWeek}> Create</button>
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

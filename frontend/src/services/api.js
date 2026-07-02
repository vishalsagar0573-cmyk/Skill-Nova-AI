import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export const uploadResume = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axios.post(`${API_URL}/resume/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getJobMatches = async (userId) => {
  const response = await axios.get(`${API_URL}/jobs/match/${userId}`);
  return response.data;
};

export const getCourseRecommendations = async (missingSkills) => {
  const response = await axios.post(`${API_URL}/recommendations/courses`, {
    missing_skills: missingSkills
  });
  return response.data;
};

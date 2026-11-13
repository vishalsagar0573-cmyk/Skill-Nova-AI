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

export const getLearningPath = async () => {
  const response = await axios.get(`${API_URL}/learning-path/me`);
  return response.data;
};

export const updateStepProgress = async (resourceId, status) => {
  const response = await axios.post(`${API_URL}/learning-path/progress`, {
    resource_id: resourceId,
    status: status
  });
  return response.data;
};

export const updateCapstoneStatus = async (status) => {
  const response = await axios.post(`${API_URL}/learning-path/capstone-status`, {
    status: status
  });
  return response.data;
};

export const submitStepEvidence = async (payload) => {
  const response = await axios.post(`${API_URL}/learning-path/step-evidence`, payload);
  return response.data;
};

export const submitCapstoneEvidence = async (payload) => {
  const response = await axios.post(`${API_URL}/learning-path/capstone-evidence`, payload);
  return response.data;
};

export const reviewEvidence = async (payload) => {
  const response = await axios.post(`${API_URL}/learning-path/review-evidence`, payload);
  return response.data;
};

export const getPendingReviews = async () => {
  const response = await axios.get(`${API_URL}/learning-path/pending-reviews`);
  return response.data;
};


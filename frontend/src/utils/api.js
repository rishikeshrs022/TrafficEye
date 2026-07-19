import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  register: (username, password, role) => api.post('/auth/register', { username, password, role }),
};

export const cameraAPI = {
  getCameras: () => api.get('/cameras'),
  addCamera: (cameraData) => api.post('/cameras', cameraData),
};

export const trafficAPI = {
  getTraffic: (limit = 50) => api.get(`/traffic?limit=${limit}`),
  getVehicleLogs: (limit = 100) => api.get(`/vehicle-logs?limit=${limit}`),
};

export const signalAPI = {
  getSignals: () => api.get('/signals'),
  overrideSignal: (id, overrideData) => api.post(`/signals/${id}/override`, overrideData),
};

export const emergencyAPI = {
  getEvents: (limit = 50) => api.get(`/emergency?limit=${limit}`),
  triggerCorridor: (camera_id, vehicle_type) => api.post('/emergency', { camera_id, vehicle_type }),
};

export const crowdAPI = {
  getCrowd: (limit = 50) => api.get(`/crowd?limit=${limit}`),
};

export const aqiAPI = {
  getAQI: (limit = 50) => api.get(`/aqi?limit=${limit}`),
};

export const alertAPI = {
  getAlerts: (status = 'Active') => api.get(`/alerts?status=${status}`),
  createAlert: (alertData) => api.post('/alerts', alertData),
};

export const reportAPI = {
  getCSVReportURL: () => `${API_BASE_URL}/reports/download?format=csv`,
  getJSONReport: () => api.get('/reports/download?format=json'),
};

export default api;

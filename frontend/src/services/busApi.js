import axios from 'axios';

const API = axios.create({ baseURL: '/' });

// Attach JWT to every request if present
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('sb_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Bus endpoints
export const getAllBuses = () => API.get('/buses');
export const searchBuses = (source, destination) =>
  API.get(`/buses/search?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}`);
export const addBus = (data) => API.post('/buses/add', data);
export const deleteBus = (id) => API.delete(`/buses/${id}`);

// Auth endpoints
export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);
export const googleLogin = (credential) => API.post('/auth/google', { credential });
export const getMe = () => API.get('/auth/me');

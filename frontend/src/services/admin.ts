import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


export const createPartner = async (data: {
  name: string;
  phone: string;
  serviceZone: string;
}) => {
  const res = await api.post('/admin/partners', data);
  return res.data;
};


export const getPartners = async () => {
  const res = await api.get('/admin/partners');
  return res.data;
};


export const getAutoAssignmentLog = async () => {
  const res = await api.get('/admin/assignments');
  return res.data;
};
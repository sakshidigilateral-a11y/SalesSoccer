import axios from 'axios';
import {API_BASE_URL} from '@env';
console.log('Check API URL', API_BASE_URL);
const api = axios.create({
  baseURL: 'http://192.168.1.7:5450/api',
  timeout: 1000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;

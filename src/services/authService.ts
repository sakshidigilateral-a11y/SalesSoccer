import api from './apiConfig';

export const loginUser = async (loginData: object) => {
  console.log('Login Data Sent:', loginData);
  return api.post('/auth/login', loginData);
};

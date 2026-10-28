import { http } from './instance.js';

/** @param {{ email: string, birthDate: string, username: string, password: string }} body */
export const register = (body) => http.post('/auth/register', body);

/** @param {{ identifier: string, password: string }} body */
export const login = (body) => http.post('/auth/login', body);

export const logout = () => http.post('/auth/logout');

/** @returns {Promise<{ user: { id: string, username: string, createdAt: string }, expiresAt: string }>} */
export const getCurrentSession = () => http.get('/auth/me');

/** @param {string} email */
export const requestPasswordRecovery = (email) => http.post('/auth/password-recovery', { email });

/** @param {{ token: string, password: string }} body */
export const resetPassword = (body) => http.post('/auth/password-reset', body);

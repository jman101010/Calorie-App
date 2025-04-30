// src/services/AuthService.js
// This service handles all authentication-related functionality

const API_URL = 'http://localhost:3001/api';

// Token storage and retrieval
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// Save authentication data
const saveAuth = (token, userData) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(userData));
};

// Get authentication token
const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

// Get user data
const getUser = () => {
  const userStr = localStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

// Check if user is logged in
const isLoggedIn = () => {
  return !!getToken();
};

// Clear authentication data (logout)
const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// JWT token parsing (to see content)
const parseJwt = (token) => {
  try {
    // Extract the payload part of the JWT (the second part)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error parsing JWT token:', e);
    return null;
  }
};

// Check if token is expired
const isTokenExpired = () => {
  const token = getToken();
  if (!token) return true;
  
  const decoded = parseJwt(token);
  if (!decoded) return true;
  
  // JWT exp is in seconds, Date.now() is in milliseconds
  return decoded.exp * 1000 < Date.now();
};

// Create authorization header for API requests
const authHeader = () => {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Login function
const login = async (username, password) => {
  const response = await fetch(`${API_URL}/users/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Login failed');
  }
  
  const data = await response.json();
  
  // Save auth data
  saveAuth(data.token, {
    id: data.userId,
    username: data.username,
    email: data.email
  });
  
  return data;
};

// Register function
const register = async (username, email, password) => {
  const response = await fetch(`${API_URL}/users/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, email, password })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Registration failed');
  }
  
  return await response.json();
};

// Logout function
const logout = () => {
  clearAuth();
};

// Export all functions
const AuthService = {
  login,
  register,
  logout,
  getToken,
  getUser,
  isLoggedIn,
  isTokenExpired,
  authHeader,
  parseJwt
};

export default AuthService;
import axios from 'axios';

let accessTokenMemory = null;
let onTokenRefreshedCallback = null;
let onAuthFailedCallback = null;

export const setAccessToken = (token) => {
  accessTokenMemory = token;
};

export const getAccessToken = () => {
  return accessTokenMemory;
};

export const setAuthCallbacks = ({ onTokenRefreshed, onAuthFailed }) => {
  onTokenRefreshedCallback = onTokenRefreshed;
  onAuthFailedCallback = onAuthFailed;
};

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // Enables sending HTTP-only refresh token cookie
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach in-memory access token
api.interceptors.request.use(
  (config) => {
    if (accessTokenMemory) {
      config.headers['Authorization'] = `Bearer ${accessTokenMemory}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle transparent token rotation on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not retry refresh route or non-401 errors
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/refresh') &&
      !originalRequest.url.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await api.post('/auth/refresh');
        const { accessToken, user } = refreshResponse.data.data;
        
        setAccessToken(accessToken);
        if (onTokenRefreshedCallback) {
          onTokenRefreshedCallback(accessToken, user);
        }

        processQueue(null, accessToken);
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setAccessToken(null);
        if (onAuthFailedCallback) {
          onAuthFailedCallback();
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

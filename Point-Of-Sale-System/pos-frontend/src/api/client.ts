import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import camelcaseKeys from 'camelcase-keys';
import { useAuthStore } from '../store/authStore';
import snakecaseKeys from 'snakecase-keys';

const apiBaseUrl = import.meta.env.VITE_API_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let refreshPromise: Promise<string> | null = null;

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
    config.data = snakecaseKeys(config.data, { deep: true });
  }
  // Also convert params
  if (config.params && typeof config.params === 'object') {
    config.params = snakecaseKeys(config.params, { deep: true });
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object') {
      response.data = camelcaseKeys(response.data, { deep: true });
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const requestUrl = originalRequest?.url || '';
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !requestUrl.includes('/auth/login') &&
      !requestUrl.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshClient
            .post('/auth/refresh')
            .then(({ data }) => {
              const responseData = data && typeof data === 'object'
                ? camelcaseKeys(data, { deep: true })
                : data;
              return responseData.accessToken as string;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const accessToken = await refreshPromise;
        useAuthStore.getState().setAccessToken(accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError as AxiosError);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

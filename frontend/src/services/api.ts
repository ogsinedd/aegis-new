import axios from "axios";

// Базовый URL API
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

// Создаем экземпляр axios с базовым URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 секунд таймаут
});

// Добавление токена авторизации, если есть
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Улучшенный обработчик ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage = error.response?.data?.message || error.message || "Произошла ошибка";
    
    // Обработка ошибок авторизации
    if (error.response?.status === 401) {
      // Очистка localStorage при истечении токена
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
    }
    
    return Promise.reject({
      status: error.response?.status || 500,
      message: errorMessage,
      data: error.response?.data
    });
  }
);

export default api; 

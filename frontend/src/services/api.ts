import axios from "axios";

// Базовый URL API
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

// Создаем экземпляр axios с базовым URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Обработчик ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response || error);
    return Promise.reject(error);
  }
);

export default api; 

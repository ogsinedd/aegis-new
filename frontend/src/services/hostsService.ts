import api from "./api";

export interface Host {
  id: string;
  name: string;
  address: string;
  port: number;
  description?: string;
}

export interface HostCreate {
  name: string;
  address: string;
  port: number;
  description?: string;
}

export interface HostUpdate {
  name?: string;
  address?: string;
  port?: number;
  description?: string;
}

export const hostsService = {
  // Получить список всех хостов
  getHosts: async (): Promise<Host[]> => {
    const response = await api.get("/hosts");
    return response.data;
  },

  // Получить хост по ID
  getHost: async (id: string): Promise<Host> => {
    const response = await api.get(`/hosts/${id}`);
    return response.data;
  },

  // Создать новый хост
  createHost: async (host: HostCreate): Promise<Host> => {
    const response = await api.post("/hosts", host);
    return response.data;
  },

  // Обновить существующий хост
  updateHost: async (id: string, host: HostUpdate): Promise<Host> => {
    const response = await api.put(`/hosts/${id}`, host);
    return response.data;
  },

  // Удалить хост
  deleteHost: async (id: string): Promise<boolean> => {
    const response = await api.delete(`/hosts/${id}`);
    return response.data;
  },
}; 

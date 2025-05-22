import api from "./api";

export type ContainerStatus = "idle" | "scanning" | "scanned" | "error";

export interface Container {
  container_id: string;
  host_id: string;
  name: string;
  image: string;
  status: ContainerStatus;
}

export const containersService = {
  // Получить список контейнеров для хоста
  getContainers: async (hostId: string, refresh: boolean = false): Promise<Container[]> => {
    const response = await api.get(`/hosts/${hostId}/containers`, {
      params: { refresh },
    });
    return response.data;
  },

  // Подписаться на обновления контейнеров через SSE
  subscribeToContainerUpdates: (callback: (event: MessageEvent) => void) => {
    const eventSource = new EventSource(`${api.defaults.baseURL}/containers/stream`);
    
    eventSource.onmessage = callback;
    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
      eventSource.close();
    };
    
    return () => {
      eventSource.close();
    };
  },
}; 

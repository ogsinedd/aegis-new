import api from "./api";

export type ScanStatus = "pending" | "running" | "completed" | "error";

export interface ScanRequest {
  host_id: string;
  container_id: string;
}

export interface ScanHistory {
  scan_id: string;
  host_id: string;
  container_id: string;
  status: ScanStatus;
  started_at: string;
  finished_at?: string;
}

export interface Vulnerability {
  id: string;
  scan_id: string;
  cve_id: string;
  cvss: string;
  severity: string;
  description?: string;
  recommendation?: string;
  details?: any;
}

export interface ScanResult extends ScanHistory {
  vulnerabilities: Vulnerability[];
}

// Интерфейс для сценариев исправления уязвимостей
export interface RemediationStrategy {
  id: string;
  name: string;
  description: string;
  estimatedTime: number; // в секундах
  type: 'hot-patch' | 'rolling-update' | 'restart';
}

// Оценка времени простоя
export interface DowntimeEstimate {
  estimated_time: number; // в секундах
  affected_containers: number;
  strategy: string;
}

export interface Scan {
  scan_id: string;
  host_id: string;
  container_id: string;
  started_at: string;
  finished_at?: string;
  status: "pending" | "running" | "completed" | "error";
  vulnerability_count?: number;
}

export interface RemediationRequest {
  scan_id: string;
  vulnerability_id?: string;
  strategy: "hot-patch" | "rolling-update" | "restart";
}

export const scanService = {
  // Получить историю сканирований
  getScanHistory: async (): Promise<Scan[]> => {
    const response = await api.get("/v1/scan");
    return response.data;
  },

  // Получить данные конкретного сканирования
  getScan: async (scanId: string): Promise<Scan> => {
    const response = await api.get(`/v1/scan/${scanId}`);
    return response.data;
  },

  // Запустить новое сканирование
  startScan: async (request: ScanRequest): Promise<Scan> => {
    const response = await api.post("/v1/scan", request);
    return response.data;
  },

  // Получить уязвимости
  getVulnerabilities: async (params?: { 
    host_id?: string; 
    container_id?: string;
    scan_id?: string;
  }): Promise<Vulnerability[]> => {
    const response = await api.get("/v1/vulnerabilities", { params });
    return response.data;
  },

  // Запросить оценку времени простоя для применения исправления
  estimateDowntime: async (request: RemediationRequest): Promise<DowntimeEstimate> => {
    const response = await api.post("/v1/remediation/estimate", request);
    return response.data;
  },

  // Применить исправление
  applyRemediation: async (request: RemediationRequest): Promise<any> => {
    const response = await api.post("/v1/remediation/apply", request);
    return response.data;
  },

  // Экспортировать отчет о сканировании
  exportReport: async (scanId: string, format: 'json' | 'csv' = 'json'): Promise<Blob> => {
    const response = await api.get(`/v1/scan/${scanId}/report`, { 
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  },

  // Вспомогательная функция для скачивания отчета
  downloadReport: async (scanId: string, format: 'json' | 'csv' = 'json'): Promise<void> => {
    try {
      const blob = await scanService.exportReport(scanId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aegis-scan-report-${scanId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  },

  // Получить доступные стратегии исправления
  getRemediationStrategies: (): RemediationStrategy[] => {
    return [
      {
        id: 'hot-patch',
        name: 'Hot Patch',
        description: 'Применение патча без перезапуска контейнера',
        estimatedTime: 30, // 30 секунд
        type: 'hot-patch'
      },
      {
        id: 'rolling-update',
        name: 'Rolling Update',
        description: 'Обновление контейнеров по одному',
        estimatedTime: 120, // 2 минуты
        type: 'rolling-update'
      },
      {
        id: 'restart',
        name: 'Restart',
        description: 'Перезапуск контейнера с обновленным образом',
        estimatedTime: 60, // 1 минута
        type: 'restart'
      },
    ];
  },

  // Получить статус и результаты сканирования
  getScanStatus: async (scanId: string): Promise<ScanResult> => {
    const response = await api.get(`/scan/${scanId}`);
    return response.data;
  },

  // Скачать отчет сканирования
  downloadScanReport: async (scanId: string, format: 'json' | 'csv' = 'json'): Promise<Blob> => {
    const response = await api.get(`/scan/${scanId}/report`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  }
}; 

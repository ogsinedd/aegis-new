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
  cvss?: string;
  severity?: string;
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
  totalTime: number; // в секундах
  affectedContainers: number;
}

export const scanService = {
  // Начать новое сканирование
  startScan: async (request: ScanRequest): Promise<ScanHistory> => {
    const response = await api.post("/scan", request);
    return response.data;
  },

  // Получить статус и результаты сканирования
  getScanStatus: async (scanId: string): Promise<ScanResult> => {
    const response = await api.get(`/scan/${scanId}`);
    return response.data;
  },

  // Получить историю сканирований
  getScanHistory: async (skip: number = 0, limit: number = 100): Promise<ScanHistory[]> => {
    const response = await api.get("/scan/history", {
      params: { skip, limit },
    });
    return response.data;
  },

  // Получить уязвимости с фильтрацией
  getVulnerabilities: async (
    params: {
      scan_id?: string;
      host_id?: string;
      container_id?: string;
      skip?: number;
      limit?: number;
    } = {}
  ): Promise<Vulnerability[]> => {
    const response = await api.get("/scan/vulnerabilities", { params });
    return response.data;
  },

  // Скачать отчет сканирования
  downloadScanReport: async (scanId: string, format: 'json' | 'csv' = 'json'): Promise<Blob> => {
    const response = await api.get(`/scan/${scanId}/report`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
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

  // Применить стратегию исправления
  applyRemediation: async (
    vulnerabilityId: string, 
    strategyId: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/remediation`, {
      vulnerability_id: vulnerabilityId,
      strategy_id: strategyId,
    });
    return response.data;
  },

  // Рассчитать оценку времени простоя
  estimateDowntime: async (
    containerIds: string[], 
    strategyId: string,
    parallelism: number = 1
  ): Promise<DowntimeEstimate> => {
    const strategies = scanService.getRemediationStrategies();
    const strategy = strategies.find(s => s.id === strategyId);
    
    if (!strategy) {
      throw new Error('Стратегия не найдена');
    }
    
    const containerCount = containerIds.length;
    const batchCount = Math.ceil(containerCount / parallelism);
    const totalTime = batchCount * strategy.estimatedTime;
    
    return {
      totalTime,
      affectedContainers: containerCount
    };
  }
}; 

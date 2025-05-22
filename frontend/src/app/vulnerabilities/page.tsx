"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Vulnerability, scanService } from "@/services/scanService";
import { Host, hostsService } from "@/services/hostsService";
import { Container, containersService } from "@/services/containersService";
import VulnerabilitiesTable from "@/components/vulnerabilities/VulnerabilitiesTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

function VulnerabilitiesContent() {
  const searchParams = useSearchParams();
  
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);

  // Загрузка хостов
  const fetchHosts = async () => {
    try {
      const data = await hostsService.getHosts();
      setHosts(data);
    } catch (error) {
      console.error("Ошибка при загрузке хостов:", error);
    }
  };

  // Загрузка контейнеров для выбранного хоста
  const fetchContainers = async (hostId: string) => {
    try {
      const data = await containersService.getContainers(hostId);
      setContainers(data);
    } catch (error) {
      console.error(`Ошибка при загрузке контейнеров для хоста ${hostId}:`, error);
    }
  };

  // Загрузка уязвимостей с учетом фильтров
  const fetchVulnerabilities = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      
      if (selectedScanId) {
        params.scan_id = selectedScanId;
      } else {
        if (selectedHostId) params.host_id = selectedHostId;
        if (selectedContainerId) params.container_id = selectedContainerId;
      }
      
      const data = await scanService.getVulnerabilities(params);
      setVulnerabilities(data);
    } catch (error) {
      console.error("Ошибка при загрузке уязвимостей:", error);
      toast.error("Не удалось загрузить список уязвимостей");
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчики изменения фильтров
  const handleHostChange = (hostId: string) => {
    setSelectedHostId(hostId);
    setSelectedContainerId(null);
    fetchContainers(hostId);
  };

  const handleContainerChange = (containerId: string) => {
    setSelectedContainerId(containerId);
  };

  const handleApplyFilters = () => {
    fetchVulnerabilities();
  };

  const handleResetFilters = () => {
    setSelectedHostId(null);
    setSelectedContainerId(null);
    setSelectedScanId(null);
    
    // Если есть scan_id в параметрах, сохраняем его
    const scanIdParam = searchParams.get("scan_id");
    if (scanIdParam) {
      setSelectedScanId(scanIdParam);
    }
    
    fetchVulnerabilities();
  };

  // Инициализация
  useEffect(() => {
    const init = async () => {
      // Загружаем хосты для фильтров
      await fetchHosts();
      
      // Проверяем параметры URL
      const scanIdParam = searchParams.get("scan_id");
      const hostIdParam = searchParams.get("host_id");
      const containerIdParam = searchParams.get("container_id");
      
      if (scanIdParam) {
        setSelectedScanId(scanIdParam);
      } else {
        if (hostIdParam) {
          setSelectedHostId(hostIdParam);
          await fetchContainers(hostIdParam);
          
          if (containerIdParam) {
            setSelectedContainerId(containerIdParam);
          }
        }
      }
      
      // Загружаем уязвимости
      await fetchVulnerabilities();
    };
    
    init();
  }, [searchParams]);

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h1 className="text-2xl font-bold">Уязвимости</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Фильтры</CardTitle>
            <CardDescription>
              {selectedScanId ? 
                "Просмотр уязвимостей для конкретного сканирования" : 
                "Выберите параметры для фильтрации уязвимостей"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Хост
                </label>
                <Select
                  value={selectedHostId || ""}
                  onValueChange={handleHostChange}
                  disabled={!!selectedScanId || hosts.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите хост" />
                  </SelectTrigger>
                  <SelectContent>
                    {hosts.map((host) => (
                      <SelectItem key={host.id} value={host.id}>
                        {host.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Контейнер
                </label>
                <Select
                  value={selectedContainerId || ""}
                  onValueChange={handleContainerChange}
                  disabled={!selectedHostId || !!selectedScanId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите контейнер" />
                  </SelectTrigger>
                  <SelectContent>
                    {containers.map((container) => (
                      <SelectItem key={container.container_id} value={container.container_id}>
                        {container.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end gap-2">
                <Button 
                  onClick={handleApplyFilters}
                  disabled={(!selectedHostId && !selectedContainerId && !selectedScanId) || isLoading}
                >
                  Применить фильтры
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleResetFilters}
                  disabled={isLoading}
                >
                  Сбросить
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse">Загрузка...</div>
        </div>
      ) : (
        <VulnerabilitiesTable 
          vulnerabilities={vulnerabilities} 
          onRefresh={fetchVulnerabilities} 
        />
      )}
    </div>
  );
}

export default function VulnerabilitiesPage() {
  return (
    <Suspense fallback={<div className="container mx-auto flex justify-center items-center h-64">Загрузка...</div>}>
      <VulnerabilitiesContent />
    </Suspense>
  );
} 

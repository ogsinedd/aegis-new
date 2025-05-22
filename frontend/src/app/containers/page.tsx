"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Container, containersService } from "@/services/containersService";
import { Host, hostsService } from "@/services/hostsService";
import ContainersTable from "@/components/containers/ContainersTable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ContainersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [containers, setContainers] = useState<Container[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedHostId, setSelectedHostId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Получение списка хостов
  const fetchHosts = async () => {
    try {
      const data = await hostsService.getHosts();
      setHosts(data);
      
      // Если есть host_id в URL и он существует в списке хостов
      const hostIdParam = searchParams.get("host_id");
      if (hostIdParam && data.some(host => host.id === hostIdParam)) {
        setSelectedHostId(hostIdParam);
      } else if (data.length > 0) {
        // Если нет host_id в URL, но есть хосты, выбираем первый
        setSelectedHostId(data[0].id);
      }
    } catch (error) {
      console.error("Ошибка при загрузке хостов:", error);
      toast.error("Не удалось загрузить список хостов");
    }
  };

  // Получение списка контейнеров для выбранного хоста
  const fetchContainers = async (hostId: string, refresh: boolean = false) => {
    if (!hostId) return;
    
    setIsLoading(true);
    try {
      const data = await containersService.getContainers(hostId, refresh);
      setContainers(data);
    } catch (error) {
      console.error(`Ошибка при загрузке контейнеров для хоста ${hostId}:`, error);
      toast.error("Не удалось загрузить список контейнеров");
    } finally {
      setIsLoading(false);
    }
  };

  // При изменении выбранного хоста обновляем URL и загружаем контейнеры
  const handleHostChange = (hostId: string) => {
    setSelectedHostId(hostId);
    router.push(`/containers?host_id=${hostId}`);
    fetchContainers(hostId, true);
  };

  // Инициализация - загружаем хосты
  useEffect(() => {
    fetchHosts();
  }, []);

  // При изменении selectedHostId загружаем контейнеры
  useEffect(() => {
    if (selectedHostId) {
      fetchContainers(selectedHostId);
    }
  }, [selectedHostId]);

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">Контейнеры</h1>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
            <div className="w-full sm:w-64">
              <Select
                value={selectedHostId}
                onValueChange={handleHostChange}
                disabled={hosts.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите хост" />
                </SelectTrigger>
                <SelectContent>
                  {hosts.map((host) => (
                    <SelectItem key={host.id} value={host.id}>
                      {host.name} ({host.address})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse">Загрузка...</div>
        </div>
      ) : !selectedHostId ? (
        <div className="text-center p-8 border rounded-md">
          <p className="text-muted-foreground mb-4">Не выбран хост для отображения контейнеров</p>
          {hosts.length === 0 ? (
            <Button onClick={() => router.push("/")}>
              Добавить хост
            </Button>
          ) : (
            <p>Выберите хост из списка выше</p>
          )}
        </div>
      ) : (
        <ContainersTable 
          containers={containers} 
          hostId={selectedHostId} 
          onRefresh={() => fetchContainers(selectedHostId, true)} 
        />
      )}
    </div>
  );
} 

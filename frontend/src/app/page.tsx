"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Host, hostsService } from "@/services/hostsService";
import HostsTable from "@/components/hosts/HostsTable";

export default function HomePage() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHosts = async () => {
    setIsLoading(true);
    try {
      const data = await hostsService.getHosts();
      setHosts(data);
    } catch (error) {
      console.error("Ошибка при загрузке хостов:", error);
      toast.error("Не удалось загрузить список хостов");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHosts();
  }, []);

  return (
    <div className="container mx-auto">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse">Загрузка...</div>
        </div>
      ) : (
        <HostsTable hosts={hosts} onRefresh={fetchHosts} />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ScanHistory, scanService } from "@/services/scanService";
import ScanHistoryTable from "@/components/scans/ScanHistoryTable";

export default function ScanHistoryPage() {
  const [scans, setScans] = useState<ScanHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchScanHistory = async () => {
    setIsLoading(true);
    try {
      const data = await scanService.getScanHistory();
      setScans(data);
    } catch (error) {
      console.error("Ошибка при загрузке истории сканирований:", error);
      toast.error("Не удалось загрузить историю сканирований");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScanHistory();
  }, []);

  return (
    <div className="container mx-auto">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse">Загрузка...</div>
        </div>
      ) : (
        <ScanHistoryTable scans={scans} onRefresh={fetchScanHistory} />
      )}
    </div>
  );
} 

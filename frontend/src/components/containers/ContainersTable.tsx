import { useState } from "react";
import { Search, RefreshCw, Shield } from "lucide-react";
import { toast } from "sonner";
import { Container } from "@/services/containersService";
import { ScanRequest, scanService } from "@/services/scanService";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ContainersTableProps {
  containers: Container[];
  hostId: string;
  onRefresh: () => void;
}

export default function ContainersTable({ containers, hostId, onRefresh }: ContainersTableProps) {
  const [scanningIds, setScanningIds] = useState<Set<string>>(new Set());

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return <Badge className="bg-green-500">Running</Badge>;
      case "exited":
        return <Badge variant="outline">Stopped</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getScanStatusBadge = (status: string) => {
    switch (status) {
      case "idle":
        return <Badge variant="outline">Не сканировался</Badge>;
      case "scanning":
        return <Badge className="bg-orange-500">Сканирование</Badge>;
      case "scanned":
        return <Badge className="bg-green-500">Просканирован</Badge>;
      case "error":
        return <Badge variant="destructive">Ошибка</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleScan = async (containerId: string) => {
    if (scanningIds.has(containerId)) {
      return;
    }

    setScanningIds((prev) => new Set(prev).add(containerId));

    try {
      const scanRequest: ScanRequest = {
        host_id: hostId,
        container_id: containerId,
      };

      const result = await scanService.startScan(scanRequest);
      toast.success("Сканирование запущено");
      
      // Обновить список контейнеров после запуска сканирования
      onRefresh();
    } catch (error) {
      toast.error("Ошибка при запуске сканирования");
      console.error(error);
    } finally {
      setScanningIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(containerId);
        return newSet;
      });
    }
  };

  return (
    <>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Контейнеры</h2>
        <div className="flex gap-2">
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Обновить
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableCaption>Список контейнеров на выбранном хосте</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Имя</TableHead>
              <TableHead>Образ</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Статус сканирования</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {containers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground">Контейнеры не найдены</p>
                </TableCell>
              </TableRow>
            ) : (
              containers.map((container) => (
                <TableRow key={`${container.host_id}-${container.container_id}`}>
                  <TableCell className="font-mono text-xs">
                    {container.container_id.substring(0, 12)}
                  </TableCell>
                  <TableCell>{container.name}</TableCell>
                  <TableCell>{container.image}</TableCell>
                  <TableCell>{getStatusBadge(container.status)}</TableCell>
                  <TableCell>{getScanStatusBadge(container.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleScan(container.container_id)}
                              disabled={scanningIds.has(container.container_id) || container.status === "scanning"}
                            >
                              {scanningIds.has(container.container_id) ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Shield className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Сканировать</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
} 

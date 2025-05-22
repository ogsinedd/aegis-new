import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, ExternalLink, Info, FileJson, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ScanHistory, scanService, ScanStatus } from "@/services/scanService";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ScanHistoryTableProps {
  scans: ScanHistory[];
  onRefresh: () => void;
}

export default function ScanHistoryTable({ scans, onRefresh }: ScanHistoryTableProps) {
  const router = useRouter();
  const [selectedScan, setSelectedScan] = useState<ScanHistory | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const getStatusBadge = (status: ScanStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Ожидание</Badge>;
      case "running":
        return <Badge className="bg-orange-500">В процессе</Badge>;
      case "completed":
        return <Badge className="bg-green-500">Завершено</Badge>;
      case "error":
        return <Badge variant="destructive">Ошибка</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    try {
      return format(new Date(dateString), "dd.MM.yyyy HH:mm");
    } catch (error) {
      return dateString;
    }
  };

  const handleViewResults = (scanId: string) => {
    router.push(`/vulnerabilities?scan_id=${scanId}`);
  };

  const downloadReport = async (scanId: string, format: 'json' | 'csv') => {
    setIsDownloading(true);
    try {
      const blob = await scanService.downloadScanReport(scanId, format);
      
      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scan-report-${scanId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Отчет успешно скачан в формате ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Ошибка при скачивании отчета:", error);
      toast.error("Не удалось скачать отчет");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold">История сканирований</h2>
        <Button onClick={onRefresh} variant="outline" size="sm">
          Обновить
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableCaption>История сканирований контейнеров</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>ID сканирования</TableHead>
              <TableHead>Хост</TableHead>
              <TableHead>Контейнер</TableHead>
              <TableHead>Дата начала</TableHead>
              <TableHead>Дата завершения</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <p className="text-muted-foreground">История сканирований пуста</p>
                </TableCell>
              </TableRow>
            ) : (
              scans.map((scan) => (
                <TableRow key={scan.scan_id}>
                  <TableCell className="font-mono text-xs">
                    {scan.scan_id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>{scan.host_id}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {scan.container_id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>{formatDate(scan.started_at)}</TableCell>
                  <TableCell>{formatDate(scan.finished_at)}</TableCell>
                  <TableCell>{getStatusBadge(scan.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {scan.status === "completed" && (
                        <>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleViewResults(scan.scan_id)}
                                >
                                  <Info className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Просмотр результатов</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <DropdownMenu>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      disabled={isDownloading}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Скачать отчет</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => downloadReport(scan.scan_id, 'json')}
                                disabled={isDownloading}
                              >
                                <FileJson className="mr-2 h-4 w-4" />
                                <span>JSON формат</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => downloadReport(scan.scan_id, 'csv')}
                                disabled={isDownloading}
                              >
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                <span>CSV формат</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
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

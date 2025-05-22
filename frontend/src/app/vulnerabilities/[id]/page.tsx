"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  Vulnerability, 
  scanService, 
  RemediationRequest,
  DowntimeEstimate
} from "@/services/scanService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { Clock, AlertTriangle, Download, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function VulnerabilityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vulnerabilityId = params.id as string;
  
  const [vulnerability, setVulnerability] = useState<Vulnerability | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [strategies, setStrategies] = useState<{ id: string; name: string; description: string }[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<"hot-patch" | "rolling-update" | "restart" | null>(null);
  const [downtimeEstimate, setDowntimeEstimate] = useState<DowntimeEstimate | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isRemediating, setIsRemediating] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Загрузка данных об уязвимости
        // В реальном приложении нужно реализовать метод getVulnerabilityById
        const vulnerabilities = await scanService.getVulnerabilities();
        const vuln = vulnerabilities.find(v => v.id === vulnerabilityId);
        
        if (vuln) {
          setVulnerability(vuln);
        } else {
          toast.error("Уязвимость не найдена");
          router.push("/vulnerabilities");
        }
        
        // Загрузка доступных стратегий
        const fetchedStrategies = await scanService.getRemediationStrategies();
        setStrategies(fetchedStrategies);
        
      } catch (error) {
        console.error("Ошибка при загрузке данных:", error);
        toast.error("Не удалось загрузить информацию об уязвимости");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [vulnerabilityId, router]);

  const handleStrategyChange = async (value: string) => {
    setSelectedStrategy(value as "hot-patch" | "rolling-update" | "restart");
    if (vulnerability?.scan_id) {
      setIsEstimating(true);
      try {
        const request: RemediationRequest = {
          scan_id: vulnerability.scan_id,
          vulnerability_id: vulnerabilityId,
          strategy: value as "hot-patch" | "rolling-update" | "restart",
        };
        
        const estimate = await scanService.estimateDowntime(request);
        setDowntimeEstimate(estimate);
      } catch (error) {
        console.error("Ошибка при оценке времени простоя:", error);
        toast.error("Не удалось оценить время простоя");
      } finally {
        setIsEstimating(false);
      }
    }
  };

  const handleApplyRemediation = async () => {
    if (!vulnerability?.scan_id || !selectedStrategy) return;
    
    setIsRemediating(true);
    try {
      const request: RemediationRequest = {
        scan_id: vulnerability.scan_id,
        vulnerability_id: vulnerabilityId,
        strategy: selectedStrategy,
      };
      
      await scanService.applyRemediation(request);
      toast.success("Процесс исправления запущен успешно");
      setConfirmDialogOpen(false);
    } catch (error) {
      console.error("Ошибка при применении исправления:", error);
      toast.error("Не удалось применить исправление");
    } finally {
      setIsRemediating(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!vulnerability?.scan_id) return;
    
    try {
      await scanService.downloadReport(vulnerability.scan_id, 'json');
      toast.success("Отчет загружен");
    } catch (error) {
      console.error("Ошибка при скачивании отчета:", error);
      toast.error("Не удалось скачать отчет");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-pulse">Загрузка...</div>
      </div>
    );
  }

  if (!vulnerability) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl">Уязвимость не найдена</h2>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => router.push("/vulnerabilities")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Вернуться к списку
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Button 
        variant="outline" 
        className="mb-4"
        onClick={() => router.push("/vulnerabilities")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Назад к списку
      </Button>
      
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{vulnerability.cve_id}</CardTitle>
              <CardDescription>
                CVSS: {vulnerability.cvss || 'Не определено'}
              </CardDescription>
            </div>
            <Badge 
              className={`${getSeverityColor(vulnerability.severity)} text-white`}
            >
              {vulnerability.severity || 'Не определено'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Описание</h3>
            <p className="text-muted-foreground">
              {vulnerability.description || 'Описание отсутствует'}
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Рекомендации</h3>
            <p className="text-muted-foreground">
              {vulnerability.recommendation || 'Рекомендации отсутствуют'}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handleDownloadReport}
          >
            <Download className="mr-2 h-4 w-4" />
            Скачать отчет
          </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Исправление уязвимости</CardTitle>
          <CardDescription>
            Выберите стратегию исправления и оцените время простоя
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Стратегия исправления
            </label>
            <Select
              value={selectedStrategy || undefined}
              onValueChange={handleStrategyChange}
              disabled={isEstimating || isRemediating}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите стратегию" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Доступные стратегии</SelectLabel>
                  {strategies.map((strategy) => (
                    <SelectItem key={strategy.id} value={strategy.id}>
                      {strategy.name} - {strategy.description}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          
          {downtimeEstimate && (
            <div className="rounded-md border p-4">
              <div className="flex items-center space-x-4">
                <Clock className="h-10 w-10 text-muted-foreground" />
                <div>
                  <h3 className="font-medium">Оценка времени простоя</h3>
                  <p className="text-muted-foreground">
                    Стратегия: {downtimeEstimate.strategy}
                  </p>
                  <p className="text-muted-foreground">
                    Затрагиваемые контейнеры: {downtimeEstimate.affected_containers}
                  </p>
                  <p className="text-muted-foreground">
                    Приблизительное время: {Math.round(downtimeEstimate.estimated_time / 60)} минут
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={() => setConfirmDialogOpen(true)} 
            disabled={!selectedStrategy || isEstimating || isRemediating}
            className="w-full"
          >
            {isEstimating ? "Оценка времени..." : "Применить исправление"}
          </Button>
        </CardFooter>
      </Card>
      
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтвердите исправление</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите применить стратегию "{strategies.find(s => s.id === selectedStrategy)?.name}" 
              для исправления уязвимости {vulnerability.cve_id}?
            </DialogDescription>
          </DialogHeader>
          
          {downtimeEstimate && (
            <div className="rounded-md border p-4 my-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">Предупреждение о простое</p>
                  <p className="text-sm text-muted-foreground">
                    Ожидаемое время простоя: {Math.round(downtimeEstimate.estimated_time / 60)} минут
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialogOpen(false)}
              disabled={isRemediating}
            >
              Отмена
            </Button>
            <Button 
              onClick={handleApplyRemediation}
              disabled={isRemediating}
            >
              {isRemediating ? "Применение..." : "Применить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 

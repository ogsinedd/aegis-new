import { useState } from "react";
import { Download, ExternalLink, Clock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { 
  Vulnerability, 
  RemediationStrategy, 
  scanService,
  DowntimeEstimate
} from "@/services/scanService";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface VulnerabilitiesTableProps {
  vulnerabilities: Vulnerability[];
  onRefresh: () => void;
}

export default function VulnerabilitiesTable({ vulnerabilities, onRefresh }: VulnerabilitiesTableProps) {
  const [selectedVulnerability, setSelectedVulnerability] = useState<Vulnerability | null>(null);
  const [remediationDialogOpen, setRemediationDialogOpen] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("");
  const [isApplying, setIsApplying] = useState(false);
  const [downtimeEstimate, setDowntimeEstimate] = useState<DowntimeEstimate | null>(null);

  const remediationStrategies = scanService.getRemediationStrategies();

  const getSeverityBadge = (severity: string = "unknown") => {
    severity = severity.toLowerCase();
    switch (severity) {
      case "critical":
        return <Badge className="severity-critical">Critical</Badge>;
      case "high":
        return <Badge className="severity-high">High</Badge>;
      case "medium":
        return <Badge className="severity-medium">Medium</Badge>;
      case "low":
        return <Badge className="severity-low">Low</Badge>;
      default:
        return <Badge className="severity-unknown">Unknown</Badge>;
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} сек`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} мин`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} ч ${minutes} мин`;
    }
  };

  const handleOpenRemediation = (vulnerability: Vulnerability) => {
    setSelectedVulnerability(vulnerability);
    setSelectedStrategyId(remediationStrategies[0]?.id || "");
    setRemediationDialogOpen(true);
    
    // Рассчитываем оценку времени простоя
    calculateDowntime(vulnerability, remediationStrategies[0]?.id || "");
  };

  const calculateDowntime = async (vulnerability: Vulnerability, strategyId: string) => {
    try {
      // В реальном приложении здесь должны быть данные о контейнерах, 
      // на которые повлияет исправление
      const containerIds = ["container1"]; // Заглушка
      const parallelism = 1; // Заглушка, в реальном приложении должно быть настраиваемым
      
      const estimate = await scanService.estimateDowntime(containerIds, strategyId, parallelism);
      setDowntimeEstimate(estimate);
    } catch (error) {
      console.error("Ошибка при расчете времени простоя:", error);
      toast.error("Не удалось рассчитать время простоя");
    }
  };

  const handleStrategyChange = (value: string) => {
    setSelectedStrategyId(value);
    if (selectedVulnerability) {
      calculateDowntime(selectedVulnerability, value);
    }
  };

  const handleApplyRemediation = async () => {
    if (!selectedVulnerability || !selectedStrategyId) {
      toast.error("Выберите уязвимость и стратегию исправления");
      return;
    }

    setIsApplying(true);
    try {
      const result = await scanService.applyRemediation(
        selectedVulnerability.id,
        selectedStrategyId
      );
      
      if (result.success) {
        toast.success(result.message || "Исправление успешно применено");
        onRefresh();
      } else {
        toast.error(result.message || "Ошибка при применении исправления");
      }
      
      setRemediationDialogOpen(false);
    } catch (error) {
      console.error("Ошибка при применении исправления:", error);
      toast.error("Ошибка при применении исправления");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Уязвимости</h2>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableCaption>Список обнаруженных уязвимостей</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>CVE ID</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>CVSS</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead>Рекомендации</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vulnerabilities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground">Уязвимости не найдены</p>
                </TableCell>
              </TableRow>
            ) : (
              vulnerabilities.map((vulnerability) => (
                <TableRow key={vulnerability.id}>
                  <TableCell className="font-mono">
                    <a 
                      href={`https://nvd.nist.gov/vuln/detail/${vulnerability.cve_id}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center hover:underline"
                    >
                      {vulnerability.cve_id}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell>{getSeverityBadge(vulnerability.severity)}</TableCell>
                  <TableCell>{vulnerability.cvss || "N/A"}</TableCell>
                  <TableCell className="max-w-md">
                    <div className="truncate">
                      {vulnerability.description || "Нет описания"}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="truncate">
                      {vulnerability.recommendation || "Нет рекомендаций"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleOpenRemediation(vulnerability)}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Применить исправление</p>
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

      {/* Диалог выбора стратегии исправления */}
      <Dialog open={remediationDialogOpen} onOpenChange={setRemediationDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Применить исправление</DialogTitle>
            <DialogDescription>
              Выберите стратегию исправления для уязвимости {selectedVulnerability?.cve_id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedVulnerability && (
            <div className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <h3 className="font-medium mb-1">Описание уязвимости</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedVulnerability.description || "Нет описания"}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">Рекомендации</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedVulnerability.recommendation || "Нет рекомендаций"}
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Выберите стратегию исправления</h3>
                <Select 
                  value={selectedStrategyId} 
                  onValueChange={handleStrategyChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите стратегию" />
                  </SelectTrigger>
                  <SelectContent>
                    {remediationStrategies.map((strategy) => (
                      <SelectItem key={strategy.id} value={strategy.id}>
                        {strategy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedStrategyId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Детали стратегии</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>
                      {remediationStrategies.find(s => s.id === selectedStrategyId)?.description}
                    </p>
                    
                    {downtimeEstimate && (
                      <div className="mt-4 p-3 bg-muted rounded-md">
                        <div className="flex items-center mb-2">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          <h4 className="font-medium">Estimated Downtime</h4>
                        </div>
                        <p className="text-sm">
                          Затронуто контейнеров: {downtimeEstimate.affectedContainers}
                        </p>
                        <p className="text-sm">
                          Ожидаемое время простоя: {formatTime(downtimeEstimate.totalTime)}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemediationDialogOpen(false)}
              disabled={isApplying}
            >
              Отмена
            </Button>
            <Button
              onClick={handleApplyRemediation}
              disabled={isApplying || !selectedStrategyId}
            >
              {isApplying ? "Применение..." : "Применить исправление"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 

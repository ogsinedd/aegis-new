"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Trash, Server, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Host, hostsService } from "@/services/hostsService";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface HostsTableProps {
  hosts: Host[];
  onRefresh: () => void;
}

export default function HostsTable({ hosts, onRefresh }: HostsTableProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [hostToDelete, setHostToDelete] = useState<Host | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleViewContainers = (hostId: string) => {
    router.push(`/containers?host_id=${hostId}`);
  };

  const handleEdit = (host: Host) => {
    router.push(`/hosts/edit/${host.id}`);
  };

  const handleDelete = async () => {
    if (!hostToDelete) return;
    
    setIsLoading(true);
    try {
      await hostsService.deleteHost(hostToDelete.id);
      toast.success(`Хост ${hostToDelete.name} успешно удален`);
      onRefresh();
    } catch (error) {
      toast.error("Ошибка при удалении хоста");
      console.error(error);
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setHostToDelete(null);
    }
  };

  const confirmDelete = (host: Host) => {
    setHostToDelete(host);
    setDeleteDialogOpen(true);
  };

  const handleScanAll = async (hostId: string) => {
    try {
      setIsLoading(true);
      // Здесь будет API-вызов для сканирования контейнеров
      // await containersService.scanAll(hostId);
      toast.success("Запущено сканирование всех контейнеров");
    } catch (error) {
      toast.error("Ошибка при запуске сканирования");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Хосты Docker</h2>
        <div className="flex gap-2">
          <Button onClick={onRefresh} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          <Button onClick={() => router.push('/hosts/add')} size="sm">
            Добавить хост
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableCaption>Список всех настроенных хостов Docker</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Имя</TableHead>
              <TableHead>Адрес</TableHead>
              <TableHead>Порт</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hosts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <p className="text-muted-foreground">Хосты не найдены</p>
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => router.push('/hosts/add')}
                  >
                    Добавить первый хост
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              hosts.map((host) => (
                <TableRow key={host.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <Server className="mr-2 h-4 w-4 text-muted-foreground" />
                      {host.name}
                    </div>
                  </TableCell>
                  <TableCell>{host.address}</TableCell>
                  <TableCell>{host.port}</TableCell>
                  <TableCell>{host.description || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleViewContainers(host.id)}
                            >
                              <Server className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Просмотр контейнеров</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleScanAll(host.id)}
                              disabled={isLoading}
                            >
                              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Сканировать все</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEdit(host)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Редактировать</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => confirmDelete(host)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Удалить</p>
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить хост?</DialogTitle>
          </DialogHeader>
          <p>
            Вы уверены, что хотите удалить хост &quot;{hostToDelete?.name}&quot;?
            Все связанные данные также будут удалены.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? "Удаление..." : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 

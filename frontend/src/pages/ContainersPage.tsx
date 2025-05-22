import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Loader2, MoreHorizontal, Play, Download, FileText, AlertCircle } from 'lucide-react';
import { Toaster } from '../components/ui/sonner';
import { toast } from 'sonner';
import { useWebSocketListener } from '../hooks/useWebSocketListener';
import type { ContainerStatusUpdate } from '../hooks/useWebSocketListener';

// TODO: Define Container type based on API response
interface Container {
  id: string;
  name: string;
  image: string;
  status: 'idle' | 'scanning' | 'scanned' | 'error';
  last_scan_id?: string; // Optional, for report export
}

// TODO: Get API URL from Vite env variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/v1';

const ContainersPage = () => {
  const { hostId } = useParams<{ hostId: string }>();
  const navigate = useNavigate();
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [localScanTriggerId, setLocalScanTriggerId] = useState<string | null>(null);
  // TODO: Add state for host details if needed (e.g., to display host name)

  const fetchContainers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/hosts/${hostId}/containers`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setContainers(data); // TODO: Adjust based on actual API response structure
      toast.success('Containers loaded successfully');
    } catch (error) {
      console.error(`Failed to fetch containers for host ${hostId}:`, error);
      toast.error('Failed to load containers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hostId) {
      fetchContainers();
    }
  }, [hostId]);

  useWebSocketListener((update: ContainerStatusUpdate) => {
    if (update.type === 'container_status_update' && update.payload.host_id === hostId) {
      const { container_id, status, scan_id } = update.payload;
      setContainers(prevContainers =>
        prevContainers.map(c =>
          c.id === container_id ? { 
            ...c, 
            status: status as Container['status'], 
            last_scan_id: scan_id || c.last_scan_id 
          } : c
        )
      );
      if (localScanTriggerId === container_id && status !== 'scanning') {
        setLocalScanTriggerId(null);
      }
      toast.info(`Container ${container_id} status updated to ${status}`);
    }
  });

  const handleScanContainer = async (containerId: string) => {
    setLocalScanTriggerId(containerId);
    try {
      const response = await fetch(`${API_URL}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host_id: hostId, container_id: containerId }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      toast.success(`Scan initiated for container ${containerId}. Status will update via stream.`);
    } catch (error) {
      console.error(`Failed to scan container ${containerId}:`, error);
      toast.error(`Failed to start scan for container ${containerId}.`);
      setLocalScanTriggerId(null);
    }
  };

  const handleExportReport = async (scanId: string, format: 'json' | 'csv') => {
    if (!scanId) {
      toast.error('No scan ID available for this container to export report.');
      return;
    }
    toast.info(`Preparing ${format.toUpperCase()} report for download...`);
    try {
      const response = await fetch(`${API_URL}/scan/${scanId}/report?format=${format}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${scanId}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded.');
    } catch (error) {
      console.error(`Failed to export report ${scanId}:`, error);
      toast.error('Failed to download report.');
    }
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-16 w-16 animate-spin text-accent" /></div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Toaster richColors />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Containers on Host <span className='text-accent'>{hostId}</span></h1> {/* TODO: Fetch and display host name */}
        <Button onClick={() => navigate('/hosts')} variant="outline">Back to Hosts</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Image</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {containers.map((container) => (
            <TableRow key={container.id}>
              <TableCell>{container.name}</TableCell>
              <TableCell>{container.image}</TableCell>
              <TableCell>
                <Badge 
                   variant={container.status === 'scanned' ? 'default' : 
                            container.status === 'scanning' ? 'secondary' : 
                            container.status === 'error' ? 'destructive' :
                            'outline'}
                  className={
                    container.status === 'scanned' ? 'bg-green-500 text-white' : 
                    container.status === 'scanning' ? 'bg-yellow-500 text-black' : ''
                  }
                >
                  {container.status === 'scanning' ? 
                    <Loader2 className="inline mr-1 h-3 w-3 animate-spin" /> : null}
                  {container.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => handleScanContainer(container.id)} 
                      disabled={container.status === 'scanning' || localScanTriggerId === container.id}
                    >
                      {(container.status === 'scanning' || localScanTriggerId === container.id) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4"/>}
                      Scan
                    </DropdownMenuItem>
                    {container.status === 'scanned' && container.last_scan_id && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Export Report</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleExportReport(container.last_scan_id!, 'json')}>
                          <FileText className="mr-2 h-4 w-4" />
                          JSON
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportReport(container.last_scan_id!, 'csv')}>
                          <Download className="mr-2 h-4 w-4" />
                          CSV
                        </DropdownMenuItem>
                      </>
                    )}
                     {container.status === 'error' && (
                        <DropdownMenuItem disabled className="text-red-500">
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Scan Failed
                        </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {containers.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No containers found for this host.
        </div>
      )}
    </div>
  );
};

export default ContainersPage; 

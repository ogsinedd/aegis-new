import { useEffect, useState } from 'react';
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
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Loader2, MoreHorizontal, Play, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Toaster } from '../components/ui/sonner';
import { toast } from 'sonner';
import { useWebSocketListener } from '../hooks/useWebSocketListener';
import type { ContainerStatusUpdate } from '../hooks/useWebSocketListener';

// TODO: Define Host type based on API response
interface Host {
  id: string;
  name: string;
  address: string;
  status: 'idle' | 'online' | 'scanning';
}

// TODO: Get API URL from Vite env variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/v1';

const HostsPage = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [scanningHostId, setScanningHostId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchHosts = async () => {
    if (!refreshing) setLoading(true);
    try {
      const response = await fetch(`${API_URL}/hosts`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setHosts(data); // TODO: Adjust based on actual API response structure
      setLastUpdated(new Date().toLocaleTimeString());
      toast.success('Hosts loaded successfully');
    } catch (error) {
      console.error("Failed to fetch hosts:", error);
      toast.error('Failed to load hosts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHosts();
  }, []);

  // WebSocket listener for host status updates
  useWebSocketListener((update: ContainerStatusUpdate) => {
    if (update.type === 'host_status_update') {
      const { host_id, status } = update.payload;
      setHosts(prevHosts =>
        prevHosts.map(h =>
          h.id === host_id ? { ...h, status: status as Host['status'] } : h
        )
      );
      // If a host we were locally tracking as 'scanning' is now updated, clear local spinner state
      if (scanningHostId === host_id && status !== 'scanning') {
        setScanningHostId(null);
      }
      toast.info(`Host ${host_id} status updated to ${status}`);
    } else if (update.type === 'container_status_update' && update.payload.status === 'scanning') {
        // If any container on a host starts scanning, reflect host as scanning
        const { host_id } = update.payload;
        setHosts(prevHosts =>
            prevHosts.map(h =>
              h.id === host_id && h.status !== 'scanning' ? { ...h, status: 'scanning' } : h
            )
          );
    } else if (update.type === 'container_status_update' && (update.payload.status === 'scanned' || update.payload.status === 'error' || update.payload.status === 'idle')){
        // If a container finished scanning, we might need to re-evaluate host status
        // This logic can be complex: host is 'online' if all containers are idle/scanned/error, 
        // or 'scanning' if at least one is scanning.
        // For simplicity, a full fetchHosts() or a more targeted check might be needed here
        // Or the backend sends a specific host_status_update when appropriate.
        // Let's assume backend sends host_status_update when overall host status changes.
    }
  });

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHosts();
  };

  const handleScanAll = async (hostId: string) => {
    try {
      const response = await fetch(`${API_URL}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host_id: hostId, container_id: 'all' }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      toast.success(`Scan All initiated for host ${hostId}. Status will update via stream.`);
      // WebSocket should ideally send a host_status_update to 'scanning'
    } catch (error) {
      console.error(`Failed to scan host ${hostId}:`, error);
      toast.error(`Failed to start Scan All for host ${hostId}.`);
      // No need to revert status if WebSocket is source of truth
    }
  };

  const handleViewContainers = (hostId: string) => {
    navigate(`/hosts/${hostId}/containers`);
  };

  if (loading && !refreshing) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-16 w-16 animate-spin text-accent" /></div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Toaster richColors />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Hosts</h1>
        <div className="flex items-center space-x-2">
          {lastUpdated && <span className="text-sm text-gray-400">Last updated: {lastUpdated}</span>}
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing || loading}>
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hosts.map((host) => (
            <TableRow key={host.id}>
              <TableCell>{host.name}</TableCell>
              <TableCell>{host.address}</TableCell>
              <TableCell>
                <Badge 
                  variant={host.status === 'online' ? 'default' : host.status === 'scanning' ? 'secondary' : 'outline'}
                  className={host.status === 'online' ? 'bg-green-500 text-white' : host.status === 'scanning' ? 'bg-yellow-500 text-black' : ''}
                >
                  {host.status === 'scanning' ? 
                    <Loader2 className="inline mr-1 h-3 w-3 animate-spin" /> : null}
                  {host.status}
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
                    <DropdownMenuItem onClick={() => handleViewContainers(host.id)}>
                      View Containers
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleScanAll(host.id)} disabled={host.status === 'scanning' || scanningHostId === host.id}>
                      {(host.status === 'scanning' || scanningHostId === host.id) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4"/>}
                      Scan All
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hosts.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No hosts found.
        </div>
      )}
    </div>
  );
};

export default HostsPage; 

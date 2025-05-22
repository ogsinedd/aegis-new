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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "../components/ui/dialog"
import { Loader2, MoreHorizontal, Download, FileText, AlertCircle, ListChecks } from 'lucide-react';
import { Toaster } from '../components/ui/sonner';
import { toast } from 'sonner';

// TODO: Define types based on API response
interface ScanVulnerability {
  vulnerability_id: string;
  pkg_name: string;
  installed_version: string;
  fixed_version?: string;
  severity: string; // Critical, High, Medium, Low
  description?: string;
  // ... other fields from Trivy report as needed
}
interface ScanResult {
  id: string; // Scan ID
  host_id: string;
  host_name?: string; // For display
  container_id: string;
  container_name?: string; // For display
  started_at: string;
  finished_at?: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  cve_count: number;
  vulnerabilities?: ScanVulnerability[]; // For modal
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/v1';

const VulnerabilitiesTableModal = ({ vulnerabilities }: { vulnerabilities: ScanVulnerability[] }) => {
  if (!vulnerabilities || vulnerabilities.length === 0) {
    return <p className="text-gray-500">No vulnerabilities found for this scan.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>CVE ID</TableHead>
          <TableHead>Package</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Installed Version</TableHead>
          <TableHead>Fixed Version</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vulnerabilities.map((vuln) => (
          <TableRow key={vuln.vulnerability_id}>
            <TableCell>{vuln.vulnerability_id}</TableCell>
            <TableCell>{vuln.pkg_name}</TableCell>
            <TableCell>
              <Badge 
                variant={vuln.severity === 'Critical' || vuln.severity === 'High' ? 'destructive' : vuln.severity === 'Medium' ? 'secondary' : 'outline'}
              >
                {vuln.severity}
              </Badge>
            </TableCell>
            <TableCell>{vuln.installed_version}</TableCell>
            <TableCell>{vuln.fixed_version || 'N/A'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const ScanHistoryPage = () => {
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScanForModal, setSelectedScanForModal] = useState<ScanResult | null>(null);

  const fetchScanHistory = async () => {
    setLoading(true);
    try {
      // TODO: Add filters for host_id, container_id if UI elements are added for them
      const response = await fetch(`${API_URL}/scan`); // Or /scans
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setScanHistory(data); // TODO: Adjust based on actual API response structure
      toast.success('Scan history loaded');
    } catch (error) {
      console.error("Failed to fetch scan history:", error);
      toast.error('Failed to load scan history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScanHistory();
  }, []);

  const handleDownloadReport = async (scanId: string, format: 'json' | 'csv') => {
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
      console.error(`Failed to download report ${scanId}:`, error);
      toast.error('Failed to download report.');
    }
  };

  const handleViewResults = (scan: ScanResult) => {
    if (!scan.vulnerabilities) {
        toast.info('Vulnerability details might need to be fetched or are not available for this scan.');
        setSelectedScanForModal({ ...scan, vulnerabilities: scan.vulnerabilities || []});
    } else {
        setSelectedScanForModal(scan);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-16 w-16 animate-spin text-accent" /></div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Toaster richColors />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Scan History</h1>
        {/* TODO: Add filters for host/container if needed */}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Scan ID</TableHead>
            <TableHead>Host</TableHead>
            <TableHead>Container</TableHead>
            <TableHead>Started At</TableHead>
            <TableHead>Finished At</TableHead>
            <TableHead>Status</TableHead>
            <TableHead># CVEs</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scanHistory.map((scan) => (
            <TableRow key={scan.id}>
              <TableCell className="font-mono text-xs">{scan.id.substring(0, 12)}...</TableCell>
              <TableCell>{scan.host_name || scan.host_id}</TableCell>
              <TableCell>{scan.container_name || scan.container_id}</TableCell>
              <TableCell>{new Date(scan.started_at).toLocaleString()}</TableCell>
              <TableCell>{scan.finished_at ? new Date(scan.finished_at).toLocaleString() : '-'}</TableCell>
              <TableCell>
                <Badge 
                    variant={scan.status === 'completed' ? 'default' : 
                             scan.status === 'running' || scan.status === 'pending' ? 'secondary' :
                             'destructive'} // for 'failed'
                    className={scan.status === 'completed' ? 'bg-green-500 text-white' : ''}
                >
                  {scan.status === 'running' || scan.status === 'pending' ? 
                    <Loader2 className="inline mr-1 h-3 w-3 animate-spin" /> : null}
                  {scan.status}
                </Badge>
              </TableCell>
              <TableCell>{scan.cve_count}</TableCell>
              <TableCell className="text-right">
                <Dialog open={selectedScanForModal?.id === scan.id} onOpenChange={(isOpen) => !isOpen && setSelectedScanForModal(null)}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {scan.status === 'completed' && (
                        <DialogTrigger asChild>
                          <DropdownMenuItem onClick={() => handleViewResults(scan)}>
                            <ListChecks className="mr-2 h-4 w-4" />
                            View Results
                          </DropdownMenuItem>
                        </DialogTrigger>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Download Report</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleDownloadReport(scan.id, 'json')}>
                        <FileText className="mr-2 h-4 w-4" /> JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownloadReport(scan.id, 'csv')}>
                        <Download className="mr-2 h-4 w-4" /> CSV
                      </DropdownMenuItem>
                       {scan.status === 'failed' && (
                        <DropdownMenuItem disabled className="text-red-500">
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Scan Failed
                        </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {selectedScanForModal?.id === scan.id && (
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Vulnerabilities for Scan <span className="font-mono text-sm text-accent">{selectedScanForModal.id.substring(0,12)}...</span></DialogTitle>
                        <DialogDescription>
                          Host: {selectedScanForModal.host_name || selectedScanForModal.host_id}, Container: {selectedScanForModal.container_name || selectedScanForModal.container_id}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="max-h-[60vh] overflow-y-auto py-4">
                        <VulnerabilitiesTableModal vulnerabilities={selectedScanForModal.vulnerabilities || []} />
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                Close
                            </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  )}
                </Dialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {scanHistory.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No scan history found.
        </div>
      )}
    </div>
  );
};

export default ScanHistoryPage; 

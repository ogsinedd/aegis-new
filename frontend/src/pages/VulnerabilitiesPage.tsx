import { useEffect, useState, useMemo } from 'react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Loader2, AlertTriangle, ShieldCheck, Clock, Wrench } from 'lucide-react';
import { Toaster } from '../components/ui/sonner';
import { toast } from 'sonner';
import { Checkbox } from '../components/ui/checkbox';
import type { CheckedState } from '@radix-ui/react-checkbox';

// TODO: Define types based on API response
interface Vulnerability {
  id: string; // Unique ID for the vulnerability instance (e.g., host_id + container_id + cve_id)
  host_id: string;
  host_name?: string;
  container_id: string;
  container_name?: string;
  cve_id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Unknown';
  cvss?: number; // CVSS score - assuming it's a number
  description: string;
  recommendation?: string;
  scan_id: string; // To link back to a specific scan if needed for remediation
}

type RemediationScenario = 'hot-patch' | 'rolling-update' | 'restart';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/v1';
// TODO: Get these from settings page or define sensible defaults
const DEFAULT_SCAN_CONCURRENCY = 3;
const SCENARIO_TIMES: Record<RemediationScenario, number> = {
  'hot-patch': 5, // minutes
  'rolling-update': 15,
  'restart': 2,
};

const VulnerabilitiesPage = () => {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    severity: '',
    cvss: '',
    cveId: '',
    host: '',
    container: '',
  });
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [selectedScenario, setSelectedScenario] = useState<RemediationScenario | '' >('');
  const [applyingRemediation, setApplyingRemediation] = useState(false);

  const fetchVulnerabilities = async () => {
    setLoading(true);
    // Build query params from filters
    const queryParams = new URLSearchParams();
    if (filters.severity) queryParams.append('severity', filters.severity);
    if (filters.cvss) queryParams.append('cvss_score_gte', filters.cvss); // Assuming API supports gte for CVSS
    if (filters.cveId) queryParams.append('cve_id', filters.cveId);
    if (filters.host) queryParams.append('host_name_like', filters.host); // Assuming API supports like for host/container
    if (filters.container) queryParams.append('container_name_like', filters.container);
    
    try {
      const response = await fetch(`${API_URL}/vulnerabilities?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setVulnerabilities(data); // TODO: Adjust based on actual API response structure
      toast.success('Vulnerabilities loaded');
    } catch (error) {
      console.error("Failed to fetch vulnerabilities:", error);
      toast.error('Failed to load vulnerabilities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVulnerabilities();
  }, [filters]); // Re-fetch when filters change

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleRowSelect = (vulnId: string) => {
    setSelectedRows(prev => ({ ...prev, [vulnId]: !prev[vulnId] }));
  };

  const selectedVulnerabilities = useMemo(() => {
    return vulnerabilities.filter(v => selectedRows[v.id]);
  }, [selectedRows, vulnerabilities]);

  const estimatedDowntime = useMemo(() => {
    if (!selectedScenario || selectedVulnerabilities.length === 0) return 0;
    const scenarioTime = SCENARIO_TIMES[selectedScenario];
    // Simplified: count unique containers selected for remediation
    const uniqueContainers = new Set(selectedVulnerabilities.map(v => v.container_id));
    return (scenarioTime * uniqueContainers.size) / DEFAULT_SCAN_CONCURRENCY;
  }, [selectedScenario, selectedVulnerabilities]);

  const handleApplyRemediation = async () => {
    if (selectedVulnerabilities.length === 0 || !selectedScenario) {
      toast.error('Please select vulnerabilities and a remediation scenario.');
      return;
    }
    setApplyingRemediation(true);
    // API expects a list of scan_ids and the scenario
    // We need to map selected vulnerabilities to their scan_ids.
    // For simplicity, let's assume for now all selected vulnerabilities to be remediated together belong to a discoverable context or we use their original scan_id.
    // The API POST /v1/remediate {scan_id, scenario} seems to imply one scan_id at a time.
    // This part needs clarification based on API capabilities for batch remediation across different scans.
    // As a placeholder: use the scan_id of the first selected vulnerability.
    const representativeScanId = selectedVulnerabilities[0]?.scan_id;
    if (!representativeScanId) {
        toast.error("Cannot determine scan context for remediation.");
        setApplyingRemediation(false);
        return;
    }

    try {
      const response = await fetch(`${API_URL}/remediate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan_id: representativeScanId, scenario: selectedScenario }), // This might need to be an array of objects for batch
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to apply remediation."}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      toast.success(`Remediation scenario '${selectedScenario}' applied.`);
      setSelectedRows({}); // Clear selection
      setSelectedScenario('');
      fetchVulnerabilities(); // Re-fetch to see changes
    } catch (error: any) {
      console.error("Failed to apply remediation:", error);
      toast.error(error.message || 'Failed to apply remediation.');
    } finally {
      setApplyingRemediation(false);
    }
  };
  
  // TODO: Add a debounce for filter inputs if performance becomes an issue

  if (loading && !applyingRemediation) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-16 w-16 animate-spin text-accent" /></div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Toaster richColors />
      <h1 className="text-2xl font-bold mb-4">Vulnerabilities</h1>
      
      {/* Filter Section - TODO: Make this more organized, perhaps in a collapsible section */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 p-4 border rounded-lg">
        <Input placeholder="CVE ID (e.g., CVE-2023-1234)" name="cveId" value={filters.cveId} onChange={handleFilterChange} />
        <Input placeholder="Host Name" name="host" value={filters.host} onChange={handleFilterChange} />
        <Input placeholder="Container Name" name="container" value={filters.container} onChange={handleFilterChange} />
        <Select name="severity" value={filters.severity} onValueChange={(value) => setFilters(prev => ({...prev, severity: value}))}>
          <SelectTrigger><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Severities</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Input type="number" placeholder="Min CVSS" name="cvss" value={filters.cvss} onChange={handleFilterChange} min="0" max="10" step="0.1" />
      </div>

      {/* Remediation Action Bar - Appears when items are selected */}
      {selectedVulnerabilities.length > 0 && (
        <div className="mb-4 p-3 border rounded-lg bg-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm">Selected {selectedVulnerabilities.length} vulnerabilities.</span>
          <div className="flex items-center gap-3">
            <Select value={selectedScenario} onValueChange={(val) => setSelectedScenario(val as RemediationScenario)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Choose Scenario" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="hot-patch">Hot Patch</SelectItem>
                    <SelectItem value="rolling-update">Rolling Update</SelectItem>
                    <SelectItem value="restart">Restart</SelectItem>
                </SelectContent>
            </Select>
            {selectedScenario && (
                <div className="text-xs text-gray-400 flex items-center">
                    <Clock size={14} className="mr-1" /> Est. Downtime: {estimatedDowntime.toFixed(1)} min
                </div>
            )}
            <Button onClick={handleApplyRemediation} disabled={!selectedScenario || applyingRemediation} className="bg-accent hover:bg-accent/90 text-black">
              {applyingRemediation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}
              Apply Remediation
            </Button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
                <Checkbox 
                    checked={selectedVulnerabilities.length === vulnerabilities.length && vulnerabilities.length > 0}
                    onCheckedChange={(checked: CheckedState) => {
                        const newSelectedRows: Record<string, boolean> = {};
                        if (checked === true) {
                            vulnerabilities.forEach(v => newSelectedRows[v.id] = true);
                        }
                        setSelectedRows(newSelectedRows);
                    }}
                    aria-label="Select all rows"
                />
            </TableHead>
            <TableHead>CVE ID</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>CVSS</TableHead>
            <TableHead>Host</TableHead>
            <TableHead>Container</TableHead>
            <TableHead>Description</TableHead> {/* Might be too long, consider a modal or tooltip */}
            {/* <TableHead>Recommendation</TableHead> */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {vulnerabilities.map((vuln) => (
            <TableRow key={vuln.id} data-state={selectedRows[vuln.id] && "selected"}>
              <TableCell>
                <Checkbox 
                    checked={!!selectedRows[vuln.id]}
                    onCheckedChange={() => handleRowSelect(vuln.id)}
                    aria-label={`Select row for ${vuln.cve_id}`}
                />
              </TableCell>
              <TableCell className="font-mono text-xs">{vuln.cve_id}</TableCell>
              <TableCell>
                <Badge 
                  variant={vuln.severity === 'Critical' || vuln.severity === 'High' ? 'destructive' :
                           vuln.severity === 'Medium' ? 'secondary' : 'outline'}
                >
                  {vuln.severity}
                </Badge>
              </TableCell>
              <TableCell>{vuln.cvss || 'N/A'}</TableCell>
              <TableCell>{vuln.host_name || vuln.host_id}</TableCell>
              <TableCell>{vuln.container_name || vuln.container_id}</TableCell>
              <TableCell className="max-w-xs truncate" title={vuln.description}>{vuln.description || '-'}</TableCell>
              {/* Recommendation could be in a modal if too long */}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {vulnerabilities.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <AlertTriangle size={48} className="mx-auto mb-2 text-yellow-500" />
          No vulnerabilities found matching your criteria.
        </div>
      )}
    </div>
  );
};

export default VulnerabilitiesPage; 

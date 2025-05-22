import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/v1';

// Define a type for the data expected by the chart
interface VulnerabilityChartData {
  name: string; // Host name or Container name
  Critical: number;
  High: number;
  Medium: number;
  Low: number;
  Unknown?: number;
}

// Define colors for severity levels consistent with badges/theme
const SEVERITY_COLORS = {
  Critical: 'hsl(var(--destructive))', // Usually red
  High: 'hsl(var(--destructive-foreground))', // Or another distinct color like orange if destructive is too similar
  Medium: 'hsl(var(--secondary)) / 0.8', // Yellow/Orange from badges
  Low: 'hsl(var(--primary)) / 0.7',      // Green/Blue from badges (accent related)
  Unknown: 'hsl(var(--muted-foreground))' // Gray
};

const DashboardPage = () => {
  const [vulnByHostData, setVulnByHostData] = useState<VulnerabilityChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // TODO: This endpoint needs to exist and return aggregated data
        // Example: GET /v1/dashboard/vulnerabilities-by-host
        // Or, fetch all vulnerabilities and aggregate client-side (less ideal for large datasets)
        const response = await fetch(`${API_URL}/dashboard/vulnerabilities-summary`); // Placeholder endpoint
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json(); 
        // Assuming data is { hosts: VulnerabilityChartData[], containers: VulnerabilityChartData[] }
        // For this example, let's use host data if available, or mock it.
        setVulnByHostData(data.hosts || [
            { name: 'Host-Alpha', Critical: 5, High: 10, Medium: 15, Low: 20, Unknown: 2 },
            { name: 'Host-Beta', Critical: 2, High: 5, Medium: 8, Low: 12, Unknown: 1 },
            { name: 'Host-Gamma', Critical: 0, High: 2, Medium: 5, Low: 7, Unknown: 0 },
        ]);
        toast.success('Dashboard data loaded');
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        toast.error('Failed to load dashboard data. Displaying mock data.');
        // Fallback to mock data on error
        setVulnByHostData([
            { name: 'MockHost-A', Critical: 3, High: 7, Medium: 10, Low: 5, Unknown: 1 },
            { name: 'MockHost-B', Critical: 1, High: 4, Medium: 6, Low: 9, Unknown: 0 },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-16 w-16 animate-spin text-accent" /></div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="p-4 border rounded-lg bg-panel shadow">
        <h2 className="text-xl font-semibold mb-4 text-accent">Vulnerabilities by Host</h2>
        {vulnByHostData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={vulnByHostData} margin={{ top: 5, right: 20, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={80} 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} allowDecimals={false}/>
              <Tooltip 
                contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    borderColor: 'hsl(var(--border))' 
                }}
                cursor={{ fill: 'hsl(var(--secondary)) / 0.3' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }}/>
              <Bar dataKey="Critical" stackId="a" fill={SEVERITY_COLORS.Critical} />
              <Bar dataKey="High" stackId="a" fill={SEVERITY_COLORS.High} />
              <Bar dataKey="Medium" stackId="a" fill={SEVERITY_COLORS.Medium} />
              <Bar dataKey="Low" stackId="a" fill={SEVERITY_COLORS.Low} />
              {vulnByHostData.some(d => d.Unknown && d.Unknown > 0) && (
                <Bar dataKey="Unknown" stackId="a" fill={SEVERITY_COLORS.Unknown} />
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500">No vulnerability data available to display for hosts.</p>
        )}
      </div>

      {/* TODO: Add another chart for vulnerabilities by container or other metrics */}
    </div>
  );
};

export default DashboardPage; 

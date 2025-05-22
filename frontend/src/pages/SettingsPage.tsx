import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label'; // For better form structure
import { Loader2 } from 'lucide-react';
import { Toaster } from '../components/ui/sonner';
import { toast } from 'sonner';

interface AppSettings {
  scan_concurrency: number;
  sidecar_port: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/v1';

const SettingsPage = () => {
  const [settings, setSettings] = useState<Partial<AppSettings>>({});
  const [initialSettings, setInitialSettings] = useState<Partial<AppSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/settings`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSettings(data);
        setInitialSettings(data);
        toast.success('Settings loaded');
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        toast.error('Failed to load settings. Displaying default values.');
        // Set default values if fetch fails, or leave empty to show placeholders
        const defaultValues = { scan_concurrency: 3, sidecar_port: 5000 };
        setSettings(defaultValues);
        setInitialSettings(defaultValues);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({message: "Failed to save settings"}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const updatedSettings = await response.json();
      setSettings(updatedSettings);
      setInitialSettings(updatedSettings);
      toast.success('Settings saved successfully!');
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      toast.error(error.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(initialSettings);
    toast.info('Settings reset to last saved values.');
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-16 w-16 animate-spin text-accent" /></div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Toaster richColors />
      <h1 className="text-2xl font-bold mb-6">Application Settings</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="scan_concurrency">Scan Concurrency</Label>
          <Input 
            id="scan_concurrency" 
            name="scan_concurrency"
            type="number" 
            value={settings.scan_concurrency || ''}
            onChange={handleInputChange} 
            placeholder="e.g., 3"
            min="1"
          />
          <p className="text-sm text-gray-500">Number of concurrent scans allowed.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sidecar_port">Sidecar Agent Port</Label>
          <Input 
            id="sidecar_port" 
            name="sidecar_port"
            type="number" 
            value={settings.sidecar_port || ''}
            onChange={handleInputChange} 
            placeholder="e.g., 5000"
            min="1024"
            max="65535"
          />
          <p className="text-sm text-gray-500">Port number for the sidecar agent communication.</p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={handleReset} disabled={!hasChanges || saving}>
                Reset Changes
            </Button>
            <Button type="submit" disabled={saving || !hasChanges} className="bg-accent hover:bg-accent/90 text-black">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Settings
            </Button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage; 

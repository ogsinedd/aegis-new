import React from 'react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

interface ExportReportButtonProps {
  onExport: (format: 'json' | 'csv') => Promise<void>;
  disabled?: boolean;
}

export function ExportReportButton({ onExport, disabled }: ExportReportButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      setIsExporting(true);
      await onExport(format);
      toast.success(`Отчет успешно экспортирован в формате ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Failed to export report:', error);
      toast.error('Не удалось экспортировать отчет');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={disabled || isExporting}
        >
          <Download className="h-4 w-4" />
          Экспорт
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('json')}>
          Экспорт в JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          Экспорт в CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 

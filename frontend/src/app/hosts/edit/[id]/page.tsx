"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { hostsService, Host, HostUpdate } from "@/services/hostsService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditHostPageProps {
  params: {
    id: string;
  };
}

export default function EditHostPage({ params }: EditHostPageProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<HostUpdate>({
    name: "",
    address: "",
    port: 0,
    description: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchHost = async () => {
      try {
        const host = await hostsService.getHost(params.id);
        setFormData({
          name: host.name,
          address: host.address,
          port: host.port,
          description: host.description || "",
        });
      } catch (error) {
        console.error("Ошибка при загрузке хоста:", error);
        toast.error("Не удалось загрузить информацию о хосте");
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHost();
  }, [params.id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "port" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await hostsService.updateHost(params.id, formData);
      toast.success("Хост успешно обновлен");
      router.push("/");
    } catch (error) {
      console.error("Ошибка при обновлении хоста:", error);
      toast.error("Не удалось обновить хост");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-pulse">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Редактировать хост Docker</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Имя хоста</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Например: Локальный сервер"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Адрес</Label>
          <Input
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Например: localhost или 192.168.1.100"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="port">Порт</Label>
          <Input
            id="port"
            name="port"
            type="number"
            value={formData.port}
            onChange={handleChange}
            placeholder="2375"
            required
          />
          <p className="text-xs text-muted-foreground">
            По умолчанию Docker API работает на порту 2375 (без TLS) или 2376 (с TLS)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Описание (необязательно)</Label>
          <Input
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Краткое описание хоста"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Отмена
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Сохранение..." : "Сохранить изменения"}
          </Button>
        </div>
      </form>
    </div>
  );
} 

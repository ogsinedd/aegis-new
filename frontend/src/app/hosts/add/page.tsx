"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { hostsService, HostCreate } from "@/services/hostsService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AddHostPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<HostCreate>({
    name: "",
    address: "",
    port: 2375,
    description: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "port" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await hostsService.createHost(formData);
      toast.success("Хост успешно добавлен");
      router.push("/");
    } catch (error) {
      console.error("Ошибка при добавлении хоста:", error);
      toast.error("Не удалось добавить хост");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Добавить хост Docker</h1>

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
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Добавление..." : "Добавить хост"}
          </Button>
        </div>
      </form>
    </div>
  );
} 

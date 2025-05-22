from enum import Enum
from typing import Optional
from pydantic import BaseModel

# Enum for container status
class ContainerStatus(str, Enum):
    IDLE = "idle"
    SCANNING = "scanning"
    SCANNED = "scanned"
    ERROR = "error"

# Base Container Schema
class ContainerBase(BaseModel):
    container_id: str
    host_id: str
    name: str
    image: str
    status: ContainerStatus = ContainerStatus.IDLE

# Schema for creating new container
class ContainerCreate(ContainerBase):
    pass

# Schema for container in response
class Container(ContainerBase):
    class Config:
        from_attributes = True 

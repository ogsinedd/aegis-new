from typing import Optional
from pydantic import BaseModel, Field, validator

# Base Host Schema
class HostBase(BaseModel):
    name: str
    address: str
    port: int = Field(default=5000, ge=1, le=65535)
    description: Optional[str] = None

# Schema for creating new host
class HostCreate(HostBase):
    pass

# Schema for updating host
class HostUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    port: Optional[int] = Field(default=None, ge=1, le=65535)
    description: Optional[str] = None

# Schema for host in response
class Host(HostBase):
    id: str
    
    class Config:
        from_attributes = True 

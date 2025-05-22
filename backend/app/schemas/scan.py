from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

# Enum for scan status
class ScanStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"

# Schema for requesting a scan
class ScanRequest(BaseModel):
    host_id: str
    container_id: str

# Schema for scan result
class ScanBase(BaseModel):
    scan_id: str
    host_id: str
    container_id: str
    status: ScanStatus
    started_at: datetime

# Schema for scan history in response
class ScanHistory(ScanBase):
    finished_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Schema for vulnerability
class VulnerabilityBase(BaseModel):
    cve_id: str
    cvss: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    recommendation: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

# Schema for creating a new vulnerability
class VulnerabilityCreate(VulnerabilityBase):
    scan_id: str

# Schema for vulnerability in response
class Vulnerability(VulnerabilityBase):
    id: str
    scan_id: str
    
    class Config:
        from_attributes = True

# Schema for full scan result with vulnerabilities
class ScanResult(ScanHistory):
    vulnerabilities: List[Vulnerability] = []
    
    class Config:
        from_attributes = True

# Response schemas
class ScanResponse(ScanBase):
    finished_at: Optional[datetime] = None
    error: Optional[str] = None
    
    class Config:
        from_attributes = True

class ScanHistoryResponse(ScanHistory):
    pass

class VulnerabilityResponse(Vulnerability):
    pass 

import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.base import Base

class ContainerStatus(enum.Enum):
    IDLE = "idle"
    SCANNING = "scanning"
    SCANNED = "scanned" 
    ERROR = "error"

class ScanStatus(enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"

class Host(Base):
    """Модель для хранения информации о хостах Docker"""
    __tablename__ = "hosts"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    address = Column(String(255), nullable=False)
    port = Column(Integer, nullable=False, default=5000)
    description = Column(Text, nullable=True)
    
    # Связи
    containers = relationship("Container", back_populates="host", cascade="all, delete-orphan")
    scan_history = relationship("ScanHistory", back_populates="host", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Host {self.name} ({self.address})>"

class Container(Base):
    """Модель для хранения информации о контейнерах Docker"""
    __tablename__ = "containers"
    
    container_id = Column(String(100), primary_key=True)
    host_id = Column(String(36), ForeignKey("hosts.id"), primary_key=True)
    name = Column(String(255), nullable=False)
    image = Column(String(255), nullable=False)
    status = Column(Enum(ContainerStatus), nullable=False, default=ContainerStatus.IDLE)
    
    # Связи
    host = relationship("Host", back_populates="containers")
    scan_history = relationship("ScanHistory", back_populates="container", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Container {self.name} ({self.container_id[:12]})>"

class ScanHistory(Base):
    """Модель для хранения истории сканирования"""
    __tablename__ = "scan_history"
    
    scan_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    host_id = Column(String(36), ForeignKey("hosts.id"), nullable=False)
    container_id = Column(String(100), ForeignKey("containers.container_id"), nullable=False)
    started_at = Column(DateTime, server_default=func.now())
    finished_at = Column(DateTime, nullable=True)
    status = Column(Enum(ScanStatus), nullable=False, default=ScanStatus.PENDING)
    
    # Связи
    host = relationship("Host", back_populates="scan_history")
    container = relationship("Container", back_populates="scan_history")
    vulnerabilities = relationship("Vulnerability", back_populates="scan", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ScanHistory {self.scan_id[:8]} ({self.status.value})>"

class Vulnerability(Base):
    """Модель для хранения информации об уязвимостях"""
    __tablename__ = "vulnerabilities"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String(36), ForeignKey("scan_history.scan_id"), nullable=False)
    cve_id = Column(String(50), nullable=False)
    cvss = Column(String(10), nullable=True)
    severity = Column(String(20), nullable=True)
    description = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    details = Column(JSON, nullable=True)
    
    # Связи
    scan = relationship("ScanHistory", back_populates="vulnerabilities")
    
    def __repr__(self):
        return f"<Vulnerability {self.cve_id} ({self.severity})>" 

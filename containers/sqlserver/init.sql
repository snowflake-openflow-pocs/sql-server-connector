-- ==========================================================================
-- RetailAnalyticsDB — Retail/wholesale distribution analytics
-- Fully ready for Openflow (all tables have PK + Change Tracking)
-- ==========================================================================

CREATE DATABASE RetailAnalyticsDB;
GO

USE RetailAnalyticsDB;
GO

ALTER DATABASE RetailAnalyticsDB SET CHANGE_TRACKING = ON (CHANGE_RETENTION = 2 DAYS, AUTO_CLEANUP = ON);
GO

CREATE TABLE Distributors (
    DistributorID INT PRIMARY KEY IDENTITY,
    Name NVARCHAR(200) NOT NULL,
    Region NVARCHAR(50),
    ServiceTier NVARCHAR(20) DEFAULT 'Standard',
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
GO

CREATE TABLE Products (
    ProductID INT PRIMARY KEY IDENTITY,
    ProductName NVARCHAR(200) NOT NULL,
    Manufacturer NVARCHAR(100),
    Category NVARCHAR(100),
    UnitPrice DECIMAL(10,2),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
GO

CREATE TABLE SalesTransactions (
    TransactionID INT PRIMARY KEY IDENTITY,
    DistributorID INT FOREIGN KEY REFERENCES Distributors(DistributorID),
    ProductID INT FOREIGN KEY REFERENCES Products(ProductID),
    SaleDate DATE DEFAULT CAST(GETDATE() AS DATE),
    Revenue DECIMAL(12,2),
    Units INT,
    State NVARCHAR(2),
    ZipCode NVARCHAR(10),
    CreatedAt DATETIME2 DEFAULT GETDATE()
);
GO

CREATE TABLE AuditLog (
    LogID INT PRIMARY KEY IDENTITY,
    EventTime DATETIME2 DEFAULT GETDATE(),
    Message NVARCHAR(500),
    Source NVARCHAR(100)
);
GO

ALTER TABLE Distributors ENABLE CHANGE_TRACKING WITH (TRACK_COLUMNS_UPDATED = ON);
ALTER TABLE Products ENABLE CHANGE_TRACKING WITH (TRACK_COLUMNS_UPDATED = ON);
ALTER TABLE SalesTransactions ENABLE CHANGE_TRACKING WITH (TRACK_COLUMNS_UPDATED = ON);
ALTER TABLE AuditLog ENABLE CHANGE_TRACKING WITH (TRACK_COLUMNS_UPDATED = ON);
GO

-- Base data: Distributors
INSERT INTO Distributors (Name, Region, ServiceTier) VALUES
('Northeast Supply Co', 'Northeast', 'Premium'),
('Pacific Distribution', 'West', 'Standard'),
('Midwest Wholesale', 'Midwest', 'Premium'),
('Southern Partners', 'South', 'Standard'),
('Atlantic Trading', 'Northeast', 'Standard'),
('Mountain States Dist', 'West', 'Premium'),
('Great Lakes Supply', 'Midwest', 'Standard'),
('Gulf Coast Wholesale', 'South', 'Premium'),
('Central Plains Dist', 'Midwest', 'Standard'),
('Coastal Partners', 'West', 'Premium');
GO

-- Base data: Products
INSERT INTO Products (ProductName, Manufacturer, Category, UnitPrice) VALUES
('ProCare Scanner X1', 'MedTech Corp', 'Equipment', 2499.99),
('CleanMax Sterilizer', 'SterilCo', 'Equipment', 1899.99),
('DigiView Monitor 24', 'ViewTech', 'Electronics', 799.99),
('SafeGrip Gloves (Box)', 'SafetyFirst', 'Supplies', 24.99),
('PrecisionTool Kit', 'ToolMaster', 'Instruments', 349.99),
('ComfortSeat Pro', 'ErgoDesign', 'Furniture', 599.99),
('AirPure Filter System', 'CleanAir Inc', 'Equipment', 1299.99),
('QuickScan Handheld', 'MedTech Corp', 'Electronics', 449.99),
('BioSafe Sanitizer 5L', 'SterilCo', 'Supplies', 89.99),
('LightMax LED Panel', 'ViewTech', 'Electronics', 299.99),
('ProGrade Mask (Box)', 'SafetyFirst', 'Supplies', 34.99),
('Calibration Set A', 'ToolMaster', 'Instruments', 199.99),
('ErgoDesk Standard', 'ErgoDesign', 'Furniture', 449.99),
('VentFlow System', 'CleanAir Inc', 'Equipment', 899.99),
('DataLink Hub', 'MedTech Corp', 'Electronics', 649.99),
('UltraClean Wipes (Pack)', 'SterilCo', 'Supplies', 19.99),
('MicroView Scope', 'ViewTech', 'Instruments', 1599.99),
('SafetyShield Gown', 'SafetyFirst', 'Supplies', 44.99),
('PrecisionScale Digital', 'ToolMaster', 'Instruments', 279.99),
('ComfortMat Anti-Fatigue', 'ErgoDesign', 'Furniture', 129.99);
GO

-- Base data: Initial sales transactions (500 records)
DECLARE @i INT = 1;
DECLARE @dist_id INT;
DECLARE @prod_id INT;
DECLARE @sale_date DATE;
DECLARE @units INT;
DECLARE @states TABLE (code NVARCHAR(2));
INSERT INTO @states VALUES ('NY'),('CA'),('TX'),('FL'),('IL'),('PA'),('OH'),('GA'),('NC'),('MI');

WHILE @i <= 500
BEGIN
    SET @dist_id = ((@i - 1) % 10) + 1;
    SET @prod_id = ((@i - 1) % 20) + 1;
    SET @sale_date = DATEADD(DAY, -(@i % 30), CAST(GETDATE() AS DATE));
    SET @units = ((@i % 10) + 1) * 2;
    
    INSERT INTO SalesTransactions (DistributorID, ProductID, SaleDate, Revenue, Units, State, ZipCode)
    SELECT 
        @dist_id,
        @prod_id,
        @sale_date,
        @units * p.UnitPrice,
        @units,
        (SELECT TOP 1 code FROM @states ORDER BY NEWID()),
        RIGHT('00000' + CAST(10000 + (@i * 7) % 90000 AS NVARCHAR), 5)
    FROM Products p WHERE p.ProductID = @prod_id;
    
    SET @i = @i + 1;
END
GO

-- Base data: Initial audit log entries
INSERT INTO AuditLog (Message, Source) VALUES
('Database initialized', 'System'),
('Base data loaded: 10 distributors', 'DataLoader'),
('Base data loaded: 20 products', 'DataLoader'),
('Base data loaded: 500 sales transactions', 'DataLoader'),
('Change tracking enabled on all tables', 'System');
GO


-- ==========================================================================
-- ConfigDB — Application configuration and reference data
-- Fully ready for Openflow (all tables have PK + Change Tracking)
-- ==========================================================================

CREATE DATABASE ConfigDB;
GO

USE ConfigDB;
GO

ALTER DATABASE ConfigDB SET CHANGE_TRACKING = ON (CHANGE_RETENTION = 2 DAYS, AUTO_CLEANUP = ON);
GO

CREATE TABLE Customers (
    CustomerID INT PRIMARY KEY IDENTITY,
    CustomerName NVARCHAR(200) NOT NULL,
    DistributorID INT,
    ContactEmail NVARCHAR(200),
    StartDate DATE DEFAULT CAST(GETDATE() AS DATE),
    EndDate DATE,
    Status NVARCHAR(20) DEFAULT 'Active',
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
GO

CREATE TABLE Categories (
    CategoryID INT PRIMARY KEY IDENTITY,
    CategoryL1 NVARCHAR(100) NOT NULL,
    CategoryL2 NVARCHAR(100),
    CategoryL3 NVARCHAR(100),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE()
);
GO

CREATE TABLE ReportingPeriods (
    PeriodID INT PRIMARY KEY IDENTITY,
    PeriodName NVARCHAR(50) NOT NULL,
    StartDate DATE NOT NULL,
    EndDate DATE NOT NULL,
    IsActive BIT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
GO

ALTER TABLE Customers ENABLE CHANGE_TRACKING WITH (TRACK_COLUMNS_UPDATED = ON);
ALTER TABLE Categories ENABLE CHANGE_TRACKING WITH (TRACK_COLUMNS_UPDATED = ON);
ALTER TABLE ReportingPeriods ENABLE CHANGE_TRACKING WITH (TRACK_COLUMNS_UPDATED = ON);
GO

-- Base data: Customers
INSERT INTO Customers (CustomerName, DistributorID, ContactEmail, Status) VALUES
('Riverside Medical Group', 1, 'purchasing@riverside.example.com', 'Active'),
('Valley Health Systems', 2, 'orders@valleyhealth.example.com', 'Active'),
('Summit Care Partners', 3, 'supply@summitcare.example.com', 'Active'),
('Lakeside Clinic Network', 4, 'admin@lakeside.example.com', 'Active'),
('Metro Dental Associates', 5, 'office@metrodental.example.com', 'Active'),
('Coastal Medical Supply', 6, 'procurement@coastalmed.example.com', 'Active'),
('Highland Health Group', 7, 'orders@highland.example.com', 'Active'),
('Prairie Medical Center', 8, 'supplies@prairie.example.com', 'Active'),
('Urban Care Clinics', 9, 'purchasing@urbancare.example.com', 'Active'),
('Regional Health Partners', 10, 'admin@regionalhp.example.com', 'Active'),
('Sunrise Medical Group', 1, 'orders@sunrise.example.com', 'Active'),
('Bayview Healthcare', 2, 'supply@bayview.example.com', 'Active'),
('Mountain View Clinic', 3, 'office@mountainview.example.com', 'Pending'),
('Harbor Medical Associates', 4, 'admin@harbormed.example.com', 'Active'),
('Parkside Health Network', 5, 'procurement@parkside.example.com', 'Inactive');
GO

-- Base data: Categories (3-level hierarchy)
INSERT INTO Categories (CategoryL1, CategoryL2, CategoryL3) VALUES
('Equipment', 'Diagnostic', 'Scanners'),
('Equipment', 'Diagnostic', 'Monitors'),
('Equipment', 'Sterilization', 'Autoclaves'),
('Equipment', 'Sterilization', 'UV Systems'),
('Equipment', 'Environmental', 'Air Filtration'),
('Equipment', 'Environmental', 'Ventilation'),
('Electronics', 'Display', 'Monitors'),
('Electronics', 'Display', 'Panels'),
('Electronics', 'Connectivity', 'Hubs'),
('Electronics', 'Connectivity', 'Wireless'),
('Supplies', 'Safety', 'Gloves'),
('Supplies', 'Safety', 'Masks'),
('Supplies', 'Safety', 'Gowns'),
('Supplies', 'Cleaning', 'Sanitizers'),
('Supplies', 'Cleaning', 'Wipes'),
('Instruments', 'Precision', 'Scopes'),
('Instruments', 'Precision', 'Scales'),
('Instruments', 'Tools', 'Kits'),
('Instruments', 'Tools', 'Calibration'),
('Furniture', 'Seating', 'Chairs'),
('Furniture', 'Seating', 'Stools'),
('Furniture', 'Workstation', 'Desks'),
('Furniture', 'Workstation', 'Tables'),
('Furniture', 'Accessories', 'Mats'),
('Furniture', 'Accessories', 'Organizers'),
('Equipment', 'Imaging', 'X-Ray'),
('Equipment', 'Imaging', 'Ultrasound'),
('Electronics', 'Computing', 'Tablets'),
('Electronics', 'Computing', 'Workstations'),
('Supplies', 'Disposable', 'Containers');
GO

-- Base data: Reporting periods (12 months)
INSERT INTO ReportingPeriods (PeriodName, StartDate, EndDate, IsActive) VALUES
('2025-Q1-Jan', '2025-01-01', '2025-01-31', 0),
('2025-Q1-Feb', '2025-02-01', '2025-02-28', 0),
('2025-Q1-Mar', '2025-03-01', '2025-03-31', 0),
('2025-Q2-Apr', '2025-04-01', '2025-04-30', 0),
('2025-Q2-May', '2025-05-01', '2025-05-31', 0),
('2025-Q2-Jun', '2025-06-01', '2025-06-30', 0),
('2025-Q3-Jul', '2025-07-01', '2025-07-31', 0),
('2025-Q3-Aug', '2025-08-01', '2025-08-31', 0),
('2025-Q3-Sep', '2025-09-01', '2025-09-30', 0),
('2025-Q4-Oct', '2025-10-01', '2025-10-31', 0),
('2025-Q4-Nov', '2025-11-01', '2025-11-30', 0),
('2025-Q4-Dec', '2025-12-01', '2025-12-31', 0),
('2026-Q1-Jan', '2026-01-01', '2026-01-31', 0),
('2026-Q1-Feb', '2026-02-01', '2026-02-28', 1);
GO

-- ==========================================================================
-- DemoDB — fully ready for Openflow (3 tables, all PK + CT)
-- ==========================================================================

CREATE DATABASE DemoDB;
GO

USE DemoDB;
GO

ALTER DATABASE DemoDB SET CHANGE_TRACKING = ON (CHANGE_RETENTION = 2 DAYS, AUTO_CLEANUP = ON);
GO

CREATE TABLE Customers (
    CustomerID INT PRIMARY KEY IDENTITY,
    Name NVARCHAR(100),
    Email NVARCHAR(200),
    City NVARCHAR(100),
    JoinDate DATETIME2 DEFAULT GETDATE()
);
GO

CREATE TABLE Products (
    ProductID INT PRIMARY KEY IDENTITY,
    Name NVARCHAR(100),
    Category NVARCHAR(50),
    Price DECIMAL(10,2),
    Stock INT
);
GO

CREATE TABLE Orders (
    OrderID INT PRIMARY KEY IDENTITY,
    CustomerID INT FOREIGN KEY REFERENCES Customers(CustomerID),
    ProductID INT FOREIGN KEY REFERENCES Products(ProductID),
    Quantity INT,
    Status NVARCHAR(20) DEFAULT 'Pending',
    OrderDate DATETIME2 DEFAULT GETDATE()
);
GO

ALTER TABLE Customers ENABLE CHANGE_TRACKING WITH (TRACK_COLUMNS_UPDATED = ON);
ALTER TABLE Products ENABLE CHANGE_TRACKING WITH (TRACK_COLUMNS_UPDATED = ON);
ALTER TABLE Orders ENABLE CHANGE_TRACKING WITH (TRACK_COLUMNS_UPDATED = ON);
GO

INSERT INTO Products (Name, Category, Price, Stock) VALUES
('Laptop Pro', 'Electronics', 1299.99, 50),
('Wireless Mouse', 'Electronics', 29.99, 200),
('Office Chair', 'Furniture', 199.99, 30),
('Coffee Maker', 'Appliances', 89.99, 75),
('Notebook Set', 'Stationery', 12.99, 500),
('Bluetooth Speaker', 'Electronics', 49.99, 100),
('Desk Lamp', 'Furniture', 34.99, 60),
('Water Bottle', 'Accessories', 19.99, 150),
('Headphones', 'Electronics', 79.99, 80),
('Planner Book', 'Stationery', 15.99, 200);
GO

-- ==========================================================================
-- SalesDB — fully ready for Openflow (3 tables, all PK + CT)
-- ==========================================================================

CREATE DATABASE SalesDB;
GO

USE SalesDB;
GO

ALTER DATABASE SalesDB SET CHANGE_TRACKING = ON (CHANGE_RETENTION = 2 DAYS, AUTO_CLEANUP = ON);
GO

CREATE TABLE Accounts (
    AccountID INT PRIMARY KEY IDENTITY,
    CompanyName NVARCHAR(200),
    Industry NVARCHAR(100),
    AnnualRevenue DECIMAL(15,2),
    CreatedDate DATETIME2 DEFAULT GETDATE()
);
GO

CREATE TABLE Opportunities (
    OpportunityID INT PRIMARY KEY IDENTITY,
    AccountID INT FOREIGN KEY REFERENCES Accounts(AccountID),
    DealName NVARCHAR(200),
    Stage NVARCHAR(50) DEFAULT 'Prospecting',
    Amount DECIMAL(15,2),
    CloseDate DATE
);
GO

CREATE TABLE Invoices (
    InvoiceID INT PRIMARY KEY IDENTITY,
    OpportunityID INT FOREIGN KEY REFERENCES Opportunities(OpportunityID),
    InvoiceDate DATETIME2 DEFAULT GETDATE(),
    DueDate DATE,
    AmountDue DECIMAL(15,2),
    Status NVARCHAR(20) DEFAULT 'Pending'
);
GO

ALTER TABLE Accounts ENABLE CHANGE_TRACKING WITH (TRACK_COLUMNS_UPDATED = ON);
ALTER TABLE Opportunities ENABLE CHANGE_TRACKING WITH (TRACK_COLUMNS_UPDATED = ON);
ALTER TABLE Invoices ENABLE CHANGE_TRACKING WITH (TRACK_COLUMNS_UPDATED = ON);
GO

INSERT INTO Accounts (CompanyName, Industry, AnnualRevenue) VALUES
('Acme Corp', 'Technology', 5000000.00),
('Globex Inc', 'Manufacturing', 12000000.00),
('Initech', 'Financial Services', 8500000.00),
('Umbrella Ltd', 'Healthcare', 25000000.00),
('Stark Industries', 'Aerospace', 45000000.00);
GO

INSERT INTO Opportunities (AccountID, DealName, Stage, Amount, CloseDate) VALUES
(1, 'Acme Cloud Migration', 'Negotiation', 150000.00, '2026-03-15'),
(2, 'Globex Data Platform', 'Proposal', 300000.00, '2026-04-01'),
(3, 'Initech Analytics Suite', 'Closed Won', 85000.00, '2026-02-01'),
(4, 'Umbrella EHR Upgrade', 'Discovery', 500000.00, '2026-06-30'),
(5, 'Stark Fleet Telemetry', 'Negotiation', 750000.00, '2026-05-15');
GO

-- ==========================================================================
-- HRDB — partially ready (TimeOff missing CT — demonstrates "needs attention")
-- ==========================================================================

CREATE DATABASE HRDB;
GO

USE HRDB;
GO

ALTER DATABASE HRDB SET CHANGE_TRACKING = ON (CHANGE_RETENTION = 2 DAYS, AUTO_CLEANUP = ON);
GO

CREATE TABLE Employees (
    EmployeeID INT PRIMARY KEY IDENTITY,
    Name NVARCHAR(100),
    Department NVARCHAR(100),
    HireDate DATE,
    Salary DECIMAL(12,2)
);
GO

CREATE TABLE Departments (
    DepartmentID INT PRIMARY KEY IDENTITY,
    Name NVARCHAR(100),
    ManagerID INT,
    Budget DECIMAL(15,2)
);
GO

CREATE TABLE TimeOff (
    TimeOffID INT PRIMARY KEY IDENTITY,
    EmployeeID INT FOREIGN KEY REFERENCES Employees(EmployeeID),
    StartDate DATE,
    EndDate DATE,
    Type NVARCHAR(30),
    Status NVARCHAR(20) DEFAULT 'Pending'
);
GO

-- CT on Employees and Departments only — TimeOff deliberately missing
ALTER TABLE Employees ENABLE CHANGE_TRACKING WITH (TRACK_COLUMNS_UPDATED = ON);
ALTER TABLE Departments ENABLE CHANGE_TRACKING WITH (TRACK_COLUMNS_UPDATED = ON);
GO

INSERT INTO Departments (Name, ManagerID, Budget) VALUES
('Engineering', NULL, 2000000.00),
('Sales', NULL, 1500000.00),
('Human Resources', NULL, 800000.00),
('Marketing', NULL, 1200000.00);
GO

INSERT INTO Employees (Name, Department, HireDate, Salary) VALUES
('Alice Johnson', 'Engineering', '2020-03-15', 125000.00),
('Bob Smith', 'Sales', '2019-07-01', 95000.00),
('Carol White', 'Engineering', '2021-01-10', 115000.00),
('David Brown', 'Human Resources', '2018-11-20', 85000.00),
('Eve Davis', 'Marketing', '2022-06-01', 90000.00),
('Frank Wilson', 'Engineering', '2023-02-14', 110000.00);
GO

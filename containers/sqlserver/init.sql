-- Create database
CREATE DATABASE DemoDB;
GO

USE DemoDB;
GO

-- Enable Change Tracking at database level
ALTER DATABASE DemoDB SET CHANGE_TRACKING = ON (CHANGE_RETENTION = 2 DAYS, AUTO_CLEANUP = ON);
GO

-- Create Customers table
CREATE TABLE Customers (
    CustomerID INT PRIMARY KEY IDENTITY,
    Name NVARCHAR(100),
    Email NVARCHAR(200),
    City NVARCHAR(100),
    JoinDate DATETIME2 DEFAULT GETDATE()
);
GO

-- Create Products table
CREATE TABLE Products (
    ProductID INT PRIMARY KEY IDENTITY,
    Name NVARCHAR(100),
    Category NVARCHAR(50),
    Price DECIMAL(10,2),
    Stock INT
);
GO

-- Create Orders table
CREATE TABLE Orders (
    OrderID INT PRIMARY KEY IDENTITY,
    CustomerID INT FOREIGN KEY REFERENCES Customers(CustomerID),
    ProductID INT FOREIGN KEY REFERENCES Products(ProductID),
    Quantity INT,
    Status NVARCHAR(20) DEFAULT 'Pending',
    OrderDate DATETIME2 DEFAULT GETDATE()
);
GO

-- Enable Change Tracking on all tables
ALTER TABLE Customers ENABLE CHANGE_TRACKING WITH (TRACK_COLUMNS_UPDATED = ON);
ALTER TABLE Products ENABLE CHANGE_TRACKING WITH (TRACK_COLUMNS_UPDATED = ON);
ALTER TABLE Orders ENABLE CHANGE_TRACKING WITH (TRACK_COLUMNS_UPDATED = ON);
GO

-- Seed 10 products
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
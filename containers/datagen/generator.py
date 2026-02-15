#!/usr/bin/env python3
"""
SQL Server Data Generator for CDC Demo
Produces realistic e-commerce data in configurable modes: steady, burst, mixed
"""

import os
import sys
import time
import random
import logging
from datetime import datetime
from typing import Optional

import pyodbc
from faker import Faker

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Faker
fake = Faker()


class SQLServerConnector:
    """Manages connection to SQL Server and data operations"""

    def __init__(self, host: str, port: int, user: str, password: str, database: str):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.database = database
        self.conn: Optional[pyodbc.Connection] = None

    def connect(self, max_retries: int = 30) -> bool:
        """Connect to SQL Server with retry logic"""
        connection_string = (
            f"Driver={{ODBC Driver 18 for SQL Server}};"
            f"Server={self.host},{self.port};"
            f"Database={self.database};"
            f"UID={self.user};"
            f"PWD={self.password};"
            f"TrustServerCertificate=yes;"
        )

        for attempt in range(max_retries):
            try:
                self.conn = pyodbc.connect(connection_string, timeout=10)
                logger.info(f"Connected to SQL Server {self.host}:{self.port}/{self.database}")
                return True
            except pyodbc.Error as e:
                logger.warning(f"Connection attempt {attempt + 1}/{max_retries} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2)
        
        logger.error("Failed to connect to SQL Server after all retries")
        return False

    def disconnect(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            logger.info("Disconnected from SQL Server")

    def get_cursor(self):
        """Get a database cursor"""
        return self.conn.cursor()

    def insert_customer(self) -> bool:
        """Insert a new customer"""
        try:
            cursor = self.get_cursor()
            name = fake.name()
            email = fake.email()
            city = fake.city()
            
            cursor.execute(
                "INSERT INTO Customers (Name, Email, City) VALUES (?, ?, ?)",
                (name, email, city)
            )
            self.conn.commit()
            logger.info(f"✓ INSERT Customers: {name} ({email})")
            return True
        except Exception as e:
            logger.error(f"✗ INSERT failed: {e}")
            return False

    def insert_order(self) -> bool:
        """Insert a new order"""
        try:
            cursor = self.get_cursor()
            
            # Get random customer and product IDs
            cursor.execute("SELECT COUNT(*) FROM Customers")
            customer_count = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM Products")
            product_count = cursor.fetchone()[0]
            
            if customer_count == 0 or product_count == 0:
                logger.warning("No customers or products available")
                return False
            
            customer_id = random.randint(1, customer_count)
            product_id = random.randint(1, product_count)
            quantity = random.randint(1, 10)
            
            cursor.execute(
                "INSERT INTO Orders (CustomerID, ProductID, Quantity, Status) VALUES (?, ?, ?, ?)",
                (customer_id, product_id, quantity, 'Pending')
            )
            self.conn.commit()
            logger.info(f"✓ INSERT Orders: Customer {customer_id}, Product {product_id}, Qty {quantity}")
            return True
        except Exception as e:
            logger.error(f"✗ INSERT failed: {e}")
            return False

    def update_order_status(self) -> bool:
        """Update an order status (Pending -> Shipped -> Delivered)"""
        try:
            cursor = self.get_cursor()
            
            # Get a pending order
            cursor.execute("SELECT TOP 1 OrderID, Status FROM Orders WHERE Status != 'Delivered' ORDER BY OrderID DESC")
            result = cursor.fetchone()
            
            if not result:
                logger.debug("No pending orders to update")
                return False
            
            order_id, current_status = result
            
            # Cycle status
            if current_status == 'Pending':
                new_status = 'Shipped'
            elif current_status == 'Shipped':
                new_status = 'Delivered'
            else:
                new_status = 'Pending'
            
            cursor.execute(
                "UPDATE Orders SET Status = ? WHERE OrderID = ?",
                (new_status, order_id)
            )
            self.conn.commit()
            logger.info(f"✓ UPDATE Orders: Order {order_id} {current_status} -> {new_status}")
            return True
        except Exception as e:
            logger.error(f"✗ UPDATE failed: {e}")
            return False

    def update_product_stock(self) -> bool:
        """Update product stock"""
        try:
            cursor = self.get_cursor()
            cursor.execute("SELECT COUNT(*) FROM Products")
            product_count = cursor.fetchone()[0]
            
            if product_count == 0:
                return False
            
            product_id = random.randint(1, product_count)
            stock_delta = random.randint(-5, 10)
            
            cursor.execute(
                "UPDATE Products SET Stock = MAX(0, Stock + ?) WHERE ProductID = ?",
                (stock_delta, product_id)
            )
            self.conn.commit()
            logger.info(f"✓ UPDATE Products: Product {product_id}, Stock {'+' if stock_delta > 0 else ''}{stock_delta}")
            return True
        except Exception as e:
            logger.error(f"✗ UPDATE failed: {e}")
            return False

    def delete_pending_order(self) -> bool:
        """Delete a pending order"""
        try:
            cursor = self.get_cursor()
            cursor.execute("SELECT TOP 1 OrderID FROM Orders WHERE Status = 'Pending' ORDER BY OrderID")
            result = cursor.fetchone()
            
            if not result:
                logger.debug("No pending orders to delete")
                return False
            
            order_id = result[0]
            cursor.execute("DELETE FROM Orders WHERE OrderID = ?", (order_id,))
            self.conn.commit()
            logger.info(f"✓ DELETE Orders: Order {order_id}")
            return True
        except Exception as e:
            logger.error(f"✗ DELETE failed: {e}")
            return False


class DataGenerator:
    """Orchestrates data generation in different modes"""

    def __init__(self, connector: SQLServerConnector, mode: str):
        self.connector = connector
        self.mode = mode.lower()
        self.stats = {'insert': 0, 'update': 0, 'delete': 0}

    def run_steady(self):
        """Steady mode: 1 operation every 6 seconds (10/min)"""
        logger.info("Running in STEADY mode: 10 operations/minute (1 every 6 sec)")
        
        operations = [
            self.connector.insert_customer,
            self.connector.insert_order,
            self.connector.update_order_status,
            self.connector.update_product_stock,
            self.connector.delete_pending_order,
        ]
        
        try:
            while True:
                op = random.choice(operations)
                op_name = op.__name__.split('_', 1)[1]
                
                if op():
                    self.stats[self._categorize_op(op_name)] += 1
                
                time.sleep(6)  # 1 operation every 6 seconds = 10/minute
        except KeyboardInterrupt:
            logger.info("Steady mode interrupted")

    def run_burst(self):
        """Burst mode: 50 operations in 10 sec, then 50 sec pause"""
        logger.info("Running in BURST mode: 50 ops in 10s, then 50s pause")
        
        operations = [
            self.connector.insert_customer,
            self.connector.insert_order,
            self.connector.update_order_status,
            self.connector.update_product_stock,
            self.connector.delete_pending_order,
        ]
        
        try:
            while True:
                logger.info("Starting burst...")
                burst_start = time.time()
                burst_ops = 0
                
                while time.time() - burst_start < 10 and burst_ops < 50:
                    op = random.choice(operations)
                    op_name = op.__name__.split('_', 1)[1]
                    
                    if op():
                        self.stats[self._categorize_op(op_name)] += 1
                        burst_ops += 1
                    
                    time.sleep(0.1)  # 100ms between ops = ~50 in 10s
                
                logger.info(f"Burst complete: {burst_ops} operations")
                logger.info("Pausing for 50 seconds...")
                time.sleep(50)
        except KeyboardInterrupt:
            logger.info("Burst mode interrupted")

    def run_mixed(self):
        """Mixed mode: random INSERT (40%) / UPDATE (40%) / DELETE (20%)"""
        logger.info("Running in MIXED mode: random 40% INSERT, 40% UPDATE, 20% DELETE")
        
        try:
            while True:
                rand = random.random()
                
                if rand < 0.4:  # 40% INSERT
                    if random.choice([True, False]):
                        op = self.connector.insert_customer
                    else:
                        op = self.connector.insert_order
                elif rand < 0.8:  # 40% UPDATE
                    if random.choice([True, False]):
                        op = self.connector.update_order_status
                    else:
                        op = self.connector.update_product_stock
                else:  # 20% DELETE
                    op = self.connector.delete_pending_order
                
                op_name = op.__name__.split('_', 1)[1]
                if op():
                    self.stats[self._categorize_op(op_name)] += 1
                
                # Sleep ~1 second between operations for mixed mode
                time.sleep(random.uniform(0.5, 1.5))
        except KeyboardInterrupt:
            logger.info("Mixed mode interrupted")

    @staticmethod
    def _categorize_op(op_name: str) -> str:
        """Categorize operation into insert/update/delete"""
        if 'insert' in op_name:
            return 'insert'
        elif 'delete' in op_name:
            return 'delete'
        else:
            return 'update'

    def run(self):
        """Start data generation in configured mode"""
        try:
            if self.mode == 'steady':
                self.run_steady()
            elif self.mode == 'burst':
                self.run_burst()
            elif self.mode == 'mixed':
                self.run_mixed()
            else:
                logger.error(f"Unknown mode: {self.mode}. Using steady mode.")
                self.run_steady()
        except Exception as e:
            logger.error(f"Data generation error: {e}")
        finally:
            self._print_summary()

    def _print_summary(self):
        """Print operation summary"""
        total = sum(self.stats.values())
        logger.info(f"\n{'='*60}")
        logger.info(f"Data Generation Summary")
        logger.info(f"{'='*60}")
        logger.info(f"Mode: {self.mode.upper()}")
        logger.info(f"Total Operations: {total}")
        logger.info(f"  Inserts: {self.stats['insert']}")
        logger.info(f"  Updates: {self.stats['update']}")
        logger.info(f"  Deletes: {self.stats['delete']}")
        logger.info(f"{'='*60}\n")


def main():
    """Main entry point"""
    
    # Load configuration from environment variables
    sql_host = os.getenv('SQL_HOST', 'sqlserver')
    sql_port = int(os.getenv('SQL_PORT', 1433))
    sql_user = os.getenv('SQL_USER', 'sa')
    sql_password = os.getenv('SQL_PASSWORD', 'YourStrongPassw0rd!')
    sql_database = os.getenv('SQL_DATABASE', 'DemoDB')
    data_mode = os.getenv('DATA_MODE', 'steady')
    
    logger.info(f"Initializing Data Generator")
    logger.info(f"  Host: {sql_host}:{sql_port}")
    logger.info(f"  Database: {sql_database}")
    logger.info(f"  Mode: {data_mode}")
    
    # Create connector and connect
    connector = SQLServerConnector(sql_host, sql_port, sql_user, sql_password, sql_database)
    if not connector.connect():
        logger.error("Failed to initialize database connection")
        sys.exit(1)
    
    try:
        # Start data generation
        generator = DataGenerator(connector, data_mode)
        generator.run()
    finally:
        connector.disconnect()


if __name__ == '__main__':
    main()

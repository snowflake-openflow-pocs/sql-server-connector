import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { faker } from '@faker-js/faker';
import { US_STATES, type SimulatorMode } from '@/lib/types';

async function retailInsertSales(): Promise<boolean> {
  try {
    const pool = await getConnection('RetailAnalyticsDB');
    const distResult = await pool.request().query('SELECT TOP 1 DistributorID FROM Distributors ORDER BY NEWID()');
    const prodResult = await pool.request().query('SELECT TOP 1 ProductID, UnitPrice FROM Products ORDER BY NEWID()');
    
    if (!distResult.recordset[0] || !prodResult.recordset[0]) return false;
    
    const units = faker.number.int({ min: 1, max: 50 });
    const revenue = parseFloat(prodResult.recordset[0].UnitPrice) * units;
    const state = faker.helpers.arrayElement(US_STATES as unknown as string[]);
    const zipcode = faker.location.zipCode('#####');
    
    await pool.request()
      .input('distId', distResult.recordset[0].DistributorID)
      .input('prodId', prodResult.recordset[0].ProductID)
      .input('revenue', revenue)
      .input('units', units)
      .input('state', state)
      .input('zipcode', zipcode)
      .query(`INSERT INTO SalesTransactions 
              (DistributorID, ProductID, SaleDate, Revenue, Units, State, ZipCode)
              VALUES (@distId, @prodId, CAST(GETDATE() AS DATE), @revenue, @units, @state, @zipcode)`);
    return true;
  } catch (e) {
    console.error('INSERT SalesTransactions failed:', e);
    return false;
  }
}

async function retailUpdateDistributor(): Promise<boolean> {
  try {
    const pool = await getConnection('RetailAnalyticsDB');
    const result = await pool.request().query('SELECT TOP 1 DistributorID FROM Distributors ORDER BY NEWID()');
    if (!result.recordset[0]) return false;
    
    if (Math.random() < 0.5) {
      const region = faker.helpers.arrayElement(['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West']);
      await pool.request()
        .input('region', region)
        .input('id', result.recordset[0].DistributorID)
        .query('UPDATE Distributors SET Region = @region, UpdatedAt = GETDATE() WHERE DistributorID = @id');
    } else {
      const tier = faker.helpers.arrayElement(['Standard', 'Premium', 'Enterprise']);
      await pool.request()
        .input('tier', tier)
        .input('id', result.recordset[0].DistributorID)
        .query('UPDATE Distributors SET ServiceTier = @tier, UpdatedAt = GETDATE() WHERE DistributorID = @id');
    }
    return true;
  } catch (e) {
    console.error('UPDATE Distributors failed:', e);
    return false;
  }
}

async function retailUpdateProduct(): Promise<boolean> {
  try {
    const pool = await getConnection('RetailAnalyticsDB');
    const result = await pool.request().query('SELECT TOP 1 ProductID, UnitPrice FROM Products ORDER BY NEWID()');
    if (!result.recordset[0]) return false;
    
    const priceChange = faker.number.float({ min: -0.1, max: 0.15 });
    const newPrice = Math.max(9.99, parseFloat(result.recordset[0].UnitPrice) * (1 + priceChange));
    
    await pool.request()
      .input('price', Math.round(newPrice * 100) / 100)
      .input('id', result.recordset[0].ProductID)
      .query('UPDATE Products SET UnitPrice = @price, UpdatedAt = GETDATE() WHERE ProductID = @id');
    return true;
  } catch (e) {
    console.error('UPDATE Products failed:', e);
    return false;
  }
}

async function retailInsertAudit(): Promise<boolean> {
  try {
    const pool = await getConnection('RetailAnalyticsDB');
    const messages = ['Batch processing completed', 'Data validation passed', 'Export triggered', 'Sync checkpoint created', 'Metrics aggregation done'];
    const sources = ['BatchJob', 'Validator', 'Exporter', 'Sync', 'Analytics'];
    
    await pool.request()
      .input('message', faker.helpers.arrayElement(messages))
      .input('source', faker.helpers.arrayElement(sources))
      .query('INSERT INTO AuditLog (Message, Source) VALUES (@message, @source)');
    return true;
  } catch (e) {
    console.error('INSERT AuditLog failed:', e);
    return false;
  }
}

async function configInsertCustomer(): Promise<boolean> {
  try {
    const retailPool = await getConnection('RetailAnalyticsDB');
    const distResult = await retailPool.request().query('SELECT TOP 1 DistributorID FROM Distributors ORDER BY NEWID()');
    
    const pool = await getConnection('ConfigDB');
    await pool.request()
      .input('name', faker.company.name())
      .input('distId', distResult.recordset[0]?.DistributorID || 1)
      .input('email', faker.internet.email())
      .query(`INSERT INTO Customers (CustomerName, DistributorID, ContactEmail, Status)
              VALUES (@name, @distId, @email, 'Active')`);
    return true;
  } catch (e) {
    console.error('INSERT Customers failed:', e);
    return false;
  }
}

async function configUpdateCustomer(): Promise<boolean> {
  try {
    const pool = await getConnection('ConfigDB');
    const result = await pool.request().query('SELECT TOP 1 CustomerID, Status FROM Customers ORDER BY NEWID()');
    if (!result.recordset[0]) return false;
    
    const row = result.recordset[0];
    if (row.Status === 'Active' && Math.random() < 0.3) {
      await pool.request()
        .input('id', row.CustomerID)
        .query(`UPDATE Customers 
                SET Status = 'Inactive', EndDate = CAST(GETDATE() AS DATE), UpdatedAt = GETDATE()
                WHERE CustomerID = @id`);
    } else if (row.Status === 'Pending') {
      await pool.request()
        .input('id', row.CustomerID)
        .query("UPDATE Customers SET Status = 'Active', UpdatedAt = GETDATE() WHERE CustomerID = @id");
    } else {
      await pool.request()
        .input('email', faker.internet.email())
        .input('id', row.CustomerID)
        .query('UPDATE Customers SET ContactEmail = @email, UpdatedAt = GETDATE() WHERE CustomerID = @id');
    }
    return true;
  } catch (e) {
    console.error('UPDATE Customers failed:', e);
    return false;
  }
}

async function configUpdatePeriod(): Promise<boolean> {
  try {
    const pool = await getConnection('ConfigDB');
    const result = await pool.request().query('SELECT TOP 1 PeriodID, IsActive FROM ReportingPeriods ORDER BY NEWID()');
    if (!result.recordset[0]) return false;
    
    const newActive = result.recordset[0].IsActive ? 0 : 1;
    await pool.request()
      .input('active', newActive)
      .input('id', result.recordset[0].PeriodID)
      .query('UPDATE ReportingPeriods SET IsActive = @active, UpdatedAt = GETDATE() WHERE PeriodID = @id');
    return true;
  } catch (e) {
    console.error('UPDATE ReportingPeriods failed:', e);
    return false;
  }
}

async function configInsertCategory(): Promise<boolean> {
  try {
    const pool = await getConnection('ConfigDB');
    const l1 = faker.helpers.arrayElement(['Equipment', 'Electronics', 'Supplies', 'Instruments', 'Furniture', 'Software']);
    const l2 = faker.helpers.arrayElement(['Premium', 'Standard', 'Budget', 'Professional', 'Consumer']);
    const l3 = faker.helpers.arrayElement(['Type A', 'Type B', 'Type C', 'Series 1', 'Series 2']);
    
    await pool.request()
      .input('l1', l1)
      .input('l2', l2)
      .input('l3', l3)
      .query('INSERT INTO Categories (CategoryL1, CategoryL2, CategoryL3) VALUES (@l1, @l2, @l3)');
    return true;
  } catch (e) {
    console.error('INSERT Categories failed:', e);
    return false;
  }
}

const OPERATIONS = {
  RetailAnalyticsDB: {
    INSERT: [
      { fn: retailInsertSales, weight: 70 },
      { fn: retailInsertAudit, weight: 30 },
    ],
    UPDATE: [
      { fn: retailUpdateDistributor, weight: 40 },
      { fn: retailUpdateProduct, weight: 60 },
    ],
  },
  ConfigDB: {
    INSERT: [
      { fn: configInsertCustomer, weight: 60 },
      { fn: configInsertCategory, weight: 40 },
    ],
    UPDATE: [
      { fn: configUpdateCustomer, weight: 60 },
      { fn: configUpdatePeriod, weight: 40 },
    ],
  },
};

function weightedChoice(ops: Array<{ fn: () => Promise<boolean>; weight: number }>) {
  const total = ops.reduce((sum, op) => sum + op.weight, 0);
  let r = Math.random() * total;
  for (const op of ops) {
    r -= op.weight;
    if (r <= 0) return op.fn;
  }
  return ops[ops.length - 1].fn;
}

async function performOperation(dbName: 'RetailAnalyticsDB' | 'ConfigDB', mode: SimulatorMode): Promise<boolean> {
  const ops = OPERATIONS[dbName];
  let opFn: () => Promise<boolean>;
  
  if (mode === 'steady') {
    opFn = weightedChoice(ops.INSERT);
  } else {
    opFn = Math.random() < 0.7 ? weightedChoice(ops.INSERT) : weightedChoice(ops.UPDATE);
  }
  
  return opFn();
}

export async function POST(request: NextRequest) {
  try {
    const { mode, count = 10 } = await request.json() as { mode: SimulatorMode; count?: number };
    let operations = 0;
    
    for (let i = 0; i < count; i++) {
      for (const dbName of ['RetailAnalyticsDB', 'ConfigDB'] as const) {
        const success = await performOperation(dbName, mode);
        if (success) operations++;
      }
    }
    
    return NextResponse.json({ success: true, operations });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

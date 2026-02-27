import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dbConfig from './database';

// Import core entities
import { User } from '../entities/core/User';
import { Role } from '../entities/core/Role';
import { Page } from '../entities/core/Page';
import { RoleDetail } from '../entities/core/RoleDetail';
import { UserDetail } from '../entities/core/UserDetail';

// Import inventory entities
import { Store } from '../entities/inventory/Store';
import { Item } from '../entities/inventory/Item';
import { Rate } from '../entities/inventory/Rate';
import { OpeningStock } from '../entities/inventory/OpeningStock';
import { StoreTransferNote } from '../entities/inventory/StoreTransferNote';
import { StoreTransferNoteDetail } from '../entities/inventory/StoreTransferNoteDetail';
import { StockMovement } from '../entities/inventory/StockMovement';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  synchronize: false, // Never true in production - use migrations
  logging: process.env.NODE_ENV === 'development',
  entities: [
    // Core entities
    User,
    Role,
    Page,
    RoleDetail,
    UserDetail,
    
    // Inventory entities
    Store,
    Item,
    Rate,
    OpeningStock,
    StoreTransferNote,
    StoreTransferNoteDetail,
    StockMovement,
  ],
  migrations: ['src/db/migrations/**/*.ts'],
  subscribers: ['src/db/subscribers/**/*.ts'],
  ssl: dbConfig.ssl,
  extra: {
    max: dbConfig.max || 50,
    idleTimeoutMillis: dbConfig.idleTimeoutMillis || 30000,
    connectionTimeoutMillis: dbConfig.connectionTimeoutMillis || 2000,
  },
});

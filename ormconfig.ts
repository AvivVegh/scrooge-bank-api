import { DataSource } from 'typeorm';
import { databaseConfig } from './src/config/database.config';

export default new DataSource({
  ...databaseConfig,
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'migrations',
} as any);

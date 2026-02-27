# PD Server - Project Management Application Backend

This is the backend server for a Project Management Application built with Express.js, TypeScript, and PostgreSQL.

## Features

- **User Management**: Role-based user management with full CRUD operations
- **Authentication**: Username/password authentication using JWT
- **Role-Based Access Control**: Permissions system with roles and permissions
- **Profile Management**: Hierarchical profile system (Circle → Division → Sub Division)
- **Departments**: Department management system
- **RESTful API**: Complete REST API for all entities

## Tech Stack

- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Logging**: Winston
- **Security**: Helmet, CORS

## Project Structure

```
pd-server/
├── src/
│   ├── server.ts             # Express server entry point
│   ├── config/
│   │   └── database.ts       # Database configuration
│   ├── db/
│   │   ├── connection.ts     # Database connection pool
│   │   ├── schema.sql        # Database schema
│   │   ├── migrate.ts        # Migration script
│   │   └── seed.ts           # Seed data script
│   ├── features/
│   │   ├── auth/            # Authentication (controller, routes)
│   │   ├── users/           # User (model, controller, routes)
│   │   ├── roles/           # Role (model, controller, routes)
│   │   ├── departments/     # Department (model, controller, routes)
│   │   ├── circles/         # Circle (model, controller, routes)
│   │   ├── divisions/       # Division (model, controller, routes)
│   │   └── sub-divisions/   # Sub Division (model, controller, routes)
│   ├── lib/
│   │   ├── auth-config.ts   # NextAuth configuration
│   │   └── auth.ts          # Auth utilities
│   ├── middlewares/
│   │   └── auth.ts          # Authentication middleware
│   ├── types/
│   │   ├── index.ts         # TypeScript types
│   │   └── next-auth.d.ts   # NextAuth type extensions
│   └── utils/
│       ├── logger.ts        # Winston logger
│       ├── AppError.ts      # Custom error class
│       └── apiResponse.ts   # API response utilities
├── package.json
├── tsconfig.json
└── README.md
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pd_db
DB_USER=postgres
DB_PASSWORD=your_password

# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-here-minimum-32-characters-long
NEXTAUTH_URL=http://localhost:3000

# Node Environment
NODE_ENV=development
```

Generate a secure NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### 3. Set Up Database

Create a PostgreSQL database:

```sql
CREATE DATABASE pd_db;
```

### 4. Run Migrations

```bash
npm run migrate
```

This will create all necessary tables in the database.

### 5. Seed Database

```bash
npm run seed
```

This will populate the database with:
- Default roles
- Default permissions
- Default departments
- Sample circles, divisions, and sites
- Test users (admin/admin123)

### 6. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:7076` (or the port specified in your `.env`)

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login with username/password (returns JWT token)
- `GET /api/auth/verify` - Verify JWT token

**Note:** All other endpoints require authentication via JWT token in the `Authorization` header:
```
Authorization: Bearer <your-jwt-token>
```

### Users

- `GET /api/users` - Get all users (with pagination)
- `POST /api/users` - Create a new user
- `GET /api/users/[id]` - Get user by ID
- `PUT /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

### Roles

- `GET /api/roles` - Get all roles (with pagination)
- `GET /api/roles?all=true` - Get all roles without pagination
- `POST /api/roles` - Create a new role
- `GET /api/roles/[id]` - Get role by ID
- `PUT /api/roles/[id]` - Update role
- `DELETE /api/roles/[id]` - Delete role

### Departments

- `GET /api/departments` - Get all departments (with pagination)
- `GET /api/departments?all=true` - Get all departments without pagination
- `POST /api/departments` - Create a new department
- `GET /api/departments/[id]` - Get department by ID
- `PUT /api/departments/[id]` - Update department
- `DELETE /api/departments/[id]` - Delete department

### Circles

- `GET /api/circles` - Get all circles (with pagination)
- `GET /api/circles?all=true` - Get all circles without pagination
- `POST /api/circles` - Create a new circle
- `GET /api/circles/[id]` - Get circle by ID
- `PUT /api/circles/[id]` - Update circle
- `DELETE /api/circles/[id]` - Delete circle

### Divisions

- `GET /api/divisions` - Get all divisions (with pagination)
- `GET /api/divisions?circle_id=1` - Get divisions by circle
- `GET /api/divisions?all=true&circle_id=1` - Get all divisions for a circle
- `POST /api/divisions` - Create a new division
- `GET /api/divisions/[id]` - Get division by ID
- `PUT /api/divisions/[id]` - Update division
- `DELETE /api/divisions/[id]` - Delete division

### Sites

- `GET /api/sites` - Get all sites (with pagination)
- `GET /api/sites?division_id=1` - Get sites by division
- `GET /api/sites?all=true&division_id=1` - Get all sites for a division
- `POST /api/sub-divisions` - Create a new sub division
- `GET /api/sub-divisions/[id]` - Get sub division by ID
- `PUT /api/sub-divisions/[id]` - Update sub division
- `DELETE /api/sub-divisions/[id]` - Delete sub division

## Default Roles

1. Planning Cell/Project Directorate
2. Project Director (PD)
3. XEN / SDO (RRE)
4. SE / CE (RRE)
5. Admin / IT Cell

## Default Permissions

1. add_business_plan_projects
2. approve_project_initiation
3. update_progress
4. monitor_progress
5. manage_users

## Default Departments

1. Both
2. Construction / GSC
3. Field Divisions
4. HQ
5. Corporate

## Default Test User

- **Username**: admin
- **Password**: admin123
- **Role**: Admin / IT Cell

## Database Schema

The database includes the following tables:

- `users` - User accounts
- `roles` - User roles
- `permissions` - System permissions
- `role_permissions` - Role-permission mappings
- `departments` - Departments
- `circles` - Circles (top level)
- `divisions` - Divisions (linked to circles)
- `sites` - Sites (linked to divisions)

## Profile Hierarchy

The profile system follows a hierarchical structure:

```
Circle
  └── Division
      └── Sub Division
```

Users can be assigned to:
- Circle only
- Circle + Division
- Circle + Division + Sub Division

## Authentication

All API routes (except `/api/auth/*`) require authentication. The middleware automatically protects these routes.

## Error Handling

The API uses consistent error responses:

```json
{
  "success": false,
  "message": "Error message",
  "error": "Error message"
}
```

## Logging

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

In development, logs are also printed to the console.

## Development

- Run migrations: `npm run migrate`
- Seed database: `npm run seed`
- Start dev server: `npm run dev`
- Build: `npm run build`
- Start production: `npm start`

## License

ISC


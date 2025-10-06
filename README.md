# Scrooge Bank API

A comprehensive banking API built with NestJS and TypeScript that provides user authentication, account management, deposits/withdrawals, and loan services.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
  - [Authentication](#authentication)
  - [Account Management](#account-management)
  - [Loans](#loans)
- [API Flow Guide](#api-flow-guide)
- [Swagger Documentation](#swagger-documentation)

## Overview

Scrooge Bank API is a RESTful banking service that simulates real-world banking operations including user registration, account creation, deposits, withdrawals, loan applications, and loan payments. The API is built with security and reliability in mind, featuring JWT authentication, idempotency keys, and comprehensive transaction management.

## Features

- 🔐 **JWT Authentication** with refresh tokens
- 💰 **Account Management** (create, view, close accounts)
- 💳 **Transactions** (deposits and withdrawals)
- 🏦 **Loan Services** (apply for loans, make payments)
- 📊 **Account Statements** with date range filtering
- 🔒 **Secure** with password hashing and HTTP-only cookies
- ♻️ **Idempotency** support to prevent duplicate transactions
- 📝 **API Documentation** with Swagger/OpenAPI

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn package manager

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd scrooge-bank-api

# Install dependencies
npm install
```

### Environment Setup

Create a `.env` file in the root directory based on the `env.example` file:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
DB_DATABASE=scrooge_bank

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key

# Server
PORT=3000
NODE_ENV=development
```

### Running the Application

```bash
# Run database migrations
npm run migration:run

# Seed the database (optional)
npm run seed:bank

# Start in development mode
npm run start:dev

# Start in production mode
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000`

## API Documentation

### Base URL

```
http://localhost:3000
```

### Authentication

All authentication endpoints are prefixed with `/auth`.

#### 1. Register a New User

**Endpoint:** `POST /auth/register`

**Description:** Create a new user account and receive an access token.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Cookie:** Sets `refresh_token` HTTP-only cookie

**Status Codes:**

- `201 Created` - User successfully registered
- `400 Bad Request` - Validation failed
- `409 Conflict` - User already exists

---

#### 2. Login

**Endpoint:** `POST /auth/login`

**Description:** Authenticate an existing user and receive an access token.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Cookie:** Sets `refresh_token` HTTP-only cookie

**Status Codes:**

- `200 OK` - Login successful
- `401 Unauthorized` - Invalid credentials
- `400 Bad Request` - Validation failed

---

#### 3. Refresh Access Token

**Endpoint:** `POST /auth/refresh`

**Description:** Get a new access token using the refresh token stored in cookies.

**Request Body:**

```json
{
  "userId": "user-uuid-here"
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Cookie:** Updates `refresh_token` HTTP-only cookie

**Status Codes:**

- `200 OK` - Token refreshed successfully
- `401 Unauthorized` - Invalid or expired refresh token
- `400 Bad Request` - Validation failed

---

### Account Management

All account endpoints are prefixed with `/account` and require JWT authentication via `Authorization: Bearer <token>` header.

#### 1. Create Account

**Endpoint:** `POST /account/create`

**Description:** Create a new bank account for the authenticated user.

**Headers:**

```
Authorization: Bearer <your_access_token>
```

**Request Body:** None

**Response:**

```json
{
  "id": "account-uuid",
  "userId": "user-uuid",
  "balance": 0,
  "status": "active",
  "createdAt": "2025-10-06T12:00:00.000Z",
  "updatedAt": "2025-10-06T12:00:00.000Z"
}
```

**Status Codes:**

- `201 Created` - Account successfully created
- `401 Unauthorized` - Missing or invalid token
- `409 Conflict` - Account already exists for user

---

#### 2. Get Account Information

**Endpoint:** `GET /account/:accountId`

**Description:** Retrieve information about a specific account.

**Headers:**

```
Authorization: Bearer <your_access_token>
```

**Response:**

```json
{
  "id": "account-uuid",
  "userId": "user-uuid",
  "balance": 10000,
  "status": "active",
  "createdAt": "2025-10-06T12:00:00.000Z",
  "updatedAt": "2025-10-06T12:00:00.000Z"
}
```

**Status Codes:**

- `200 OK` - Account retrieved successfully
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Account not found

---

#### 3. Get All Accounts

**Endpoint:** `GET /account`

**Description:** Retrieve all accounts for the authenticated user.

**Headers:**

```
Authorization: Bearer <your_access_token>
```

**Response:**

```json
[
  {
    "id": "account-uuid",
    "userId": "user-uuid",
    "balance": 10000,
    "status": "active",
    "createdAt": "2025-10-06T12:00:00.000Z",
    "updatedAt": "2025-10-06T12:00:00.000Z"
  }
]
```

**Status Codes:**

- `200 OK` - Accounts retrieved successfully
- `401 Unauthorized` - Missing or invalid token

---

#### 4. Deposit Funds

**Endpoint:** `POST /account/deposit`

**Description:** Deposit funds into an account.

**Headers:**

```
Authorization: Bearer <your_access_token>
```

**Request Body:**

```json
{
  "accountId": "account-uuid",
  "amount": 100.5,
  "idempotencyKey": "unique-key-123"
}
```

**Response:**

```json
{
  "transactionId": "transaction-uuid",
  "accountId": "account-uuid",
  "amount": 100.5,
  "newBalance": 100.5,
  "timestamp": "2025-10-06T12:00:00.000Z"
}
```

**Status Codes:**

- `200 OK` - Deposit successful
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Account not found

**Note:** The `idempotencyKey` is optional but recommended to prevent duplicate deposits.

---

#### 5. Withdraw Funds

**Endpoint:** `POST /account/withdraw`

**Description:** Withdraw funds from an account.

**Headers:**

```
Authorization: Bearer <your_access_token>
```

**Request Body:**

```json
{
  "accountId": "account-uuid",
  "amount": 50.0,
  "idempotencyKey": "unique-key-456"
}
```

**Response:**

```json
{
  "transactionId": "transaction-uuid",
  "accountId": "account-uuid",
  "amount": 50.0,
  "newBalance": 50.5,
  "timestamp": "2025-10-06T12:00:00.000Z"
}
```

**Status Codes:**

- `200 OK` - Withdrawal successful
- `400 Bad Request` - Insufficient funds
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Account not found

---

#### 6. Get Account Statement

**Endpoint:** `GET /account/:accountId/statement?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD`

**Description:** Retrieve account statement for a specific date range.

**Headers:**

```
Authorization: Bearer <your_access_token>
```

**Query Parameters:**

- `fromDate` - Start date (YYYY-MM-DD format)
- `toDate` - End date (YYYY-MM-DD format)

**Response:**

```json
{
  "accountId": "account-uuid",
  "fromDate": "2025-10-01",
  "toDate": "2025-10-06",
  "openingBalance": 0,
  "closingBalance": 100.5,
  "transactions": [
    {
      "id": "transaction-uuid",
      "type": "deposit",
      "amount": 100.5,
      "balance": 100.5,
      "timestamp": "2025-10-06T12:00:00.000Z",
      "description": "Deposit"
    }
  ]
}
```

**Status Codes:**

- `200 OK` - Statement retrieved successfully
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Account not found

---

#### 7. Close Account

**Endpoint:** `POST /account/close`

**Description:** Close an existing account.

**Headers:**

```
Authorization: Bearer <your_access_token>
```

**Request Body:**

```json
{
  "accountId": "account-uuid"
}
```

**Response:**

```json
{
  "id": "account-uuid",
  "status": "closed",
  "closedAt": "2025-10-06T12:00:00.000Z"
}
```

**Status Codes:**

- `200 OK` - Account closed successfully
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Account not found

---

### Loans

All loan endpoints are prefixed with `/loan` and require JWT authentication.

#### 1. Apply for a Loan

**Endpoint:** `POST /loan/apply`

**Description:** Apply for a new loan.

**Headers:**

```
Authorization: Bearer <your_access_token>
```

**Request Body:**

```json
{
  "amount": 5000.0,
  "idempotencyKey": "unique-loan-key-123"
}
```

**Response:**

```json
{
  "id": "loan-uuid",
  "userId": "user-uuid",
  "amount": 5000.0,
  "status": "approved",
  "remainingBalance": 5000.0,
  "createdAt": "2025-10-06T12:00:00.000Z",
  "disbursedAt": "2025-10-06T12:00:00.000Z"
}
```

**Status Codes:**

- `201 Created` - Loan successfully applied
- `400 Bad Request` - Validation failed
- `401 Unauthorized` - Missing or invalid token
- `409 Conflict` - Active loan already exists

**Note:** The `idempotencyKey` is optional but recommended to prevent duplicate loan applications.

---

#### 2. Get All Loans

**Endpoint:** `GET /loan`

**Description:** Retrieve all loans for the authenticated user.

**Headers:**

```
Authorization: Bearer <your_access_token>
```

**Response:**

```json
[
  {
    "id": "loan-uuid",
    "userId": "user-uuid",
    "amount": 5000.0,
    "status": "approved",
    "remainingBalance": 5000.0,
    "createdAt": "2025-10-06T12:00:00.000Z",
    "disbursedAt": "2025-10-06T12:00:00.000Z"
  }
]
```

**Status Codes:**

- `200 OK` - Loans retrieved successfully
- `401 Unauthorized` - Missing or invalid token

---

#### 3. Make a Loan Payment

**Endpoint:** `POST /loan/:loanId/payment/:paymentId`

**Description:** Make a payment towards an existing loan.

**Headers:**

```
Authorization: Bearer <your_access_token>
```

**URL Parameters:**

- `loanId` - The UUID of the loan
- `paymentId` - A unique identifier for this payment (for idempotency)

**Request Body:**

```json
{
  "amount": 1000.0,
  "fromAccountId": "account-uuid"
}
```

**Response:**

```json
{
  "paymentId": "payment-uuid",
  "loanId": "loan-uuid",
  "amount": 1000.0,
  "remainingCents": 400000,
  "timestamp": "2025-10-06T12:00:00.000Z"
}
```

**Status Codes:**

- `200 OK` - Payment successful
- `400 Bad Request` - Insufficient funds in account
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Loan or account not found

---

## API Flow Guide

Here's a step-by-step guide to using the Scrooge Bank API:

### Step 1: Register and Authenticate

```bash
# Register a new user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Save the `accessToken` from the response.**

---

### Step 2: Create a Bank Account

```bash
# Create an account
curl -X POST http://localhost:3000/account/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Save the `id` (account UUID) from the response.**

---

### Step 3: Deposit Funds

```bash
# Deposit money into your account
curl -X POST http://localhost:3000/account/deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "accountId": "YOUR_ACCOUNT_ID",
    "amount": 10000,
    "idempotencyKey": "deposit-001"
  }'
```

---

### Step 4: Apply for a Loan

```bash
# Apply for a loan
curl -X POST http://localhost:3000/loan/apply \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "amount": 5000,
    "idempotencyKey": "loan-app-001"
  }'
```

**Save the loan `id` from the response.**

---

### Step 5: Make a Loan Payment

```bash
# Make a payment towards your loan
curl -X POST http://localhost:3000/loan/YOUR_LOAN_ID/payment/payment-001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "amount": 1000,
    "fromAccountId": "YOUR_ACCOUNT_ID"
  }'
```

---

### Step 6: Check Your Account Balance

```bash
# Get account information
curl -X GET http://localhost:3000/account/YOUR_ACCOUNT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### Step 7: View Account Statement

```bash
# Get account statement for a date range
curl -X GET "http://localhost:3000/account/YOUR_ACCOUNT_ID/statement?fromDate=2025-10-01&toDate=2025-10-31" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Swagger Documentation

Interactive API documentation is available via Swagger UI:

```
http://localhost:3000/api
```

Visit this URL in your browser to explore all endpoints, test requests, and view detailed schema definitions.

## Development

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:cov

# Run linting
npm run lint

# Format code
npm run format

# Run in development mode with hot-reload
npm run start:dev
```

## Database Migrations

```bash
# Generate a new migration
npm run migration:generate -- src/migrations/MigrationName

# Create a blank migration
npm run migration:create -- src/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Architecture

- **Framework:** NestJS
- **Database:** PostgreSQL with TypeORM
- **Authentication:** JWT with refresh token rotation
- **Validation:** class-validator and class-transformer
- **Documentation:** Swagger/OpenAPI
- **Security:**
  - Password hashing with Argon2
  - HTTP-only cookies for refresh tokens
  - JWT bearer tokens for API authentication
  - Idempotency keys for critical operations

## License

UNLICENSED - Private use only

---

**Happy Banking! 💰**

# Scrooge Bank API

A comprehensive banking API built with NestJS and TypeScript that provides user authentication, account management, deposits/withdrawals, and loan services.

## Table of Contents

- [Overview](#overview)
- [User Stories](#user-stories)
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
- [Postman Collection](#postman-collection)

## Overview

Scrooge Bank API is a RESTful banking service that simulates real-world banking operations including user registration, account creation, deposits, withdrawals, loan applications, and loan payments. The API is built with security and reliability in mind, featuring JWT authentication, idempotency keys, and comprehensive transaction management.

Scrooge Bank has opened for business! We are targeting customers who are technically savvy and have decided they love doing banking all via API Requests.

We are starting off with only two types of accounts - Checking Accounts and Personal Loans. We want our customers to be able to withdraw and deposit money into their checking accounts, and for loan customers to apply for loans that distribute outside the bank.

We are pretty generous, so any loan our bank can cover, we will approve at a 0% interest. So much for our scrooge reputation!

Our bank is starting off with $250,000 USD to cover loans, and we are also allowed to use up to 25% of the customers' money on hand.

## User Stories

### 1. General

- As the bank operator, I should be able to see how much money total we currently have on hand.
- As the bank operator, user withdrawals are allowed to put the bank into debt, but loans are not.

### 2. Accounts

- As a user, I should be able to open an Account
- As a user, I should be able to close an Account
- As a user, I should not be allowed to have more than 1 open account

### 3. Deposits

- As a user, I should be able to make a deposit to my account
- As a user, If I do not have an account when I deposit, I should see an error
- As a user, I should not be able to make deposits to other people's accounts

### 4. Withdrawals

- As a user, I should be able to make a withdrawal from my account
- As a user, is I do not have enough funds, I should see an error
- As a user, I should not be able to make withdrawals from other people's accounts

### 5. Loans

- As a user, I should be able to apply for a loan
- As a user, my loan should be accepted if the bank has enough money to cover it
- As a user, when I apply for a loan, it should be rejected if the bank doesn't have enough money to cover it.
- As a user, I can make a payment on my loan

### 6. Authentication - Self-Directed User Story

#### User Story: Access & Role Discovery

As an authenticated user, I need to:

- obtain an access token to call protected APIs, and
- discover my effective roles/permissions, so that my UI and actions are tailored to what I'm allowed to do.

#### Why did I pick this story?

- Auth is the "first mile" dependency for everything else. Without a reliable way to get a token and know what I can do, every other feature is blocked or implemented inconsistently across services. This story unblocks developers, enables role-gated UX, and creates a single source of truth for authorization.

#### What user value does it deliver?

- Clarity & speed: Users immediately see what they can do; no trial-and-error errors.
- Security: Principle of least privilege via roles/permissions, audit-friendly.

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

- Node.js (v22 or higher)
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

The easiest way to run the Scrooge Bank API is using Docker Compose, which will set up both the application and PostgreSQL database in containers.

#### Prerequisites for Docker

- Docker Engine (v20.10 or higher)
- Docker Compose (v2.0 or higher)

#### Quick Start with Docker

```bash
# Clone the repository
git clone <repository-url>
cd scrooge-bank-api

# Start all services (database + API)
docker-compose up
```

The application will automatically:

1. ✅ Pull and start PostgreSQL database
2. ✅ Build the NestJS application
3. ✅ Run database migrations
4. ✅ Seed the database with initial data
5. ✅ Start the API server

**Access the API:**

- **API:** `http://localhost:3001`
- **Swagger Documentation:** `http://localhost:3001/api`
- **Database:** `localhost:5432`

#### Docker Commands

```bash
# Start services in detached mode (background)
docker-compose up -d --build

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f app
docker-compose logs -f postgres

# Stop all services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v
```

#### Docker Configuration

The `docker-compose.yml` file defines two services:

**PostgreSQL Database:**

- Image: `postgres:15-alpine`
- Port: `5432` (mapped to host)
- Database: `scrooge_bank`
- Username: `postgres`
- Password: `postgres`
- Volume: `postgres_data_dev` (persists data)

**NestJS Application:**

- Port: `3000` (container) → `3001` (host)
- Auto-runs migrations and seeding
- Hot-reload enabled with volume mounting
- Health check endpoint configured

#### Environment Variables (Docker)

The docker-compose file sets these environment variables automatically:

```yaml
NODE_ENV: development
DATABASE_HOST: postgres
DATABASE_PORT: 5432
DATABASE_NAME: scrooge_bank
DATABASE_USER: postgres
DATABASE_PASSWORD: postgres
BANK_BASE_CASH_AMOUNT: 250000
JWT_ACCESS_SECRET: supersecret
JWT_ACCESS_TOKEN_EXPIRATION_TIME: 15m
PORT: 3000
```

⚠️ **Note:** These are development defaults. For production, use a `.env` file or update the docker-compose configuration with secure values.

#### Customizing Docker Setup

To customize the configuration, you can:

1. **Override environment variables:**

   ```bash
   # Create a .env file in the project root
   cp env.example .env
   # Edit .env with your values
   ```

2. **Change the exposed port:**
   Edit `docker-compose.yml` and modify:

   ```yaml
   ports:
     - 'YOUR_PORT:3000'
   ```

**Base url:**

```
http://localhost:3001
```

### Authentication

All authentication endpoints are prefixed with `/v1/auth`.

#### 1. Register a New User

**Endpoint:** `POST /v1/auth/register`

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

**Endpoint:** `POST /v1/auth/login`

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

**Endpoint:** `POST /v1/auth/refresh`

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

All account endpoints are prefixed with `/v1/account` and require JWT authentication via `Authorization: Bearer <token>` header.

#### 1. Create Account

**Endpoint:** `POST /v1/account/create`

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

**Endpoint:** `GET /v1/account/:accountId`

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

**Endpoint:** `GET /v1/account`

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

**Endpoint:** `POST /v1/account/deposit`

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

**Endpoint:** `POST /v1/account/withdraw`

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

**Endpoint:** `GET /v1/account/:accountId/statement?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD`

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

**Endpoint:** `POST /v1/account/close`

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

All loan endpoints are prefixed with `/v1/loan` and require JWT authentication.

#### 1. Apply for a Loan

**Endpoint:** `POST /v1/loan/apply`

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

**Endpoint:** `GET /v1/loan`

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

**Endpoint:** `POST /v1/loan/:loanId/payment/:paymentId`

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

### Operator/Admin

All operator endpoints are prefixed with `/v1/admin/operator` and require JWT authentication with ADMIN role.

#### 1. Get Bank Balance

**Endpoint:** `GET /v1/admin/operator/balance`

**Description:** Get total bank cash on hand (can be negative due to withdrawals).

**Headers:**

```
Authorization: Bearer <your_access_token>
```

**Response:**

```json
{
  "balanceCents": 1000000,
  "balance": 10000.0
}
```

**Status Codes:**

- `200 OK` - Balance retrieved successfully
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Admin role required

---

#### 2. Get Loan Funds Breakdown

**Endpoint:** `GET /v1/admin/operator/loan-funds`

**Description:** Get detailed breakdown of available funds for loan disbursement.

**Headers:**

```
Authorization: Bearer <your_access_token>
```

**Response:**

```json
{
  "balanceCents": 950000,
  "balance": 9500.0,
  "baseCashCents": 1000000,
  "depositsOnHandCents": 500000,
  "loanableFromDepositsCents": 125000,
  "outstandingLoansCents": 175000,
  "availableForLoansCents": 950000,
  "availableForLoans": 9500.0
}
```

**Status Codes:**

- `200 OK` - Loan funds retrieved successfully
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Admin role required

**Note:** Withdrawals can put the bank into debt, but loans cannot.

---

#### 3. Check Loan Approval

**Endpoint:** `GET /v1/admin/operator/can-approve-loan?amountCents=50000`

**Description:** Check if a loan amount can be approved based on available funds.

**Headers:**

```
Authorization: Bearer <your_access_token>
```

**Query Parameters:**

- `amountCents` - Loan amount in cents (required)

**Response:**

```json
{
  "canApprove": true,
  "availableForLoansCents": 950000,
  "requestedCents": 50000,
  "shortfallCents": 0
}
```

**Status Codes:**

- `200 OK` - Loan approval check completed
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Admin role required

---

## API Flow Guide

Here's a step-by-step guide to using the Scrooge Bank API:

> **Note:** The examples below use `http://localhost:3001`.

### Step 1: Register and Authenticate

```bash
# Register a new user
curl -X POST http://localhost:3001/v1/auth/register \
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
curl -X POST http://localhost:3001/v1/account/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Save the `id` (account UUID) from the response.**

---

### Step 3: Deposit Funds

```bash
# Deposit money into your account
curl -X POST http://localhost:3001/v1/account/deposit \
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
curl -X POST http://localhost:3001/v1/loan/apply \
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
curl -X POST http://localhost:3001/v1/loan/YOUR_LOAN_ID/payment/payment-001 \
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
curl -X GET http://localhost:3001/v1/account/YOUR_ACCOUNT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### Step 7: View Account Statement

```bash
# Get account statement for a date range
curl -X GET "http://localhost:3001/v1/account/YOUR_ACCOUNT_ID/statement?fromDate=2025-10-01&toDate=2025-10-31" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### Operator/Admin Endpoints (Optional)

To access operator endpoints, you need to register a user with the `admin` role:

```bash
# Register an admin user
curl -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "roles": ["admin"]
  }'
```

**Then use the admin access token to call operator endpoints:**

```bash
# Get bank balance
curl -X GET http://localhost:3001/v1/admin/operator/balance \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"

# Get loan funds breakdown
curl -X GET http://localhost:3001/v1/admin/operator/loan-funds \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"

# Check if loan can be approved
curl -X GET "http://localhost:3001/v1/admin/operator/can-approve-loan?amountCents=50000" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

---

## Swagger Documentation

Interactive API documentation is available via Swagger UI - a powerful interface to explore and test all API endpoints directly from your browser.

### 🌐 Access Swagger UI

**Local Installation:**

```
http://localhost:3000/api
```

**Docker Installation:**

```
http://localhost:3001/api
```

### ✨ Features

The Swagger UI provides:

- 📖 **Interactive Documentation**: Browse all endpoints with detailed descriptions
- 🧪 **Live API Testing**: Execute requests directly from the browser
- 📋 **Request/Response Examples**: See sample payloads and responses
- 🔐 **Authentication Support**: Built-in JWT token authorization
- 📊 **Schema Definitions**: Detailed DTO and entity structures
- ✅ **Validation Rules**: See all required fields and constraints

### 🚀 Quick Start with Swagger

#### Step 1: Authenticate

1. Navigate to the **Authentication** section
2. Expand `POST /v1/auth/register` or `POST /v1/auth/login`
3. Click **"Try it out"**
4. Enter your credentials:
   ```json
   {
     "email": "user@example.com",
     "password": "password123"
   }
   ```
5. Click **"Execute"**
6. Copy the `accessToken` from the response

#### Step 2: Authorize

1. Click the **"Authorize"** button (🔒 icon) at the top right
2. In the "Value" field, enter: `Bearer YOUR_ACCESS_TOKEN`
3. Click **"Authorize"**
4. Click **"Close"**

✅ Now all protected endpoints will use your access token automatically!

#### Step 3: Test Endpoints

**Create an Account:**

1. Go to **Account Management** section
2. Expand `POST /v1/account/create`
3. Click **"Try it out"** → **"Execute"**
4. Copy the `id` from the response

**Make a Deposit:**

1. Expand `POST /v1/account/deposit`
2. Click **"Try it out"**
3. Enter the request body:
   ```json
   {
     "accountId": "your-account-id-here",
     "amount": 1000,
     "idempotencyKey": "deposit-001"
   }
   ```
4. Click **"Execute"**

**Apply for a Loan:**

1. Go to **Loans** section
2. Expand `POST /v1/loan/apply`
3. Click **"Try it out"**
4. Enter the request body:
   ```json
   {
     "amount": 5000,
     "idempotencyKey": "loan-app-001"
   }
   ```
5. Click **"Execute"**

### 📚 Available Endpoint Groups

The Swagger UI organizes endpoints into the following categories:

**🔐 Authentication**

- `POST /v1/auth/register` - Register a new user
- `POST /v1/auth/login` - Login existing user
- `POST /v1/auth/refresh` - Refresh access token

**💰 Account Management**

- `POST /v1/account/create` - Create a new account
- `GET /v1/account` - Get all user accounts
- `GET /v1/account/:accountId` - Get specific account
- `POST /v1/account/deposit` - Deposit funds
- `POST /v1/account/withdraw` - Withdraw funds
- `GET /v1/account/:accountId/statement` - Get account statement
- `POST /v1/account/close` - Close an account

**🏦 Loans**

- `POST /v1/loan/apply` - Apply for a loan
- `GET /v1/loan` - Get all user loans
- `POST /v1/loan/:loanId/payment/:paymentId` - Make loan payment

**⚙️ Admin/Operator** (requires API key)

- `GET /v1/admin/operator/balance` - Get bank balance
- `GET /v1/admin/operator/loan-funds` - Get available loan funds
- `GET /v1/admin/operator/can-approve-loan` - Check loan approval eligibility

### 💡 Tips for Using Swagger

- **Response Codes**: Each endpoint shows all possible HTTP status codes (200, 400, 401, 404, etc.)
- **Schema Validation**: Click on schema examples to see all field types and validation rules
- **Idempotency Keys**: Use unique keys for deposits, withdrawals, and loan applications to prevent duplicates
- **Token Expiration**: If you get a 401 error, your token may have expired - use `/v1/auth/refresh` to get a new one
- **Try Different Scenarios**: Test error cases by providing invalid data or insufficient funds

## Postman Collection

A comprehensive Postman collection is included in the repository for easy API testing and development.

### 📦 Import the Collection

**File Location:** `bank.postman_collection.json`

**Import Steps:**

1. Open Postman
2. Click **Import** button
3. Select the `bank.postman_collection.json` file from the project root
4. The collection will be imported with all endpoints pre-configured

### ✨ Features

The Postman collection includes:

- **Auto-Variable Management**: Variables are automatically set from API responses
- **Pre-configured Endpoints**: All API endpoints with proper request/response examples
- **Environment Ready**: Works with both local and Docker setups
- **Token Management**: Automatic JWT token handling and refresh

### 🔧 Collection Variables

The collection uses the following variables (auto-managed):

| Variable       | Description        | Auto-Set                         |
| -------------- | ------------------ | -------------------------------- |
| `baseUrl`      | API base URL       | ❌ (default: `localhost:3001`)   |
| `accessToken`  | JWT access token   | ✅ (from login/register)         |
| `refreshToken` | JWT refresh token  | ✅ (from login/register)         |
| `userId`       | User ID            | ✅ (extracted from JWT)          |
| `accountId`    | Account ID         | ✅ (from create account)         |
| `loanId`       | Loan ID            | ✅ (from loan apply)             |
| `email`        | User email         | ❌ (default: `user@example.com`) |
| `password`     | User password      | ❌ (default: `password123`)      |
| `amount`       | Transaction amount | ❌ (default: `1000`)             |
| `loanAmount`   | Loan amount        | ❌ (default: `100`)              |

### 🚀 Quick Start with Postman

1. **Import the collection** (see steps above)

2. **Set your base URL** (if different from default):
   - Click on the collection
   - Go to **Variables** tab
   - Update `baseUrl` to your API server (e.g., `http://localhost:3001`)

3. **Customize credentials** (optional):
   - Update `email` and `password` variables
   - Or use the default: `user@example.com` / `password123`

4. **Run the workflow**:
   - **Step 1**: Run `POST /v1/auth/register` or `POST /v1/auth/login`
     - ✅ Automatically sets `accessToken`, `refreshToken`, and `userId`
   - **Step 2**: Run `POST /v1/account/create`
     - ✅ Automatically sets `accountId`
   - **Step 3**: Run `POST /v1/account/deposit`
     - Uses the auto-set `accountId`
   - **Step 4**: Run `POST /v1/loan/apply`
     - ✅ Automatically sets `loanId`
   - **Step 5**: Run `POST /v1/loan/:loanId/payment/:paymentId`
     - Uses the auto-set `loanId` and `accountId`

5. **Token expired?**
   - Run `POST /v1/auth/refresh` to get a new access token
     - ✅ Automatically updates `accessToken` and `refreshToken`

### 📋 Available Endpoints in Collection

**Authentication:**

- `POST /v1/auth/register` - Register new user
- `POST /v1/auth/login` - Login user
- `POST /v1/auth/refresh` - Refresh access token

**Account Management:**

- `POST /v1/account/create` - Create new account
- `GET /v1/account` - Get all accounts
- `GET /v1/account/:accountId` - Get specific account
- `POST /v1/account/deposit` - Deposit funds
- `POST /v1/account/withdraw` - Withdraw funds
- `GET /v1/account/:accountId/statement` - Get account statement
- `POST /v1/account/close` - Close account

**Loans:**

- `POST /v1/loan/apply` - Apply for a loan
- `GET /v1/loan` - Get all loans
- `POST /v1/loan/:loanId/payment/:paymentId` - Make loan payment

**Operator/Admin:** (requires ADMIN role)

- `GET /v1/admin/operator/balance` - Get bank balance
- `GET /v1/admin/operator/loan-funds` - Get loan funds breakdown
- `GET /v1/admin/operator/can-approve-loan` - Check loan approval

### 💡 Tips

- **All authenticated requests** automatically include the `Authorization: Bearer {{accessToken}}` header
- **No manual token copying** needed - everything is automated
- **Update baseUrl** once and all requests use it
- **Chain requests** by running them in sequence - variables flow automatically

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

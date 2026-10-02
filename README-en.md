# Soup Restaurant POS System 



A comprehensive Point of Sale (POS) and table management system designed for fast-food and soup restaurants, allowing seamless management of **tables, orders, kitchen operations, cashier transactions, and daily reports** from a single desktop application.

---

## Quick Start

### Prerequisites

- Node.js 20 or higher
- npm 10 or higher
- PostgreSQL 15 or higher (or Docker Desktop)
- Rust and system dependencies for Tauri desktop builds

### Installation with Local PostgreSQL

1. Clone the repository:

   ```bash
   git clone https://github.com/SerhatGenc74/Restoran-Adisyon.git
   cd Restraunt-adisyon
   ```

2. Install dependencies and create environment variables:

   ```bash
   npm install
   cp .env.example .env
   ```

3. Update the `DATABASE_URL` in your `.env` file with your PostgreSQL credentials, and provide a strong random string for `JWT_SECRET`.

4. Generate the Prisma client, run migrations, and seed sample data:

   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. Start the API and the desktop interface in two separate terminals:

   ```bash
   npm run dev:api
   npm run dev:desktop
   ```

   The API runs at `http://localhost:3000` by default, and the Vite UI runs at `http://localhost:5173`.

### Installation with Docker

With Docker Desktop running, you can spin up PostgreSQL and the API with a single command:

```bash
docker compose up --build
```

In this configuration, PostgreSQL uses port `5433` on the host machine, and the API uses `3000`. Migrations are applied automatically on the first startup. To stop:

```bash
docker compose down
```

Running `docker compose down -v` will also delete the local database volume.

### Seed Users

Running `npm run db:seed` creates the following development users. You can change their default passwords via the `SEED_*_PASSWORD` variables in your `.env` file.

| User | Default Password | Role |
|------|------------------|------|
| `admin` | `admin123` | Admin |
| `patron` | `patron123` | Owner (Patron) |
| `garson` | `garson123` | Waiter (Garson) |
| `mutfak` | `mutfak123` | Kitchen (Mutfak) |
| `kasa` | `kasa123` | Cashier (Kasa) |

**Do not use these passwords in production or shared environments.**

---

## What Does It Do?

1. **Waiter (Garson)** takes orders from tables and enters them into the system.
2. **Order** instantly appears on the Kitchen screen via WebSocket.
3. **Kitchen (Mutfak)** updates the preparation status of the order items.
4. **Cashier (Kasa)** views the ticket, can add items, and takes payments (Cash/Card/Split).
5. **Owner (Patron)** pulls end-of-day reports, views revenue and best-selling items.
6. **Offline Mode:** The system can continue working with a local SQLite database when there is no internet, and syncs with the central PostgreSQL database once the connection is restored.

---

## Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Waiter** | View tables, open tickets, add orders, add complimentary items, track kitchen status. |
| **Kitchen** | View pending orders, mark as preparing, mark as ready. |
| **Cashier** | View open tickets, take payments (cash/card/split), close tickets. |
| **Owner** | Manage products/categories/tables/users, view daily reports, revenue tracking, complimentary item reports. |
| **Admin** | System administrator with full access to all operations. |

---

## Tech Stack

### Desktop Application

| Technology | Usage |
|------------|-------|
| **TypeScript** | Type safety across the entire project |
| **React** | User interface |
| **Vite** | Fast development server and bundler |
| **Tauri** | Desktop application packaging (Windows/Linux) |

### Backend API

| Technology | Usage |
|------------|-------|
| **Node.js** | Runtime |
| **Fastify** | HTTP framework |
| **Zod** | Data validation (Single source of truth: `packages/shared`) |
| **JWT** | Token-based authentication |
| **Argon2id** | Secure password hashing |
| **@fastify/websocket** | Real-time notifications for the kitchen screen |

### Database

| Technology | Usage |
|------------|-------|
| **PostgreSQL** | Central/Online database |
| **SQLite** | Desktop/Offline local database — *planned* |
| **Prisma** | ORM, migrations, and seed management |

---

## Architecture

```
React + Tauri (Desktop)
      ↓
Fastify Routes / HTTP
      ↓
Application Use Cases          ← Workflow coordination
      ↓
Domain Entities + Rules        ← Pure business rules (DB agnostic)
      ↓
Repository Interfaces          ← Abstract data access contracts
      ↑
Prisma Adapter                 ← Concrete PostgreSQL/SQLite implementation
      ↓
PostgreSQL / SQLite
```

The project uses **Pragmatic Clean Architecture**. Domain and use-case layers are completely independent of the database. This ensures:

- Business rules live in a single place and are highly testable.
- The exact same use-case can run with either the PostgreSQL or SQLite adapter.
- The Route/HTTP layer is strictly limited to validation and translation.

### Offline Architecture

```
                    ┌── PostgreSQL Repository (Online)
Application Use Case┤
                    └── SQLite Repository (Offline)
                              ↓
                        Outbox Table
                              ↓
                        POST /sync/batch → Central Server
```

---

## Core Business Rules

- A paid order cannot be modified.
- Payments cannot be received for a canceled order.
- The payment amount cannot exceed the remaining balance.
- Product prices are saved as snapshots when an order is created.
- An order item cannot be modified once it enters the "Preparing" state.
- Served or canceled items cannot be canceled again.
- Complimentary items retain their listed price value but are deducted from the collection total.
- A table with an active ticket cannot have a second active ticket opened.
- A table becomes `AVAILABLE` once its ticket is fully paid.
- A category containing active products cannot be deactivated.
- A product belonging to an inactive category cannot be activated.
- A user cannot deactivate their own account.
- Passwords are never stored in plain text (Argon2id).

---

## Development Commands

```bash
npm install                          # Install all dependencies
npm run dev:api                      # Start API development server
npm run dev:desktop                  # Start Frontend development server
npm run typecheck                    # Run TypeScript type checks
npm run build                        # Build all workspaces
npm run db:validate                  # Validate Prisma schema
npm run db:migrate -- --name name    # Create a new Prisma migration
npm run db:seed                      # Load initial seed data
npm run db:studio                    # Open Prisma Studio (DB viewer)
npm run test --workspace=@adisyon/api # Run API tests
npm run tauri:build                  # Build Tauri desktop package
```

---

## Environment Variables

Copy the `.env.example` file to `.env` and configure it:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/adisyon"
JWT_SECRET="your-strong-random-secret"
PORT=3000
```

Refer to the [.env.example](./.env.example) file for the `DATABASE_TYPE`, `API_HOST`, and `VITE_API_URL` variables. Set `DATABASE_TYPE` to `sqlite` for offline mode. If you are using synchronization, you will also need to define `CENTRAL_SERVER_URL` and `SYNC_SECRET`.

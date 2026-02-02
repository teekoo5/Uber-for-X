# Core API

Main API service for the white-labeled mobility platform. Handles authentication, ride management, payments, and fleet operations.

## Features

- **Multi-tenant Architecture**: Full tenant isolation with Row-Level Security
- **Authentication**: JWT-based auth with refresh tokens
- **Ride Management**: Full ride lifecycle from request to completion
- **Dispatch Engine**: Intelligent driver matching with ETA-based ranking
- **Payments**: Stripe Connect integration with MobilePay support
- **Finnish Compliance**: Vero API integration, taximeter support

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL 16 with Drizzle ORM
- **Cache**: Redis 7
- **Queue**: Apache Kafka
- **Payments**: Stripe Connect

## Quick Start

### With Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f core-api
```

### Manual Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh tokens |
| GET | `/api/v1/auth/me` | Get current user |
| PATCH | `/api/v1/auth/me` | Update profile |

### Rides

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/rides/estimate` | Get fare estimate |
| POST | `/api/v1/rides` | Create ride request |
| GET | `/api/v1/rides` | Get ride history |
| GET | `/api/v1/rides/:id` | Get ride details |
| POST | `/api/v1/rides/:id/cancel` | Cancel ride |
| PATCH | `/api/v1/rides/:id/status` | Update status (driver) |
| POST | `/api/v1/rides/:id/complete` | Complete ride (driver) |
| POST | `/api/v1/rides/:id/pay` | Initialize payment |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/ready` | Readiness probe |
| GET | `/live` | Liveness probe |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection URL | Required |
| `REDIS_HOST` | Redis host | `localhost` |
| `JWT_SECRET` | JWT signing secret | Required |
| `STRIPE_SECRET_KEY` | Stripe API key | Optional |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key | Optional |

## Database

### Migrations

```bash
# Generate migrations from schema changes
npx drizzle-kit generate

# Run migrations
npm run db:migrate

# Seed database with test data
npm run db:seed
```

### Schema

The database uses a multi-tenant architecture with the following core tables:

- `tenants` - White-label client configurations
- `users` - Riders, drivers, admins
- `vehicles` - Driver vehicles
- `rides` - Ride requests and trips
- `payments` - Transaction records
- `taximeter_readings` - Finnish compliance data

## Finnish Market Compliance

### Taximeter Integration (2026 Mandate)

The system supports MID-compliant taximeter integration via Bluetooth. The driver app can:
- Connect to physical taximeters (e.g., Mitax-400)
- Sync fare data automatically
- Store journey records for Traficom reporting

### Vero API Integration

Real-time income reporting to Finnish Tax Administration:
- Automatic VAT calculation (13.5% for passenger transport)
- Income reporting per completed ride
- Digital receipt generation

## Development

```bash
# Run tests
npm test

# Lint code
npm run lint

# Type check
npx tsc --noEmit
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Mobile App │────▶│   Core API  │────▶│  PostgreSQL │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Redis    │
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Kafka    │
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Location   │
                    │  Service    │
                    └─────────────┘
```

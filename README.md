# FleetDrive

**White-label ride-hailing platform for taxi companies**

Launch your own Uber-like service with your brand. FleetDrive provides everything you need: mobile apps for riders and drivers, real-time dispatch, fleet management dashboard, and scalable backend infrastructure.

## Overview

FleetDrive is a complete white-label mobility platform designed for taxi companies and fleet operators who want to modernize their operations without building technology from scratch.

### Key Features

- **White-Label Mobile Apps** - Fully branded iOS and Android apps for riders and drivers
- **Real-Time Fleet Tracking** - Live GPS tracking with sub-second updates
- **Smart Dispatch System** - AI-powered driver matching based on ETA and traffic
- **Analytics Dashboard** - Comprehensive insights into fleet performance and revenue
- **Surge Pricing Engine** - Dynamic pricing based on supply and demand
- **Multi-Tenant Architecture** - Isolated data and branding per client

## Project Structure

```
├── src/                      # Landing page (React/Vite/Tailwind)
├── backend/
│   └── core-api/             # Node.js API (Hono, Drizzle, Kafka, Redis)
├── mobile_app/               # Flutter apps (iOS/Android, rider & driver)
├── dispatcher-dashboard/     # Fleet management dashboard (React)
├── k8s/                      # Kubernetes deployment configs
└── docs/                     # Architecture documentation
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Landing Page | React, Vite, Tailwind CSS, shadcn/ui |
| Mobile Apps | Flutter, Riverpod, Google Maps |
| Backend API | Node.js, Hono, TypeScript, Drizzle ORM |
| Database | PostgreSQL with PostGIS |
| Cache & Geo | Redis with GEO commands |
| Messaging | Apache Kafka |
| Infrastructure | Kubernetes, Docker |

## Quick Start

### Landing Page

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Backend API

```bash
cd backend/core-api

# Copy environment variables
cp .env.example .env

# Start with Docker Compose
docker-compose up -d
```

### Mobile App

```bash
cd mobile_app

# Get Flutter dependencies
flutter pub get

# Run for specific flavor
flutter run --flavor taxiCoHelsinki
```

### Dispatcher Dashboard

```bash
cd dispatcher-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

## Architecture

The platform uses an event-driven microservices architecture:

- **API Gateway** - Request routing, authentication, rate limiting
- **Core API** - Ride management, user accounts, payments
- **Location Service** - Real-time GPS tracking via WebSockets
- **Dispatch Engine** - Driver matching with ETA-based algorithms
- **Kafka** - Event streaming between services
- **Redis** - Geospatial indexing for proximity queries

See [Architecture Specification](docs/ARCHITECTURE_SPECIFICATION.md) for detailed documentation.

## Deployment

Kubernetes manifests are provided in the `k8s/` directory:

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Deploy all services
kubectl apply -f k8s/
```

## Pricing

| Plan | Vehicles | Price |
|------|----------|-------|
| Starter | Up to 25 | $299/month |
| Professional | Up to 100 | $799/month |
| Enterprise | Unlimited | Custom |

## License

Proprietary - All rights reserved.

## Contact

For demos and inquiries, visit the landing page or contact the sales team.

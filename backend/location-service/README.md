# Location Service

Real-time location tracking service for the white-labeled mobility platform. Handles driver location updates, proximity searches, and live tracking for the Finnish taxi market.

## Features

- **WebSocket Communication**: Bi-directional real-time updates between drivers and riders
- **Redis GEO**: Geospatial indexing using Redis GEO commands (GEOADD, GEOSEARCH)
- **Multi-Tenant**: Isolated data per white-label client via key prefixes
- **Haversine Formula**: Initial proximity filtering before routing API calls
- **Distributed Locking**: Redlock pattern for preventing double-booking

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Driver App     │────▶│  Location        │────▶│  Redis      │
│  (Flutter)      │◀────│  Service         │◀────│  GEO        │
└─────────────────┘     │  (Node.js/WS)    │     └─────────────┘
                        │                  │
┌─────────────────┐     │                  │     ┌─────────────┐
│  Rider App      │────▶│                  │────▶│  Kafka      │
│  (Flutter)      │◀────│                  │     │  (optional) │
└─────────────────┘     └──────────────────┘     └─────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- Redis 6.2+ (for GEOSEARCH command)
- Docker (optional)

### Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start Redis (if not using Docker)
redis-server

# Run development server
npm run dev
```

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# With debugging tools (Redis Commander)
docker-compose --profile debug up -d

# With Kafka for event streaming
docker-compose --profile kafka up -d
```

## API Reference

### WebSocket Connection

Connect to WebSocket with authentication parameters:

```
ws://localhost:3001/location?userId=driver_001&userType=driver&tenantId=helsinki_001
```

### WebSocket Messages

#### Driver Location Update
```json
{
  "type": "location_update",
  "payload": {
    "driverId": "driver_001",
    "latitude": 60.1699,
    "longitude": 24.9384,
    "heading": 45.0,
    "speed": 30.5,
    "accuracy": 10.0,
    "timestamp": "2026-01-15T10:30:00Z",
    "tenantId": "helsinki_001"
  }
}
```

#### Request Nearby Drivers
```json
{
  "type": "nearby_drivers",
  "payload": {
    "latitude": 60.1699,
    "longitude": 24.9384,
    "radius": 5000,
    "tenantId": "helsinki_001"
  }
}
```

#### Subscribe to Driver (for ride tracking)
```json
{
  "type": "subscribe_driver",
  "payload": {
    "driverId": "driver_001"
  }
}
```

### REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Liveness probe |
| GET | `/ready` | Readiness probe |
| GET | `/stats` | Connection statistics |
| GET | `/api/v1/location/nearby` | Find nearby drivers |
| GET | `/api/v1/location/driver/:id` | Get driver location |
| POST | `/api/v1/location/update` | Update driver location |
| PATCH | `/api/v1/location/driver/:id/availability` | Set driver availability |
| DELETE | `/api/v1/location/driver/:id` | Remove driver |

## Multi-Tenant Architecture

Data is isolated per tenant using Redis key prefixes:

```
mobility:drivers:{tenantId}:locations     # GEO set for driver coordinates
mobility:drivers:{tenantId}:meta:{id}     # Hash for driver metadata
mobility:locks:{tenantId}:driver:{id}     # Distributed locks
```

## Finnish Market Compliance

This service supports the 2026 Finnish taxi regulations:

- **Location Tracking**: Continuous GPS tracking for regulatory compliance
- **Taximeter Integration**: Data structure supports MID-compliant meter data
- **Traficom Compatibility**: Vehicle tracking linked to license verification

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | HTTP server port |
| `REDIS_HOST` | localhost | Redis server host |
| `REDIS_PORT` | 6379 | Redis server port |
| `REDIS_KEY_PREFIX` | mobility: | Key prefix for multi-tenant |
| `WS_PATH` | /location | WebSocket endpoint path |
| `LOCATION_UPDATE_INTERVAL_MS` | 5000 | Driver update frequency |
| `DEFAULT_SEARCH_RADIUS_METERS` | 5000 | Default nearby driver radius |
| `ENABLE_TENANT_ISOLATION` | true | Enforce tenant data isolation |

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch
```

## Production Deployment

### Kubernetes

The service is designed for Kubernetes deployment with:

- Horizontal Pod Autoscaling based on WebSocket connections
- Namespace isolation per tenant (optional)
- ResourceQuotas for noisy neighbor prevention

### Health Checks

- **Liveness**: `GET /health`
- **Readiness**: `GET /ready` (checks Redis connectivity)

## License

Proprietary - All rights reserved

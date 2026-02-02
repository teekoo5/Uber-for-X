# Comprehensive Cursor Build Prompt

## System Role & Goal

"Act as a Principal Full-Stack Engineer. Your goal is to scaffold a production-ready, white-labeled ride-hailing platform (Uber clone) optimized for the Finnish taxi market. The first version must be branded for a local taxi company, but the core architecture must support infinite rebranding (white-labeling) via a multi-tenant backend and a multi-flavor frontend."

## 1. Technical Stack & Architecture

### Frontend
Develop a **Flutter** application using a **Multi-Flavor Architecture**. Organize the directory to include dedicated `assets/<flavor_name>/` folders and use `--dart-define` for compile-time environment variables like `API_ENDPOINT` and `TENANT_ID`.

### Backend
Implement an **Event-Driven Microservices** architecture on **Kubernetes**. Use **Kafka** as the messaging backbone for asynchronous communication between services (e.g., `LocationQueue`, `DriverAssignmentQueue`).

### Real-Time & Geospatial
Use **WebSockets** for persistent rider-driver synchronization. Implement **Redis with Geospatial Indexing** (`GEORADIUS`) for proximity-based matching and sub-second location updates.

### Database
Use **PostgreSQL** with **Row-Level Security (RLS)** or separate schemas per tenant to ensure strict data isolation between white-label clients.

## 2. Core Dispatch Logic

### Matching Algorithm
Implement a matching service that filters drivers by availability, rating, and vehicle type. Use the **Haversine formula** for initial proximity filtering before calling a third-party mapping API (e.g., Google Maps or Radar) for accurate ETA-based ranking.

### Concurrency
Use **Distributed Locking** (Redis Redlock) to prevent multiple assignments of the same driver to different riders simultaneously.

## 3. Finnish Market Compliance & Integration

### Taximeter Integration (2026 Mandate)
Implement a Bluetooth/API bridge in the Driver App to interface with **MID-compliant physical taximeters**. The system must collect and store journey time, distance, and fare data as required by **Traficom**.

### Fiscal Reporting
Integrate with the **Vero API** for real-time reporting of income and VAT (13.5% for passenger transport as of 2026).

### Accessibility
Ensure the UI complies with **EN 301 549 (WCAG 2.1 AA)** as mandated by the European Accessibility Act, including screen reader support and high-contrast modes.

## 4. Payments & Operational Backend

### Payments
Use **Stripe Connect** to handle multi-party payments (payouts to drivers/operators). Enable **MobilePay** and Finnish bank buttons for localized checkout.

### Dispatcher Dashboard
Create a web-based admin panel featuring a live GPS map, driver performance scorecards (tracking speeding or idle time), and a manual override for dispatching.

## 5. DevOps & Scaling

### CI/CD
Set up **Fastlane** to automate the generation of branded APKs and IPAs. Use Fastlane `match` for centralized code signing across multiple client certificates.

### K8s Isolation
Use **Namespaces** and **ResourceQuotas** in Kubernetes to prevent "noisy neighbor" issues between different taxi company tenants.

## Initial Task for Cursor

"Begin by scaffolding the Flutter project structure for two flavors ('helsinki_taxi' and 'white_label_base'). Create the `FlavorConfig` class and the folder structure for flavor-specific logos and themes. Then, generate the basic `LocationService` in Go/Node.js that updates a Redis GEO index via a WebSocket stream."

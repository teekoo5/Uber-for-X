# Mobility Platform - Flutter Mobile App

White-labeled ride-hailing mobile application for the Finnish taxi market. Supports multi-flavor architecture for deploying branded apps for multiple taxi companies from a single codebase.

## Features

- **Multi-Flavor Architecture**: Compile-time branding configuration
- **Real-Time Location**: WebSocket-based driver tracking
- **Accessibility**: EN 301 549 / WCAG 2.1 AA compliant
- **Finnish Market**: Taximeter integration, Vero API support
- **Payment Integration**: Stripe Connect, MobilePay support

## Project Structure

```
mobile_app/
├── lib/
│   ├── config/
│   │   ├── flavor_config.dart    # Multi-flavor configuration
│   │   └── app_config.dart       # App-wide settings
│   ├── models/
│   │   └── location_update.dart  # Location data models
│   ├── services/
│   │   └── location_service.dart # GPS & WebSocket service
│   ├── screens/                  # App screens
│   ├── widgets/                  # Reusable widgets
│   ├── main.dart                 # Entry point
│   └── app.dart                  # Root widget
├── assets/
│   ├── common/                   # Shared assets
│   ├── helsinki_taxi/            # Helsinki Taxi branding
│   │   ├── images/
│   │   └── fonts/
│   └── white_label_base/         # Default/template branding
├── android/
│   └── app/
│       └── src/
│           ├── main/
│           ├── helsinki_taxi/    # Android flavor config
│           └── white_label_base/
├── ios/
│   ├── Runner/
│   ├── helsinki_taxi/            # iOS flavor config
│   └── white_label_base/
└── test/
```

## Getting Started

### Prerequisites

- Flutter SDK 3.16+
- Dart 3.2+
- Android Studio / Xcode
- Redis server (for backend)

### Installation

```bash
# Get dependencies
flutter pub get

# Generate code (if using freezed/json_serializable)
flutter pub run build_runner build
```

## Running the App

### Development (White Label Base)

```bash
flutter run --dart-define=FLAVOR=white_label_base \
  --dart-define=API_ENDPOINT=http://localhost:3000 \
  --dart-define=WS_ENDPOINT=ws://localhost:3001 \
  --dart-define=TENANT_ID=dev_tenant
```

### Helsinki Taxi (Production)

```bash
flutter run --dart-define=FLAVOR=helsinki_taxi \
  --dart-define=API_ENDPOINT=https://api.helsinkitaxi.fi \
  --dart-define=WS_ENDPOINT=wss://ws.helsinkitaxi.fi \
  --dart-define=TENANT_ID=helsinki_001 \
  --dart-define=APP_NAME="Helsinki Taxi" \
  --dart-define=MAPS_API_KEY=your_google_maps_key
```

### Android Flavors

```bash
# Debug
flutter run --flavor helsinkiTaxi

# Release APK
flutter build apk --flavor helsinkiTaxi --release
```

### iOS Flavors

```bash
# Debug
flutter run --flavor helsinkiTaxi

# Release IPA
flutter build ipa --flavor helsinkiTaxi --release
```

## Multi-Flavor Configuration

### FlavorConfig Class

The `FlavorConfig` class loads compile-time constants via `--dart-define`:

```dart
// Access anywhere in the app
final config = FlavorConfig.instance;

print(config.appName);        // "Helsinki Taxi"
print(config.apiEndpoint);    // "https://api.helsinkitaxi.fi"
print(config.tenantId);       // "helsinki_001"
print(config.theme.primaryColor); // Color(0xFF003580)
```

### Adding a New Flavor

1. **Create asset folder**: `assets/{flavor_name}/images/`
2. **Add Android flavor** in `android/app/build.gradle`
3. **Add iOS configuration** in `ios/{flavor_name}/`
4. **Update FlavorType enum** in `flavor_config.dart`
5. **Add theme configuration** in `FlavorTheme`

## Accessibility (EN 301 549)

The app complies with European Accessibility Act requirements:

- **Touch Targets**: Minimum 44dp touch targets
- **Contrast**: 4.5:1 minimum contrast ratio
- **Screen Readers**: Full VoiceOver/TalkBack support
- **High Contrast Mode**: Toggle in settings
- **Text Scaling**: Supports up to 200% text scale

## Finnish Market Features

### Taximeter Integration (2026 Mandate)

```dart
// Connect to MID-compliant taximeter via Bluetooth
final taximeter = TaximeterService();
await taximeter.connect(meterId: 'MITAX-400-001');
taximeter.onFareUpdate.listen((fare) {
  // Update UI with taximeter data
});
```

### Vero API Integration

Automatic reporting of:
- Driver income
- VAT calculation (13.5% for passenger transport)
- Electronic receipt generation

## Location Service

### Starting Driver Tracking

```dart
final locationService = LocationService();

// Connect to backend
await locationService.connect(
  userId: driverId,
  userType: 'driver',
);

// Start GPS tracking
await locationService.startTracking(driverId: driverId);
```

### Finding Nearby Drivers (Rider App)

```dart
// Request nearby drivers
locationService.requestNearbyDrivers(
  latitude: 60.1699,
  longitude: 24.9384,
  radius: 5000, // 5km
);

// Listen for results
locationService.driverLocations.listen((drivers) {
  // Update map with driver markers
});
```

## Testing

```bash
# Unit tests
flutter test

# Integration tests
flutter test integration_test/

# With coverage
flutter test --coverage
```

## Building for Production

### Android

```bash
# Bundle for Play Store
flutter build appbundle --flavor helsinkiTaxi --release

# APK for direct distribution
flutter build apk --flavor helsinkiTaxi --release --split-per-abi
```

### iOS

```bash
# Build for App Store
flutter build ipa --flavor helsinkiTaxi --release
```

## CI/CD with Fastlane

See `fastlane/README.md` for automated build and deployment configuration.

```bash
# Build all flavors
fastlane android build_all
fastlane ios build_all

# Deploy to stores
fastlane android deploy flavor:helsinkiTaxi
fastlane ios deploy flavor:helsinkiTaxi
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `FLAVOR` | Flavor name (helsinki_taxi, white_label_base) | Yes |
| `API_ENDPOINT` | Backend API URL | Yes |
| `WS_ENDPOINT` | WebSocket URL | Yes |
| `TENANT_ID` | Multi-tenant identifier | Yes |
| `APP_NAME` | Display name | No |
| `MAPS_API_KEY` | Google Maps API key | For maps |
| `STRIPE_PUBLISHABLE_KEY` | Stripe public key | For payments |
| `ENABLE_TAXIMETER` | Enable taximeter integration | No |
| `VERO_API_ENDPOINT` | Finnish tax authority API | For compliance |

## License

Proprietary - All rights reserved

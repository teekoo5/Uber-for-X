/// Vehicle Type Selector Widget
/// 
/// Allows riders to select their preferred vehicle type
/// (Standard, Comfort, XL, Accessible, Electric).

import 'package:flutter/material.dart';

import '../config/app_config.dart';

class VehicleTypeSelector extends StatelessWidget {
  final String selectedType;
  final void Function(String type) onTypeSelected;

  const VehicleTypeSelector({
    super.key,
    required this.selectedType,
    required this.onTypeSelected,
  });

  static const List<VehicleOption> options = [
    VehicleOption(
      type: 'standard',
      name: 'Standard',
      description: '4 seats',
      icon: Icons.directions_car,
      multiplier: 1.0,
    ),
    VehicleOption(
      type: 'comfort',
      name: 'Comfort',
      description: 'Premium cars',
      icon: Icons.airline_seat_legroom_extra,
      multiplier: 1.3,
    ),
    VehicleOption(
      type: 'xl',
      name: 'XL',
      description: '6 seats',
      icon: Icons.airport_shuttle,
      multiplier: 1.5,
    ),
    VehicleOption(
      type: 'accessible',
      name: 'Accessible',
      description: 'Wheelchair',
      icon: Icons.accessible,
      multiplier: 1.0,
    ),
    VehicleOption(
      type: 'electric',
      name: 'Electric',
      description: 'Eco-friendly',
      icon: Icons.electric_car,
      multiplier: 1.1,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SizedBox(
      height: 100,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: options.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final option = options[index];
          final isSelected = selectedType == option.type;

          return Semantics(
            label: '${option.name}, ${option.description}',
            selected: isSelected,
            button: true,
            child: GestureDetector(
              onTap: () => onTypeSelected(option.type),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 90,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isSelected
                      ? theme.colorScheme.primary.withOpacity(0.1)
                      : theme.colorScheme.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected
                        ? theme.colorScheme.primary
                        : Colors.grey[300]!,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      option.icon,
                      size: 28,
                      color: isSelected
                          ? theme.colorScheme.primary
                          : Colors.grey[600],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      option.name,
                      style: theme.textTheme.labelMedium?.copyWith(
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected
                            ? theme.colorScheme.primary
                            : theme.textTheme.labelMedium?.color,
                      ),
                    ),
                    Text(
                      option.description,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: Colors.grey[500],
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class VehicleOption {
  final String type;
  final String name;
  final String description;
  final IconData icon;
  final double multiplier;

  const VehicleOption({
    required this.type,
    required this.name,
    required this.description,
    required this.icon,
    required this.multiplier,
  });
}

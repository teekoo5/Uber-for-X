import { useState } from 'react';
import { Save, Bell, Globe, Shield, Palette, Database } from 'lucide-react';
import clsx from 'clsx';

export default function SettingsView() {
  const [settings, setSettings] = useState({
    // Notifications
    soundAlerts: true,
    desktopNotifications: true,
    emailAlerts: false,
    sosAlerts: true,
    idleDriverAlerts: true,
    
    // Display
    language: 'en',
    timezone: 'Europe/Helsinki',
    mapStyle: 'standard',
    autoRefresh: true,
    refreshInterval: 5,
    
    // Dispatch
    autoDispatch: true,
    maxSearchRadius: 10,
    driverTimeout: 30,
    surgeThreshold: 1.5,
    
    // Finnish compliance
    taximeterRequired: true,
    veroReporting: true,
    receiptGeneration: true,
  });

  const handleChange = (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    // In production, save to API
    console.log('Saving settings:', settings);
    alert('Settings saved!');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      {/* Notifications */}
      <SettingsSection title="Notifications" icon={Bell}>
        <ToggleSetting
          label="Sound Alerts"
          description="Play sounds for new rides and alerts"
          checked={settings.soundAlerts}
          onChange={(v) => handleChange('soundAlerts', v)}
        />
        <ToggleSetting
          label="Desktop Notifications"
          description="Show browser notifications"
          checked={settings.desktopNotifications}
          onChange={(v) => handleChange('desktopNotifications', v)}
        />
        <ToggleSetting
          label="Email Alerts"
          description="Send email for critical alerts"
          checked={settings.emailAlerts}
          onChange={(v) => handleChange('emailAlerts', v)}
        />
        <ToggleSetting
          label="SOS Alerts"
          description="Immediate alerts for emergency situations"
          checked={settings.sosAlerts}
          onChange={(v) => handleChange('sosAlerts', v)}
        />
        <ToggleSetting
          label="Idle Driver Alerts"
          description="Alert when drivers are idle too long"
          checked={settings.idleDriverAlerts}
          onChange={(v) => handleChange('idleDriverAlerts', v)}
        />
      </SettingsSection>

      {/* Display */}
      <SettingsSection title="Display" icon={Palette}>
        <SelectSetting
          label="Language"
          value={settings.language}
          options={[
            { value: 'en', label: 'English' },
            { value: 'fi', label: 'Suomi' },
            { value: 'sv', label: 'Svenska' },
          ]}
          onChange={(v) => handleChange('language', v)}
        />
        <SelectSetting
          label="Timezone"
          value={settings.timezone}
          options={[
            { value: 'Europe/Helsinki', label: 'Helsinki (UTC+2/+3)' },
            { value: 'UTC', label: 'UTC' },
          ]}
          onChange={(v) => handleChange('timezone', v)}
        />
        <SelectSetting
          label="Map Style"
          value={settings.mapStyle}
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'satellite', label: 'Satellite' },
            { value: 'terrain', label: 'Terrain' },
          ]}
          onChange={(v) => handleChange('mapStyle', v)}
        />
        <ToggleSetting
          label="Auto Refresh"
          description="Automatically refresh data"
          checked={settings.autoRefresh}
          onChange={(v) => handleChange('autoRefresh', v)}
        />
        <RangeSetting
          label="Refresh Interval"
          value={settings.refreshInterval}
          min={1}
          max={30}
          unit="seconds"
          onChange={(v) => handleChange('refreshInterval', v)}
          disabled={!settings.autoRefresh}
        />
      </SettingsSection>

      {/* Dispatch */}
      <SettingsSection title="Dispatch Settings" icon={Globe}>
        <ToggleSetting
          label="Auto Dispatch"
          description="Automatically assign drivers to rides"
          checked={settings.autoDispatch}
          onChange={(v) => handleChange('autoDispatch', v)}
        />
        <RangeSetting
          label="Max Search Radius"
          value={settings.maxSearchRadius}
          min={1}
          max={20}
          unit="km"
          onChange={(v) => handleChange('maxSearchRadius', v)}
        />
        <RangeSetting
          label="Driver Timeout"
          value={settings.driverTimeout}
          min={15}
          max={60}
          unit="seconds"
          onChange={(v) => handleChange('driverTimeout', v)}
        />
        <RangeSetting
          label="Surge Threshold"
          value={settings.surgeThreshold}
          min={1.0}
          max={3.0}
          step={0.1}
          unit="x"
          onChange={(v) => handleChange('surgeThreshold', v)}
        />
      </SettingsSection>

      {/* Finnish Compliance */}
      <SettingsSection title="Finnish Compliance" icon={Shield}>
        <ToggleSetting
          label="Taximeter Required"
          description="Require MID-compliant taximeter data for all rides"
          checked={settings.taximeterRequired}
          onChange={(v) => handleChange('taximeterRequired', v)}
        />
        <ToggleSetting
          label="Vero Reporting"
          description="Automatic income reporting to Finnish Tax Administration"
          checked={settings.veroReporting}
          onChange={(v) => handleChange('veroReporting', v)}
        />
        <ToggleSetting
          label="Receipt Generation"
          description="Generate compliant digital receipts for all rides"
          checked={settings.receiptGeneration}
          onChange={(v) => handleChange('receiptGeneration', v)}
        />
      </SettingsSection>

      {/* Database */}
      <SettingsSection title="Data Management" icon={Database}>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900">Export Data</p>
              <p className="text-sm text-gray-500">
                Download all ride and driver data
              </p>
            </div>
            <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              Export CSV
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900">Clear Cache</p>
              <p className="text-sm text-gray-500">
                Clear local data and refresh
              </p>
            </div>
            <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              Clear
            </button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Bell;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <Icon className="w-5 h-5 text-gray-500" />
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="px-6 py-4 space-y-4">{children}</div>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative w-12 h-6 rounded-full transition-colors',
          checked ? 'bg-primary-500' : 'bg-gray-300'
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
            checked ? 'left-6' : 'left-0.5'
          )}
        />
      </button>
    </div>
  );
}

function SelectSetting({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <p className="font-medium text-gray-900">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function RangeSetting({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  disabled = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={clsx('py-2', disabled && 'opacity-50')}>
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium text-gray-900">{label}</p>
        <span className="text-sm font-medium text-primary-600">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );
}

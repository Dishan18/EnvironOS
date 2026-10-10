import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

// Mock Leaflet and React-Leaflet for jsdom environment using React.createElement
vi.mock('react-leaflet', () => {
  return {
    MapContainer: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'map-container' }, children),
    TileLayer: () =>
      React.createElement('div', { 'data-testid': 'tile-layer' }),
    Marker: ({ children, position }: any) =>
      React.createElement(
        'div',
        { 'data-testid': 'map-marker', 'data-position': JSON.stringify(position) },
        children
      ),
    Popup: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'map-popup' }, children),
    useMap: () => ({
      flyTo: vi.fn(),
      fitBounds: vi.fn(),
    }),
    useMapEvents: () => null,
  };
});

// Mock L.divIcon and L.latLngBounds
vi.mock('leaflet', () => {
  return {
    default: {
      divIcon: vi.fn(() => ({})),
      latLngBounds: vi.fn(() => ({})),
    },
    divIcon: vi.fn(() => ({})),
    latLngBounds: vi.fn(() => ({})),
  };
});

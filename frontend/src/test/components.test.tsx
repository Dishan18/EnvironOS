import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportList } from '../components/ReportList';
import { ReportDetail } from '../components/ReportDetail';
import { ReportMap } from '../components/ReportMap';
import { SubmitReportModal } from '../components/SubmitReportModal';
import { ReportItem } from '../types';

const MOCK_REPORTS: ReportItem[] = [
  {
    report_id: 'rpt_alpha',
    status: 'open',
    severity: 'critical',
    site_type: 'road',
    latitude: 12.9716,
    longitude: 77.5946,
    risk_score: 85,
    priority: 'critical',
    description: 'Blocked drain on MG Road near junction',
    created_at: '2026-10-10T12:00:00Z',
    updated_at: '2026-10-10T12:00:00Z',
    is_demo: false,
    rainfall_mm_forecast: 15,
    rainfall_source: 'open_meteo',
    risk_explanation: 'Score 85/100 (Critical): 45 pts severity, 20 pts site, 20 pts rainfall',
  },
  {
    report_id: 'rpt_beta',
    status: 'resolved',
    severity: 'low',
    site_type: 'park',
    latitude: 12.9352,
    longitude: 77.6245,
    risk_score: 22,
    priority: 'low',
    description: 'Minor leaf debris cleared in park',
    created_at: '2026-10-10T10:00:00Z',
    updated_at: '2026-10-10T14:00:00Z',
    is_demo: true,
  },
];

describe('Frontend UI Components', () => {
  it('ReportList renders incidents, score badges, and search filters', () => {
    const onSelect = vi.fn();
    render(
      <ReportList
        reports={MOCK_REPORTS}
        selectedReport={null}
        onSelectReport={onSelect}
        isLoading={false}
      />
    );

    expect(screen.getByText(/Blocked drain on MG Road/i)).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText(/CRITICAL PRIORITY/i)).toBeInTheDocument();

    // Search filter test
    const searchInput = screen.getByPlaceholderText(/Search report ID/i);
    fireEvent.change(searchInput, { target: { value: 'MG Road' } });
    expect(screen.getByText(/Blocked drain on MG Road/i)).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Nonexistent' } });
    expect(screen.getByText(/No reports matching filter criteria/i)).toBeInTheDocument();
  });

  it('ReportList shows loading state spinner', () => {
    render(
      <ReportList
        reports={[]}
        selectedReport={null}
        onSelectReport={vi.fn()}
        isLoading={true}
      />
    );

    expect(screen.getByText(/Loading reports from DynamoDB/i)).toBeInTheDocument();
  });

  it('ReportDetail renders risk breakdown and explanation', () => {
    const onUpdate = vi.fn();
    const onClose = vi.fn();

    render(
      <ReportDetail
        report={MOCK_REPORTS[0]}
        onClose={onClose}
        onReportUpdated={onUpdate}
      />
    );

    expect(screen.getByText('rpt_alpha')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText(/Score 85\/100/i)).toBeInTheDocument();
    expect(screen.getByText(/Blockage Severity \(45%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/24h Rainfall Forecast \(35%\)/i)).toBeInTheDocument();
  });

  it('ReportMap renders markers for valid coordinates', () => {
    render(
      <ReportMap
        reports={MOCK_REPORTS}
        selectedReport={null}
        onSelectReport={vi.fn()}
      />
    );

    const markers = screen.getAllByTestId('map-marker');
    expect(markers).toHaveLength(2);
  });

  it('SubmitReportModal validates latitude and longitude coordinates', async () => {
    const onCreated = vi.fn();
    const onClose = vi.fn();

    render(
      <SubmitReportModal
        isOpen={true}
        onClose={onClose}
        onReportCreated={onCreated}
        onStartMapPick={vi.fn()}
      />
    );

    expect(screen.getByText(/Report Blocked Storm Drain/i)).toBeInTheDocument();

    // Try setting invalid latitude > 90
    const latInput = screen.getByDisplayValue('12.9716');
    fireEvent.change(latInput, { target: { value: '999' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Report for Risk Triage/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid latitude/i)).toBeInTheDocument();
    });
  });

  it('SubmitReportModal triggers onStartMapPick without calling onClose when clicking Select Point on Map', () => {
    const onStartMapPick = vi.fn();
    const onClose = vi.fn();

    render(
      <SubmitReportModal
        isOpen={true}
        onClose={onClose}
        onReportCreated={vi.fn()}
        onStartMapPick={onStartMapPick}
      />
    );

    const pickBtn = screen.getByRole('button', { name: /Select Point on Map/i });
    fireEvent.click(pickBtn);

    expect(onStartMapPick).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('SubmitReportModal updates coordinates and displays badge when pickedCoords prop is updated', () => {
    const { rerender } = render(
      <SubmitReportModal
        isOpen={true}
        onClose={vi.fn()}
        onReportCreated={vi.fn()}
        pickedCoords={null}
        onStartMapPick={vi.fn()}
      />
    );

    // Initial default coords
    expect(screen.getByDisplayValue('12.9716')).toBeInTheDocument();

    // Rerender with new picked coordinates from map
    rerender(
      <SubmitReportModal
        isOpen={true}
        onClose={vi.fn()}
        onReportCreated={vi.fn()}
        pickedCoords={{ lat: 13.0827, lng: 80.2707 }}
        onStartMapPick={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('13.0827')).toBeInTheDocument();
    expect(screen.getByDisplayValue('80.2707')).toBeInTheDocument();
    expect(screen.getByText(/Pin selected on map/i)).toBeInTheDocument();
  });
});


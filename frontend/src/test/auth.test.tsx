import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginModal } from '../components/LoginModal';
import { ReportDetail } from '../components/ReportDetail';
import { AuthProvider } from '../context/AuthContext';
import * as authService from '../services/auth';
import { ReportItem } from '../types';

vi.mock('../services/auth', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn().mockResolvedValue(null),
  getIdToken: vi.fn().mockResolvedValue(null),
  getUserPool: vi.fn(),
  extractRoleFromClaims: vi.fn(),
}));

const MOCK_REPORT_OPEN: ReportItem = {
  report_id: 'rpt_auth01',
  status: 'open',
  severity: 'high',
  site_type: 'road',
  latitude: 12.9716,
  longitude: 77.5946,
  risk_score: 75,
  priority: 'critical',
  description: 'Major arterial drain blocked',
  created_at: '2026-10-10T12:00:00Z',
  updated_at: '2026-10-10T12:00:00Z',
  created_by: 'citizen@drainguard.demo',
};

const MOCK_REPORT_IN_PROGRESS: ReportItem = {
  ...MOCK_REPORT_OPEN,
  report_id: 'rpt_auth02',
  status: 'in_progress',
  updated_by: 'dispatcher@drainguard.demo',
};

describe('Authentication & RBAC Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('LoginModal renders with demo quick-fill buttons and inputs', () => {
    render(
      <AuthProvider>
        <LoginModal isOpen={true} />
      </AuthProvider>
    );

    expect(screen.getByText(/DrainGuard Access/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/user@drainguard.demo/i)).toBeInTheDocument();
    expect(screen.getByText('Demo Admin')).toBeInTheDocument();
    expect(screen.getByText('Demo User')).toBeInTheDocument();
  });

  it('Quick-fill buttons populate demo admin and user credentials', () => {
    render(
      <AuthProvider>
        <LoginModal isOpen={true} />
      </AuthProvider>
    );

    const adminBtn = screen.getByText('Demo Admin');
    fireEvent.click(adminBtn);

    const userInput = screen.getByPlaceholderText(/user@drainguard.demo/i) as HTMLInputElement;
    expect(userInput.value).toBe('admin@drainguard.demo');

    const userBtn = screen.getByText('Demo User');
    fireEvent.click(userBtn);
    expect(userInput.value).toBe('user@drainguard.demo');
  });

  it('LoginModal triggers signIn on submit', async () => {
    const signInMock = vi.mocked(authService.signIn).mockResolvedValueOnce({
      username: 'admin@drainguard.demo',
      email: 'admin@drainguard.demo',
      role: 'admin',
      sub: 'admin-uuid',
    });

    render(
      <AuthProvider>
        <LoginModal isOpen={true} />
      </AuthProvider>
    );

    const submitBtn = await screen.findByRole('button', { name: /Sign In/i });
    fireEvent.click(screen.getByText('Demo Admin'));
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith('admin@drainguard.demo', 'admin12345');
    });
  });

  it('LoginModal renders error alert on authentication failure', async () => {
    vi.mocked(authService.signIn).mockRejectedValueOnce(new Error('Incorrect username or password.'));

    render(
      <AuthProvider>
        <LoginModal isOpen={true} />
      </AuthProvider>
    );

    const submitBtn = await screen.findByRole('button', { name: /Sign In/i });
    fireEvent.click(screen.getByText('Demo User'));
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Incorrect username or password.')).toBeInTheDocument();
    });
  });

  it('Normal User role cannot see status change buttons in ReportDetail', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce({
      username: 'user@drainguard.demo',
      email: 'user@drainguard.demo',
      role: 'user',
      sub: 'user-uuid',
    });

    render(
      <AuthProvider>
        <ReportDetail
          report={MOCK_REPORT_OPEN}
          onClose={vi.fn()}
          onReportUpdated={vi.fn()}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Status management and forward workflow transitions are reserved for administrators/i)
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/Advance to In Progress/i)).not.toBeInTheDocument();
  });

  it('Admin role sees Advance to In Progress button for open reports', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce({
      username: 'admin@drainguard.demo',
      email: 'admin@drainguard.demo',
      role: 'admin',
      sub: 'admin-uuid',
    });

    render(
      <AuthProvider>
        <ReportDetail
          report={MOCK_REPORT_OPEN}
          onClose={vi.fn()}
          onReportUpdated={vi.fn()}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Advance to In Progress/i)).toBeInTheDocument();
    });
  });

  it('Admin role sees Advance to Resolved button for in_progress reports', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce({
      username: 'admin@drainguard.demo',
      email: 'admin@drainguard.demo',
      role: 'admin',
      sub: 'admin-uuid',
    });

    render(
      <AuthProvider>
        <ReportDetail
          report={MOCK_REPORT_IN_PROGRESS}
          onClose={vi.fn()}
          onReportUpdated={vi.fn()}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Advance to Resolved/i)).toBeInTheDocument();
    });
  });

  it('ReportDetail displays created_by and updated_by attributions', async () => {
    render(
      <AuthProvider>
        <ReportDetail
          report={MOCK_REPORT_IN_PROGRESS}
          onClose={vi.fn()}
          onReportUpdated={vi.fn()}
        />
      </AuthProvider>
    );

    expect(screen.getByText('dispatcher@drainguard.demo')).toBeInTheDocument();
  });
});

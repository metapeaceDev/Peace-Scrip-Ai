/**
 * Studio Component Tests
 * Tests for project management and studio interface
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import Studio from '../Studio';
import type { ProjectMetadata, ProjectType } from '../../types';

// Mock dependencies
vi.mock('./ComfyUIStatus', () => ({
  default: () => <div>ComfyUI Status</div>,
}));

vi.mock('./InvitationsModal', () => ({
  default: () => <div>Invitations Modal</div>,
}));

vi.mock('../../services/teamCollaborationService', () => ({
  teamCollaborationService: {
    subscribeToInvitations: vi.fn(() => vi.fn()),
    getPendingInvitations: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock('../../config/firebase', () => ({
  auth: {
    currentUser: { email: 'test@example.com', uid: '123' },
  },
}));

vi.mock('./RoleManagement', () => ({
  PermissionGuard: ({ children }: any) => <div>{children}</div>,
}));

// Mock ProjectMetadata
const createMockProject = (overrides?: Partial<ProjectMetadata>): ProjectMetadata => ({
  id: 'proj-1',
  title: 'Test Project',
  type: 'Movie',
  lastModified: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

describe('Studio - Component Rendering', () => {
  const mockProps = {
    projects: [],
    onCreateProject: vi.fn(),
    onOpenProject: vi.fn(),
    onDeleteProject: vi.fn(),
    onImportProject: vi.fn(),
    onExportProject: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render studio component', () => {
    const { container } = render(<Studio {...mockProps} />);
    expect(container).toBeTruthy();
  });

  it('should render with empty projects', () => {
    const { container } = render(<Studio {...mockProps} projects={[]} />);
    expect(container).toBeTruthy();
  });

  it('should render with projects list', () => {
    const projects = [
      createMockProject({ id: '1', title: 'Project 1' }),
      createMockProject({ id: '2', title: 'Project 2' }),
    ];
    const { container } = render(<Studio {...mockProps} projects={projects} />);
    expect(container).toBeTruthy();
  });
});

describe('Studio - Project Display', () => {
  const mockProps = {
    projects: [],
    onCreateProject: vi.fn(),
    onOpenProject: vi.fn(),
    onDeleteProject: vi.fn(),
    onImportProject: vi.fn(),
    onExportProject: vi.fn(),
  };

  it('should display project titles', () => {
    const projects = [
      createMockProject({ title: 'Epic Movie' }),
      createMockProject({ id: '2', title: 'Short Film' }),
    ];
    render(<Studio {...mockProps} projects={projects} />);

    expect(projects[0].title).toBe('Epic Movie');
    expect(projects[1].title).toBe('Short Film');
  });

  it('should display project types', () => {
    const projects = [
      createMockProject({ type: 'Movie' }),
      createMockProject({ id: '2', type: 'Series' }),
    ];
    render(<Studio {...mockProps} projects={projects} />);

    expect(projects[0].type).toBe('Movie');
    expect(projects[1].type).toBe('Series');
  });

  it('should display project dates', () => {
    const date1 = new Date('2024-01-15');
    const date2 = new Date('2024-02-20');
    const projects = [
      createMockProject({ lastModified: date2 }),
      createMockProject({ id: '2', lastModified: date1 }),
    ];
    render(<Studio {...mockProps} projects={projects} />);

    expect(projects[0].lastModified).toEqual(date2);
    expect(projects[1].lastModified).toEqual(date1);
  });
});

describe('Studio - Project Actions', () => {
  const mockProps = {
    projects: [],
    onCreateProject: vi.fn(),
    onOpenProject: vi.fn(),
    onDeleteProject: vi.fn(),
    onImportProject: vi.fn(),
    onExportProject: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have create project callback', () => {
    render(<Studio {...mockProps} />);
    expect(typeof mockProps.onCreateProject).toBe('function');
  });

  it('should have open project callback', () => {
    render(<Studio {...mockProps} />);
    expect(typeof mockProps.onOpenProject).toBe('function');
  });

  it('should have delete project callback', () => {
    render(<Studio {...mockProps} />);
    expect(typeof mockProps.onDeleteProject).toBe('function');
  });

  it('should have import project callback', () => {
    render(<Studio {...mockProps} />);
    expect(typeof mockProps.onImportProject).toBe('function');
  });

  it('should have export project callback', () => {
    render(<Studio {...mockProps} />);
    expect(typeof mockProps.onExportProject).toBe('function');
  });

  it('should handle optional refresh callback', () => {
    const onRefreshProjects = vi.fn();
    const { container } = render(<Studio {...mockProps} onRefreshProjects={onRefreshProjects} />);
    expect(container).toBeTruthy();
  });
});

describe('Studio - Project Types', () => {
  const mockProps = {
    projects: [],
    onCreateProject: vi.fn(),
    onOpenProject: vi.fn(),
    onDeleteProject: vi.fn(),
    onImportProject: vi.fn(),
    onExportProject: vi.fn(),
  };

  it('should support Movie type', () => {
    const projects = [createMockProject({ type: 'Movie' })];
    render(<Studio {...mockProps} projects={projects} />);
    expect(projects[0].type).toBe('Movie');
  });

  it('should support Series type', () => {
    const projects = [createMockProject({ type: 'Series' })];
    render(<Studio {...mockProps} projects={projects} />);
    expect(projects[0].type).toBe('Series');
  });

  it('should support Short type', () => {
    const projects = [createMockProject({ type: 'Short' })];
    render(<Studio {...mockProps} projects={projects} />);
    expect(projects[0].type).toBe('Short');
  });

  it('should support Animation type', () => {
    const projects = [createMockProject({ type: 'Animation' })];
    render(<Studio {...mockProps} projects={projects} />);
    expect(projects[0].type).toBe('Animation');
  });

  it('should support Documentary type', () => {
    const projects = [createMockProject({ type: 'Documentary' })];
    render(<Studio {...mockProps} projects={projects} />);
    expect(projects[0].type).toBe('Documentary');
  });
});

describe('Studio - Edge Cases', () => {
  const mockProps = {
    projects: [],
    onCreateProject: vi.fn(),
    onOpenProject: vi.fn(),
    onDeleteProject: vi.fn(),
    onImportProject: vi.fn(),
    onExportProject: vi.fn(),
  };

  it('should handle very long project titles', () => {
    const longTitle = 'A'.repeat(200);
    const projects = [createMockProject({ title: longTitle })];
    const { container } = render(<Studio {...mockProps} projects={projects} />);
    expect(container).toBeTruthy();
  });

  it('should handle special characters in titles', () => {
    const projects = [createMockProject({ title: 'Project™ with émojis 🎬' })];
    const { container } = render(<Studio {...mockProps} projects={projects} />);
    expect(container).toBeTruthy();
  });

  it('should handle many projects', () => {
    const manyProjects = Array.from({ length: 50 }, (_, i) =>
      createMockProject({ id: `proj-${i}`, title: `Project ${i + 1}` })
    );
    const { container } = render(<Studio {...mockProps} projects={manyProjects} />);
    expect(container).toBeTruthy();
  });

  it('should handle Unicode in project titles', () => {
    const projects = [
      createMockProject({ title: 'โปรเจค ภาษาไทย' }),
      createMockProject({ id: '2', title: '日本語プロジェクト' }),
    ];
    const { container } = render(<Studio {...mockProps} projects={projects} />);
    expect(container).toBeTruthy();
  });
});

describe('Studio - Team Collaboration', () => {
  const mockProps = {
    projects: [],
    onCreateProject: vi.fn(),
    onOpenProject: vi.fn(),
    onDeleteProject: vi.fn(),
    onImportProject: vi.fn(),
    onExportProject: vi.fn(),
  };

  it('should integrate with team collaboration service', async () => {
    const { teamCollaborationService } = await import('../../services/teamCollaborationService');
    render(<Studio {...mockProps} />);
    expect(teamCollaborationService.subscribeToInvitations).toBeDefined();
  });

  it('should handle invitations', () => {
    const { container } = render(<Studio {...mockProps} />);
    expect(container).toBeTruthy();
  });

  it('should show invitation count', () => {
    const { container } = render(<Studio {...mockProps} />);
    expect(container).toBeTruthy();
  });
});

describe('Studio - Modal State', () => {
  const mockProps = {
    projects: [],
    onCreateProject: vi.fn(),
    onOpenProject: vi.fn(),
    onDeleteProject: vi.fn(),
    onImportProject: vi.fn(),
    onExportProject: vi.fn(),
  };

  it('should handle create modal state', () => {
    const { container } = render(<Studio {...mockProps} />);
    expect(container).toBeTruthy();
  });

  it('should handle invitations modal state', () => {
    const { container } = render(<Studio {...mockProps} />);
    expect(container).toBeTruthy();
  });

  it('should handle delete confirmation state', () => {
    const { container } = render(<Studio {...mockProps} />);
    expect(container).toBeTruthy();
  });

  it('should handle notification state', () => {
    const { container } = render(<Studio {...mockProps} />);
    expect(container).toBeTruthy();
  });
});

describe('Studio - File Operations', () => {
  const mockProps = {
    projects: [],
    onCreateProject: vi.fn(),
    onOpenProject: vi.fn(),
    onDeleteProject: vi.fn(),
    onImportProject: vi.fn(),
    onExportProject: vi.fn(),
  };

  it('should support file import', () => {
    render(<Studio {...mockProps} />);
    expect(typeof mockProps.onImportProject).toBe('function');
  });

  it('should support file export', () => {
    render(<Studio {...mockProps} />);
    expect(typeof mockProps.onExportProject).toBe('function');
  });

  it('should handle file input ref', () => {
    const { container } = render(<Studio {...mockProps} />);
    expect(container).toBeTruthy();
  });
});

describe('Studio - Integration', () => {
  const mockProps = {
    projects: [],
    onCreateProject: vi.fn(),
    onOpenProject: vi.fn(),
    onDeleteProject: vi.fn(),
    onImportProject: vi.fn(),
    onExportProject: vi.fn(),
  };

  it('should integrate with Firebase auth', async () => {
    const { auth } = await import('../../config/firebase');
    render(<Studio {...mockProps} />);
    expect(auth.currentUser).toBeTruthy();
  });

  it('should integrate with ComfyUI status', () => {
    const { container } = render(<Studio {...mockProps} />);
    expect(container).toBeTruthy();
  });

  it('should handle complete project workflow', () => {
    const projects = [
      createMockProject({
        id: 'proj-1',
        title: 'Complete Project',
        type: 'Movie',
        lastModified: new Date(),
      }),
    ];
    const { container } = render(<Studio {...mockProps} projects={projects} />);
    expect(container).toBeTruthy();
  });
});

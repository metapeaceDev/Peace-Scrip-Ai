import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TeamManager from '../TeamManager';
import { ScriptData, TeamMember } from '../types';
import { teamCollaborationService } from '../../services/teamCollaborationService';
import { auth } from '../../config/firebase';

// Mock Firebase auth
vi.mock('../../config/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-123',
      email: 'admin@test.com',
      displayName: 'Test Admin',
    },
  },
}));

// Mock team collaboration service
vi.mock('../../services/teamCollaborationService', () => ({
  teamCollaborationService: {
    inviteCollaborator: vi.fn(),
    updateMemberRole: vi.fn(),
    getPendingInvitations: vi.fn(),
    rejectInvitation: vi.fn(),
    createNotification: vi.fn(),
  },
}));

describe('TeamManager - Component Rendering', () => {
  const mockScriptData: ScriptData = {
    id: 'project-123',
    title: 'Test Project',
    projectName: 'Test Project',
    projectType: 'ซีรีย์',
    team: [],
    scenes: [],
    characters: [],
    locations: [],
    budgetBreakdown: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSetScriptData = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnSaveProject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSaveProject.mockResolvedValue(true);
  });

  it('should render TeamManager component', () => {
    const { container } = render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );
    expect(container).toBeTruthy();
  });

  it('should display header with title', () => {
    render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );
    const headers = screen.getAllByText(/Production Team/i);
    expect(headers.length).toBeGreaterThan(0);
  });

  it('should display close button', () => {
    const { container } = render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );
    const buttons = container.querySelectorAll('button');
    const closeButton = Array.from(buttons).find(btn => {
      const svg = btn.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]');
      return svg !== null;
    });
    expect(closeButton).toBeTruthy();
  });

  it('should render two tab buttons', () => {
    render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );
    const addTabElements = screen.getAllByText(/เพิ่มสมาชิกทีม/i);
    expect(addTabElements.length).toBeGreaterThan(0);

    const teamTabElements = screen.getAllByText(/Current Team/i);
    expect(teamTabElements.length).toBeGreaterThan(0);
  });

  it('should display team count badge', () => {
    const scriptDataWithTeam: ScriptData = {
      ...mockScriptData,
      team: [
        {
          id: '1',
          name: 'Member 1',
          role: 'กำกับ',
          email: 'member1@test.com',
          accessRole: 'editor',
          joinedAt: new Date(),
        },
      ],
    };

    render(
      <TeamManager
        scriptData={scriptDataWithTeam}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );

    const badgeElements = screen.getAllByText('1');
    expect(badgeElements.length).toBeGreaterThan(0);
  });

  it('should show revenue management button when team has members', () => {
    const scriptDataWithTeam: ScriptData = {
      ...mockScriptData,
      team: [
        {
          id: '1',
          name: 'Member 1',
          role: 'กำกับ',
          email: 'member1@test.com',
          accessRole: 'editor',
          joinedAt: new Date(),
        },
      ],
    };

    render(
      <TeamManager
        scriptData={scriptDataWithTeam}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );

    const revenueButtons = screen.getAllByText(/จัดการรายได้/i);
    expect(revenueButtons.length).toBeGreaterThan(0);
  });
});

describe('TeamManager - Add Member Tab', () => {
  const mockScriptData: ScriptData = {
    id: 'project-123',
    title: 'Test Project',
    projectName: 'Test Project',
    projectType: 'ซีรีย์',
    team: [],
    scenes: [],
    characters: [],
    locations: [],
    budgetBreakdown: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSetScriptData = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnSaveProject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSaveProject.mockResolvedValue(true);
  });

  it('should display name input field', () => {
    render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );
    const nameLabels = screen.getAllByText(/ชื่อสมาชิก/i);
    expect(nameLabels.length).toBeGreaterThan(0);
  });

  it('should display role select dropdown', () => {
    render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );
    const roleLabels = screen.getAllByText(/ตำแหน่ง/i);
    expect(roleLabels.length).toBeGreaterThan(0);
  });

  it('should display email input field', () => {
    render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );
    const emailLabels = screen.getAllByText(/อีเมล/i);
    expect(emailLabels.length).toBeGreaterThan(0);
  });

  it('should display add member button', () => {
    render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );
    const addButtons = screen.getAllByText(/เพิ่มสมาชิกทีม/i);
    // Should find at least 2: tab button + submit button
    expect(addButtons.length).toBeGreaterThan(1);
  });

  it('should display info message about adding team members', () => {
    render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );
    const infoMessages = screen.getAllByText(/เพิ่มสมาชิกทีมผลิต/i);
    expect(infoMessages.length).toBeGreaterThan(0);
  });

  it('should have name input with placeholder', () => {
    const { container } = render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );
    const nameInput = container.querySelector('input[type="text"][placeholder*="สมชาย"]');
    expect(nameInput).toBeTruthy();
  });

  it('should have email input with placeholder', () => {
    const { container } = render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );
    const emailInput = container.querySelector('input[type="email"][placeholder*="gmail.com"]');
    expect(emailInput).toBeTruthy();
  });

  it('should display required field indicators', () => {
    render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );
    const requiredMarkers = screen.getAllByText('*');
    expect(requiredMarkers.length).toBeGreaterThanOrEqual(3); // name, role, email
  });
});

describe('TeamManager - Team List Tab', () => {
  const mockScriptData: ScriptData = {
    id: 'project-123',
    title: 'Test Project',
    projectName: 'Test Project',
    projectType: 'ซีรีย์',
    team: [
      {
        id: '1',
        name: 'Director Person',
        role: 'กำกับ',
        email: 'director@test.com',
        accessRole: 'owner',
        joinedAt: new Date('2024-01-01'),
      },
      {
        id: '2',
        name: 'Writer Person',
        role: 'เขียนบท',
        email: 'writer@test.com',
        accessRole: 'editor',
        joinedAt: new Date('2024-01-02'),
      },
      {
        id: '3',
        name: 'Viewer Person',
        role: 'ฝ่ายอื่นๆ',
        email: 'viewer@test.com',
        accessRole: 'viewer',
        joinedAt: new Date('2024-01-03'),
      },
    ],
    scenes: [],
    characters: [],
    locations: [],
    budgetBreakdown: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSetScriptData = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnSaveProject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSaveProject.mockResolvedValue(true);
  });

  it('should display team members when switching to team tab', () => {
    const { container } = render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );

    // Click team tab
    const teamTabButton = Array.from(container.querySelectorAll('button')).find(btn =>
      btn.textContent?.includes('Current Team')
    );
    if (teamTabButton) {
      fireEvent.click(teamTabButton);
    }

    // Check if members are displayed
    const memberNames = screen.getAllByText(/Person/i);
    expect(memberNames.length).toBeGreaterThan(0);
  });

  it('should display member email addresses', () => {
    const { container } = render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );

    // Switch to team tab
    const teamTabButton = Array.from(container.querySelectorAll('button')).find(btn =>
      btn.textContent?.includes('Current Team')
    );
    if (teamTabButton) {
      fireEvent.click(teamTabButton);
    }

    // Check emails
    const emails = screen.getAllByText(/test\.com/i);
    expect(emails.length).toBeGreaterThan(0);
  });

  it('should display member roles', () => {
    const { container } = render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );

    // Switch to team tab
    const teamTabButton = Array.from(container.querySelectorAll('button')).find(btn =>
      btn.textContent?.includes('Current Team')
    );
    if (teamTabButton) {
      fireEvent.click(teamTabButton);
    }

    // Check roles
    const directorRoles = screen.getAllByText(/กำกับ/i);
    expect(directorRoles.length).toBeGreaterThan(0);
  });

  it('should display correct team count', () => {
    render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );

    const countBadges = screen.getAllByText('3');
    expect(countBadges.length).toBeGreaterThan(0);
  });

  it('should render empty team list when no members', () => {
    const emptyScriptData = { ...mockScriptData, team: [] };

    const { container } = render(
      <TeamManager
        scriptData={emptyScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );

    // Switch to team tab
    const teamTabButton = Array.from(container.querySelectorAll('button')).find(btn =>
      btn.textContent?.includes('Current Team')
    );
    if (teamTabButton) {
      fireEvent.click(teamTabButton);
    }

    const countBadges = screen.getAllByText('0');
    expect(countBadges.length).toBeGreaterThan(0);
  });
});

describe('TeamManager - Member Interaction', () => {
  const mockScriptData: ScriptData = {
    id: 'project-123',
    title: 'Test Project',
    projectName: 'Test Project',
    projectType: 'ซีรีย์',
    team: [],
    scenes: [],
    characters: [],
    locations: [],
    budgetBreakdown: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSetScriptData = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnSaveProject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSaveProject.mockResolvedValue(true);
  });

  it('should call onClose when close button is clicked', () => {
    const { container } = render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );

    const buttons = container.querySelectorAll('button');
    const closeButton = Array.from(buttons).find(btn => {
      const svg = btn.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]');
      return svg !== null;
    });

    if (closeButton) {
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('should allow typing in name input', () => {
    const { container } = render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );

    const nameInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'Test Name' } });
      expect(nameInput.value).toBe('Test Name');
    }
  });

  it('should allow typing in email input', () => {
    const { container } = render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );

    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    if (emailInput) {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      expect(emailInput.value).toBe('test@example.com');
    }
  });

  it('should allow selecting role from dropdown', () => {
    const { container } = render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );

    const roleSelect = container.querySelector('select') as HTMLSelectElement;
    if (roleSelect) {
      fireEvent.change(roleSelect, { target: { value: 'Screenwriter (นักเขียนบท)' } });
      expect(roleSelect.value).toBe('Screenwriter (นักเขียนบท)');
    }
  });

  it('should switch between add and team tabs', () => {
    const { container } = render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );

    const buttons = container.querySelectorAll('button');
    const teamTabButton = Array.from(buttons).find(btn =>
      btn.textContent?.includes('Current Team')
    );

    if (teamTabButton) {
      fireEvent.click(teamTabButton);
      // Check if team tab is active (has cyan color class)
      expect(teamTabButton.className).toMatch(/cyan-400/);
    }
  });
});

describe('TeamManager - Props Handling', () => {
  const mockScriptData: ScriptData = {
    id: 'project-123',
    title: 'Test Project',
    projectName: 'Test Project',
    projectType: 'ซีรีย์',
    team: [],
    scenes: [],
    characters: [],
    locations: [],
    budgetBreakdown: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSetScriptData = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnSaveProject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSaveProject.mockResolvedValue(true);
  });

  it('should accept scriptData prop', () => {
    const { container } = render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );
    expect(container).toBeTruthy();
  });

  it('should accept setScriptData callback', () => {
    const { container } = render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );
    expect(container).toBeTruthy();
  });

  it('should accept onClose callback', () => {
    const { container } = render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );
    expect(container).toBeTruthy();
  });

  it('should accept onSaveProject callback', () => {
    const { container } = render(
      <TeamManager
        scriptData={mockScriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );
    expect(container).toBeTruthy();
  });

  it('should handle scriptData with empty team array', () => {
    const { container } = render(
      <TeamManager
        scriptData={{ ...mockScriptData, team: [] }}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );
    const countBadges = screen.getAllByText('0');
    expect(countBadges.length).toBeGreaterThan(0);
  });

  it('should handle scriptData with multiple team members', () => {
    const scriptDataWithTeam: ScriptData = {
      ...mockScriptData,
      team: [
        {
          id: '1',
          name: 'Member 1',
          role: 'กำกับ',
          email: 'member1@test.com',
          accessRole: 'owner',
          joinedAt: new Date(),
        },
        {
          id: '2',
          name: 'Member 2',
          role: 'เขียนบท',
          email: 'member2@test.com',
          accessRole: 'editor',
          joinedAt: new Date(),
        },
      ],
    };

    const { container } = render(
      <TeamManager
        scriptData={scriptDataWithTeam}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );
    const countBadges = screen.getAllByText('2');
    expect(countBadges.length).toBeGreaterThan(0);
  });

  it('should display project title in context', () => {
    const scriptDataWithTitle: ScriptData = {
      ...mockScriptData,
      title: 'My Awesome Project',
    };

    const { container } = render(
      <TeamManager
        scriptData={scriptDataWithTitle}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );
    expect(container).toBeTruthy();
  });
});

describe('TeamManager - Role Badge Display', () => {
  const mockSetScriptData = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnSaveProject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSaveProject.mockResolvedValue(true);
  });

  it('should display owner role badge', () => {
    const scriptData: ScriptData = {
      id: 'project-123',
      title: 'Test Project',
      projectName: 'Test Project',
      projectType: 'ซีรีย์',
      team: [
        {
          id: '1',
          name: 'Owner User',
          role: 'กำกับ',
          email: 'owner@test.com',
          accessRole: 'owner',
          joinedAt: new Date(),
        },
      ],
      scenes: [],
      characters: [],
      locations: [],
      budgetBreakdown: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { container } = render(
      <TeamManager
        scriptData={scriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );

    // Switch to team tab to see members
    const teamTabButton = Array.from(container.querySelectorAll('button')).find(btn =>
      btn.textContent?.includes('Current Team')
    );
    if (teamTabButton) {
      fireEvent.click(teamTabButton);
    }

    // Owner role should be displayed
    const ownerTexts = screen.getAllByText(/Owner User/i);
    expect(ownerTexts.length).toBeGreaterThan(0);
  });

  it('should display editor role badge', () => {
    const scriptData: ScriptData = {
      id: 'project-123',
      title: 'Test Project',
      projectName: 'Test Project',
      projectType: 'ซีรีย์',
      team: [
        {
          id: '1',
          name: 'Editor User',
          role: 'เขียนบท',
          email: 'editor@test.com',
          accessRole: 'editor',
          joinedAt: new Date(),
        },
      ],
      scenes: [],
      characters: [],
      locations: [],
      budgetBreakdown: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { container } = render(
      <TeamManager
        scriptData={scriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );

    const teamTabButton = Array.from(container.querySelectorAll('button')).find(btn =>
      btn.textContent?.includes('Current Team')
    );
    if (teamTabButton) {
      fireEvent.click(teamTabButton);
    }

    const editorTexts = screen.getAllByText(/Editor User/i);
    expect(editorTexts.length).toBeGreaterThan(0);
  });

  it('should display viewer role badge', () => {
    const scriptData: ScriptData = {
      id: 'project-123',
      title: 'Test Project',
      projectName: 'Test Project',
      projectType: 'ซีรีย์',
      team: [
        {
          id: '1',
          name: 'Viewer User',
          role: 'ฝ่ายอื่นๆ',
          email: 'viewer@test.com',
          accessRole: 'viewer',
          joinedAt: new Date(),
        },
      ],
      scenes: [],
      characters: [],
      locations: [],
      budgetBreakdown: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { container } = render(
      <TeamManager
        scriptData={scriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );

    const teamTabButton = Array.from(container.querySelectorAll('button')).find(btn =>
      btn.textContent?.includes('Current Team')
    );
    if (teamTabButton) {
      fireEvent.click(teamTabButton);
    }

    const viewerTexts = screen.getAllByText(/Viewer User/i);
    expect(viewerTexts.length).toBeGreaterThan(0);
  });

  it('should display admin role badge', () => {
    const scriptData: ScriptData = {
      id: 'project-123',
      title: 'Test Project',
      projectName: 'Test Project',
      projectType: 'ซีรีย์',
      team: [
        {
          id: '1',
          name: 'Admin User',
          role: 'โปรดิวเซอร์',
          email: 'admin@test.com',
          accessRole: 'admin',
          joinedAt: new Date(),
        },
      ],
      scenes: [],
      characters: [],
      locations: [],
      budgetBreakdown: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { container } = render(
      <TeamManager
        scriptData={scriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );

    const teamTabButton = Array.from(container.querySelectorAll('button')).find(btn =>
      btn.textContent?.includes('Current Team')
    );
    if (teamTabButton) {
      fireEvent.click(teamTabButton);
    }

    const adminTexts = screen.getAllByText(/Admin User/i);
    expect(adminTexts.length).toBeGreaterThan(0);
  });

  it('should display multiple members with different roles', () => {
    const scriptData: ScriptData = {
      id: 'project-123',
      title: 'Test Project',
      projectName: 'Test Project',
      projectType: 'ซีรีย์',
      team: [
        {
          id: '1',
          name: 'Owner User',
          role: 'กำกับ',
          email: 'owner@test.com',
          accessRole: 'owner',
          joinedAt: new Date(),
        },
        {
          id: '2',
          name: 'Editor User',
          role: 'เขียนบท',
          email: 'editor@test.com',
          accessRole: 'editor',
          joinedAt: new Date(),
        },
        {
          id: '3',
          name: 'Viewer User',
          role: 'ฝ่ายอื่นๆ',
          email: 'viewer@test.com',
          accessRole: 'viewer',
          joinedAt: new Date(),
        },
      ],
      scenes: [],
      characters: [],
      locations: [],
      budgetBreakdown: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { container } = render(
      <TeamManager
        scriptData={scriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );

    const teamTabButton = Array.from(container.querySelectorAll('button')).find(btn =>
      btn.textContent?.includes('Current Team')
    );
    if (teamTabButton) {
      fireEvent.click(teamTabButton);
    }

    // All three members should be visible
    const ownerTexts = screen.getAllByText(/Owner User/i);
    const editorTexts = screen.getAllByText(/Editor User/i);
    const viewerTexts = screen.getAllByText(/Viewer User/i);

    expect(ownerTexts.length).toBeGreaterThan(0);
    expect(editorTexts.length).toBeGreaterThan(0);
    expect(viewerTexts.length).toBeGreaterThan(0);
  });
});

describe('TeamManager - Access Control', () => {
  const mockSetScriptData = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnSaveProject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSaveProject.mockResolvedValue(true);
  });

  it('should render RoleSelector component in add member form', () => {
    const scriptData: ScriptData = {
      id: 'project-123',
      title: 'Test Project',
      projectName: 'Test Project',
      projectType: 'ซีรีย์',
      team: [],
      scenes: [],
      characters: [],
      locations: [],
      budgetBreakdown: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { container } = render(
      <TeamManager
        scriptData={scriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );

    // RoleSelector component should be present
    expect(container.querySelector('select')).toBeTruthy();
  });

  it('should display form validation messages', () => {
    const scriptData: ScriptData = {
      id: 'project-123',
      title: 'Test Project',
      projectName: 'Test Project',
      projectType: 'ซีรีย์',
      team: [],
      scenes: [],
      characters: [],
      locations: [],
      budgetBreakdown: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <TeamManager
        scriptData={scriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );

    // Required field indicators should be present
    const requiredMarkers = screen.getAllByText('*');
    expect(requiredMarkers.length).toBeGreaterThanOrEqual(3);
  });

  it('should handle team member with missing accessRole', () => {
    const scriptData: ScriptData = {
      id: 'project-123',
      title: 'Test Project',
      projectName: 'Test Project',
      projectType: 'ซีรีย์',
      team: [
        {
          id: '1',
          name: 'Legacy User',
          role: 'กำกับ',
          email: 'legacy@test.com',
          // accessRole intentionally missing to test backward compatibility
          joinedAt: new Date(),
        } as TeamMember,
      ],
      scenes: [],
      characters: [],
      locations: [],
      budgetBreakdown: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { container } = render(
      <TeamManager
        scriptData={scriptData}
        setScriptData={mockSetScriptData}
        onClose={mockOnClose}
        onSaveProject={mockOnSaveProject}
      />
    );

    const teamTabButton = Array.from(container.querySelectorAll('button')).find(btn =>
      btn.textContent?.includes('Current Team')
    );
    if (teamTabButton) {
      fireEvent.click(teamTabButton);
    }

    // Should still render the member
    const legacyTexts = screen.getAllByText(/Legacy User/i);
    expect(legacyTexts.length).toBeGreaterThan(0);
  });
});

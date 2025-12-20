import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RegenerateOptionsModal } from './RegenerateOptionsModal';

describe('RegenerateOptionsModal', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Visibility', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <RegenerateOptionsModal
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );
      expect(screen.getByText(/Regenerate/)).toBeInTheDocument();
    });
  });

  describe('Scene Mode - Default', () => {
    it('should display scene name in header', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene 1"
          hasEdits={false}
        />
      );
      expect(screen.getByText('Test Scene 1')).toBeInTheDocument();
    });

    it('should show fresh start option', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );
      expect(screen.getByText('เริ่มใหม่ทั้งหมด')).toBeInTheDocument();
      expect(screen.getByText('Fresh Start')).toBeInTheDocument();
    });

    it('should show refine existing option', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );
      expect(screen.getByText('ปรับปรุงฉากเดิม')).toBeInTheDocument();
      expect(screen.getByText('Refine Existing')).toBeInTheDocument();
    });

    it('should show use edited data option', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );
      expect(screen.getByText('ใช้ข้อมูลที่แก้ไข')).toBeInTheDocument();
      expect(screen.getByText('Use Edited Data')).toBeInTheDocument();
    });
  });

  describe('Idea Mode Detection', () => {
    const ideaFields = [
      'Big Idea',
      'Premise',
      'Theme',
      'Log Line',
      'Synopsis',
      'Timeline',
      'All Boundary',
      'Boundary',
    ];

    ideaFields.forEach(field => {
      it(`should detect Idea mode for ${field}`, () => {
        render(
          <RegenerateOptionsModal
            isOpen={true}
            onClose={mockOnClose}
            onConfirm={mockOnConfirm}
            sceneName={field}
            hasEdits={false}
          />
        );
        expect(screen.getByText(/Regenerate Idea/)).toBeInTheDocument();
      });
    });

    it('should show Idea-specific fresh start description', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Big Idea"
          hasEdits={false}
        />
      );
      expect(screen.getByText(/สร้าง Idea ใหม่ทั้งหมด/)).toBeInTheDocument();
    });
  });

  describe('Character Mode Detection', () => {
    const characterFields = ['Character', 'All Characters', 'Character Details'];

    characterFields.forEach(field => {
      it(`should detect Character mode for ${field}`, () => {
        render(
          <RegenerateOptionsModal
            isOpen={true}
            onClose={mockOnClose}
            onConfirm={mockOnConfirm}
            sceneName={field}
            hasEdits={false}
          />
        );
        expect(screen.getByText(/Regenerate Character/)).toBeInTheDocument();
      });
    });

    it('should show Character-specific fresh start description', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Character"
          hasEdits={false}
        />
      );
      expect(screen.getByText(/สร้าง Character ใหม่ทั้งหมด/)).toBeInTheDocument();
    });

    it('should detect Character Details mode', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Character Details"
          hasEdits={false}
        />
      );
      // Character Details is a subset of Character mode
      expect(screen.getByText(/Regenerate Character/)).toBeInTheDocument();
    });
  });

  describe('Structure Mode Detection', () => {
    it('should detect Structure mode for Story Structure', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Story Structure"
          hasEdits={false}
        />
      );
      expect(screen.getByText(/Regenerate Scene/)).toBeInTheDocument();
    });

    it('should detect Plot Point mode', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Plot Point: Opening"
          hasEdits={false}
        />
      );
      expect(screen.getByText(/Regenerate Scene/)).toBeInTheDocument();
    });
  });

  describe('Mode Icons', () => {
    it('should display mode icons', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );
      // Icons appear multiple times (header + mode buttons)
      expect(screen.getAllByText('🔄').length).toBeGreaterThan(0);
      expect(screen.getByText('✨')).toBeInTheDocument();
      expect(screen.getByText('📝')).toBeInTheDocument();
    });
  });

  describe('Recommended Badges', () => {
    it('should show recommended badge for fresh start when no edits', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );
      const badges = screen.getAllByText('แนะนำ');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should show recommended badge for use-edited when has edits', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={true}
        />
      );
      const badges = screen.getAllByText('แนะนำ');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('Use Edited Data - Disabled State', () => {
    it('should disable use-edited mode when hasEdits is false', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );
      expect(screen.getByText(/ไม่พบการแก้ไข/)).toBeInTheDocument();
    });

    it('should not show disabled message when hasEdits is true', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={true}
        />
      );
      expect(screen.queryByText(/ไม่พบการแก้ไข/)).not.toBeInTheDocument();
    });
  });

  describe('Mode Selection', () => {
    it('should select fresh mode by default', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );
      // Fresh mode should have selected styling
      const freshButton = screen.getByText('เริ่มใหม่ทั้งหมด').closest('button');
      expect(freshButton?.className).toContain('border-cyan-500');
    });

    it('should change selection when clicking refine mode', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );

      const refineButton = screen.getByText('ปรับปรุงฉากเดิม').closest('button');
      fireEvent.click(refineButton!);

      // Should have selected styling
      expect(refineButton?.className).toContain('border-purple-500');
    });

    it('should change selection when clicking use-edited mode (if enabled)', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={true}
        />
      );

      const useEditedButton = screen.getByText('ใช้ข้อมูลที่แก้ไข').closest('button');
      fireEvent.click(useEditedButton!);

      // Should have selected styling
      expect(useEditedButton?.className).toContain('border-green-500');
    });

    it('should not change selection when clicking disabled mode', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );

      const useEditedButton = screen.getByText('ใช้ข้อมูลที่แก้ไข').closest('button');
      fireEvent.click(useEditedButton!);

      // Should still have fresh mode selected
      const freshButton = screen.getByText('เริ่มใหม่ทั้งหมด').closest('button');
      expect(freshButton?.className).toContain('border-cyan-500');
    });
  });

  describe('Confirm Action', () => {
    it('should call onConfirm with fresh mode when confirming', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );

      // Find confirm button - it's the last button with gradient background
      const buttons = screen.getAllByRole('button');
      const confirmButton = buttons[buttons.length - 1]; // Last button is confirm
      fireEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledWith('fresh');
    });

    it('should call onConfirm with refine mode when selected', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );

      // Select refine mode
      const refineButton = screen.getByText('ปรับปรุงฉากเดิม').closest('button');
      fireEvent.click(refineButton!);

      // Confirm - last button
      const buttons = screen.getAllByRole('button');
      const confirmButton = buttons[buttons.length - 1];
      fireEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledWith('refine');
    });

    it('should call onConfirm with use-edited mode when selected', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={true}
        />
      );

      // Select use-edited mode
      const useEditedButton = screen.getByText('ใช้ข้อมูลที่แก้ไข').closest('button');
      fireEvent.click(useEditedButton!);

      // Confirm - last button
      const buttons = screen.getAllByRole('button');
      const confirmButton = buttons[buttons.length - 1];
      fireEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledWith('use-edited');
    });

    it('should close modal after confirming', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );

      const buttons = screen.getAllByRole('button');
      const confirmButton = buttons[buttons.length - 1];
      fireEvent.click(confirmButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Close Actions', () => {
    it('should call onClose when clicking close button', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );

      const closeButton = screen.getByRole('button', { name: '' }).querySelector('svg');
      fireEvent.click(closeButton?.parentElement!);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking cancel button', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );

      const cancelButton = screen.getByText('ยกเลิก');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking backdrop', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );

      const backdrop = document.querySelector('.bg-black\\/70');
      fireEvent.click(backdrop!);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Info Box', () => {
    it('should display usage tips', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );

      expect(screen.getByText('คำแนะนำการใช้งาน:')).toBeInTheDocument();
      // Text is in <strong> tags in list items
      const strongElements = document.querySelectorAll('strong');
      const texts = Array.from(strongElements).map(el => el.textContent);
      expect(texts).toContain('Fresh Start');
      expect(texts).toContain('Refine Existing');
      expect(texts).toContain('Use Edited Data');
    });
  });

  describe('Context-Specific Confirm Button Text', () => {
    it('should show "สร้าง Idea" for Idea mode', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Big Idea"
          hasEdits={false}
        />
      );
      expect(screen.getByText('สร้าง Idea')).toBeInTheDocument();
    });

    it('should show "สร้าง Character" for Character mode', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Character"
          hasEdits={false}
        />
      );
      expect(screen.getByText('สร้าง Character')).toBeInTheDocument();
    });

    it('should show "สร้าง ฉาก" for Scene mode', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );
      expect(screen.getByText('สร้าง ฉาก')).toBeInTheDocument();
    });
  });

  describe('Mode Details - Fresh Start', () => {
    it('should show Idea-specific details for fresh start', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Big Idea"
          hasEdits={false}
        />
      );
      expect(screen.getByText(/ใช้เฉพาะข้อมูลพื้นฐาน \(STEP 1: Genre/)).toBeInTheDocument();
    });

    it('should show Character-specific details for fresh start', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Character"
          hasEdits={false}
        />
      );
      expect(screen.getByText(/ใช้เฉพาะข้อมูลพื้นฐาน \(STEP 1, STEP 2\)/)).toBeInTheDocument();
    });
  });

  describe('Mode Details - Refine Existing', () => {
    it('should show refine details for Idea mode', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Big Idea"
          hasEdits={false}
        />
      );
      expect(screen.getByText(/ใช้ Idea ปัจจุบันเป็นพื้นฐาน/)).toBeInTheDocument();
    });

    it('should show refine details for Character mode', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Character"
          hasEdits={false}
        />
      );
      expect(screen.getByText(/ใช้ Character ปัจจุบันเป็นพื้นฐาน/)).toBeInTheDocument();
    });
  });

  describe('Mode Details - Use Edited Data', () => {
    it('should show use-edited details for Idea mode', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Big Idea"
          hasEdits={true}
        />
      );
      expect(screen.getByText(/นำการแก้ไข Idea/)).toBeInTheDocument();
    });

    it('should show use-edited details for Character mode', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Character"
          hasEdits={true}
        />
      );
      expect(screen.getByText(/นำการแก้ไข Character/)).toBeInTheDocument();
    });
  });

  describe('Radio Button Visual State', () => {
    it('should show filled radio for selected mode', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );

      // Fresh mode is selected by default
      const radioButtons = document.querySelectorAll('.w-2\\.5.h-2\\.5.bg-white.rounded-full');
      expect(radioButtons.length).toBe(1);
    });

    it('should show empty radio for unselected modes', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );

      // Should have border circles for all modes
      const radioBorders = document.querySelectorAll('.rounded-full.border-2');
      expect(radioBorders.length).toBeGreaterThan(2);
    });
  });

  describe('Styling and Classes', () => {
    it('should have gradient header', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );

      const header = document.querySelector('.bg-gradient-to-r.from-cyan-900\\/50');
      expect(header).toBeInTheDocument();
    });

    it('should have backdrop with blur', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );

      const backdrop = document.querySelector('.backdrop-blur-sm');
      expect(backdrop).toBeInTheDocument();
    });

    it('should have gradient confirm button', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );

      const buttons = screen.getAllByRole('button');
      const confirmButton = buttons[buttons.length - 1];
      expect(confirmButton?.className).toContain('bg-gradient-to-r');
    });
  });

  describe('Entity Name Display', () => {
    it('should display correct entity name for Idea in warnings', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Big Idea"
          hasEdits={false}
        />
      );
      expect(screen.getByText(/ไม่พบการแก้ไขในIdea/)).toBeInTheDocument();
    });

    it('should display correct entity name for Character in warnings', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Character"
          hasEdits={false}
        />
      );
      expect(screen.getByText(/ไม่พบการแก้ไขในCharacter/)).toBeInTheDocument();
    });

    it('should display correct entity name for Scene in warnings', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );
      expect(screen.getByText(/ไม่พบการแก้ไขในฉาก/)).toBeInTheDocument();
    });
  });

  describe('Modal Overflow Handling', () => {
    it('should have scrollable content area', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );

      const scrollableArea = document.querySelector('.overflow-y-auto');
      expect(scrollableArea).toBeInTheDocument();
    });

    it('should limit modal height', () => {
      render(
        <RegenerateOptionsModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          sceneName="Test Scene"
          hasEdits={false}
        />
      );

      const modal = document.querySelector('.max-h-\\[90vh\\]');
      expect(modal).toBeInTheDocument();
    });
  });
});


/**
 * Advanced Buddhist Psychology Processors
 * Based on Digital Mind Model v14
 *
 * Contains:
 * 1. TanhaToUpadana_Escalator - Escalates Tanha (craving) to Upadana (clinging)
 * 2. Kilesa_Eradication_Processor - Permanent kilesa removal via Magga-ñāṇa
 */

import type { Character, AnusayaProfile } from '../../types';

// ========================================================================
// TYPES
// ========================================================================

/**
 * 4 Types of Upadana (Clinging)
 */
export type UpadanaType =
  | 'kamupadana' // Clinging to sensual pleasures
  | 'ditthupadana' // Clinging to views/opinions
  | 'silabbatupadana' // Clinging to rites and rituals
  | 'attavadupadana'; // Clinging to self-doctrine

/**
 * Active Upadana instance
 */
export interface ActiveUpadana {
  type: UpadanaType;
  intensity: number; // 0-100
  target: string; // What they're clinging to
  created_at: number; // Timestamp
  tanha_history: number[]; // Last N moments of tanha intensity
}

/**
 * Magga-Phala stages (Path and Fruition)
 */
export type MaggaStage = 'sotapatti' | 'sakadagami' | 'anagami' | 'arahatta';

/**
 * Samyojana (10 Fetters) - what gets eradicated at each stage
 */
export interface Samyojana {
  sakkaya_ditthi: boolean; // Personality belief (1)
  vicikiccha: boolean; // Doubt (2)
  silabbata_paramasa: boolean; // Rites & rituals attachment (3)
  kama_raga: boolean; // Sensual lust (4)
  patigha: boolean; // Ill-will (5)
  rupa_raga: boolean; // Lust for fine-material (6)
  arupa_raga: boolean; // Lust for immaterial (7)
  mana: boolean; // Conceit (8)
  uddhacca: boolean; // Restlessness (9)
  avijja: boolean; // Ignorance (10)
}

// ========================================================================
// 1. TANHA TO UPADANA ESCALATOR
// ========================================================================

export class TanhaToUpadana_Escalator {
  /**
   * Monitors Tanha intensity over time and escalates to Upadana when threshold is crossed
   *
   * Logic:
   * - Track Tanha intensity for last N moments
   * - If Tanha > threshold for consecutive moments → create Upadana
   * - Higher Tanha → stronger Upadana
   * - Different objects of desire → different Upadana types
   */
  static readonly TANHA_THRESHOLD = 60; // Tanha intensity threshold
  static readonly CONSECUTIVE_MOMENTS_REQUIRED = 5; // How many moments needed
  static readonly UPADANA_BASE_INTENSITY = 40;

  /**
   * Check if current Tanha should escalate to Upadana
   */
  static checkForEscalation(
    _current_tanha_intensity: number,
    tanha_history: number[],
    tanha_target: string,
    existing_upadanas: ActiveUpadana[]
  ): ActiveUpadana | null {
    // Need history
    if (tanha_history.length < this.CONSECUTIVE_MOMENTS_REQUIRED) {
      return null;
    }

    // Check if all recent moments exceed threshold
    const recent_moments = tanha_history.slice(-this.CONSECUTIVE_MOMENTS_REQUIRED);
    const all_exceed_threshold = recent_moments.every(
      intensity => intensity >= this.TANHA_THRESHOLD
    );

    if (!all_exceed_threshold) {
      return null;
    }

    // Check if Upadana already exists for this target
    const existing = existing_upadanas.find(u => u.target === tanha_target);
    if (existing) {
      // Strengthen existing Upadana instead
      existing.intensity = Math.min(100, existing.intensity + 5);
      return null;
    }

    // Create new Upadana
    const upadana_type = this.determineUpadanaType(tanha_target);
    const avg_tanha = recent_moments.reduce((a, b) => a + b, 0) / recent_moments.length;

    const new_upadana: ActiveUpadana = {
      type: upadana_type,
      intensity: this.UPADANA_BASE_INTENSITY + (avg_tanha - this.TANHA_THRESHOLD),
      target: tanha_target,
      created_at: Date.now(),
      tanha_history: [...recent_moments],
    };

    return new_upadana;
  }

  /**
   * Determine which type of Upadana based on the target
   */
  private static determineUpadanaType(target: string): UpadanaType {
    const target_lower = target.toLowerCase();

    // Sensual pleasures
    if (
      target_lower.includes('เงิน') ||
      target_lower.includes('อาหาร') ||
      target_lower.includes('เพศ') ||
      target_lower.includes('ความสุข') ||
      target_lower.includes('pleasure') ||
      target_lower.includes('sex') ||
      target_lower.includes('money')
    ) {
      return 'kamupadana';
    }

    // Views and opinions
    if (
      target_lower.includes('ความคิด') ||
      target_lower.includes('ความเชื่อ') ||
      target_lower.includes('ทฤษฎี') ||
      target_lower.includes('ideology') ||
      target_lower.includes('belief') ||
      target_lower.includes('opinion') ||
      target_lower.includes('view')
    ) {
      return 'ditthupadana';
    }

    // Rites and rituals
    if (
      target_lower.includes('พิธีกรรม') ||
      target_lower.includes('ศาสนพิธี') ||
      target_lower.includes('ritual') ||
      target_lower.includes('ceremony') ||
      target_lower.includes('practice') ||
      target_lower.includes('ประเพณี')
    ) {
      return 'silabbatupadana';
    }

    // Self-doctrine (default for ego-related)
    return 'attavadupadana';
  }

  /**
   * Process all active Upadanas - they decay over time if not fed
   */
  static processUpadanas(
    active_upadanas: ActiveUpadana[],
    current_tanha_targets: Set<string>
  ): ActiveUpadana[] {
    const decay_rate = 2; // Intensity lost per moment if not reinforced

    return active_upadanas
      .map(upadana => {
        // If current Tanha feeds this Upadana, strengthen it
        if (current_tanha_targets.has(upadana.target)) {
          return {
            ...upadana,
            intensity: Math.min(100, upadana.intensity + 3),
          };
        }

        // Otherwise, decay
        return {
          ...upadana,
          intensity: Math.max(0, upadana.intensity - decay_rate),
        };
      })
      .filter(upadana => upadana.intensity > 0); // Remove depleted ones
  }

  /**
   * Calculate bonus to Akusala from active Upadanas
   * Used by JavanaDecisionEngine
   */
  static getUpadanaAkusalaBonus(active_upadanas: ActiveUpadana[]): number {
    if (active_upadanas.length === 0) return 0;

    // Each Upadana adds to Akusala tendency
    const total_intensity = active_upadanas.reduce((sum, u) => sum + u.intensity, 0);
    const avg_intensity = total_intensity / active_upadanas.length;

    // Bonus: 0-50 based on average intensity
    return Math.floor(avg_intensity / 2);
  }
}

// ========================================================================
// 2. KILESA ERADICATION PROCESSOR
// ========================================================================

export class Kilesa_Eradication_Processor {
  /**
   * Links Magga-ñāṇa (Path Knowledge) to permanent Kilesa/Anusaya removal
   *
   * Buddhist Path has 4 stages:
   * 1. Sotapatti (Stream-Entry) - Eradicates first 3 fetters
   * 2. Sakadagami (Once-Returner) - Weakens sensual lust & ill-will
   * 3. Anagami (Non-Returner) - Eradicates sensual lust & ill-will completely
   * 4. Arahatta (Arahantship) - Eradicates all remaining fetters
   */

  /**
   * Initialize Samyojana (all 10 fetters present)
   */
  static initializeSamyojana(): Samyojana {
    return {
      sakkaya_ditthi: true, // 1
      vicikiccha: true, // 2
      silabbata_paramasa: true, // 3
      kama_raga: true, // 4
      patigha: true, // 5
      rupa_raga: true, // 6
      arupa_raga: true, // 7
      mana: true, // 8
      uddhacca: true, // 9
      avijja: true, // 10
    };
  }

  /**
   * Apply Magga-ñāṇa and eradicate corresponding fetters
   */
  static applyMagga(
    magga_stage: MaggaStage,
    current_samyojana: Samyojana,
    current_anusaya: AnusayaProfile
  ): {
    updated_samyojana: Samyojana;
    updated_anusaya: AnusayaProfile;
    eradicated_fetters: string[];
  } {
    const updated_samyojana = { ...current_samyojana };
    const updated_anusaya = { ...current_anusaya };
    const eradicated_fetters: string[] = [];

    switch (magga_stage) {
      case 'sotapatti':
        // Stream-Entry: Eradicates first 3 fetters
        if (updated_samyojana.sakkaya_ditthi) {
          updated_samyojana.sakkaya_ditthi = false;
          eradicated_fetters.push('Sakkāya-diṭṭhi (Personality Belief)');
          // Also eradicate related Anusaya
          updated_anusaya.avijja = 0; // Ignorance about self
        }

        if (updated_samyojana.vicikiccha) {
          updated_samyojana.vicikiccha = false;
          eradicated_fetters.push('Vicikicchā (Doubt)');
          updated_anusaya.vicikiccha = 0;
        }

        if (updated_samyojana.silabbata_paramasa) {
          updated_samyojana.silabbata_paramasa = false;
          eradicated_fetters.push('Sīlabbata-parāmāsa (Rites & Rituals)');
        }

        // Sotapanna cannot be reborn in lower realms
        break;

      case 'sakadagami':
        // Once-Returner: Weakens (but doesn't eradicate) sensual lust & ill-will
        if (updated_anusaya.kama_raga > 30) {
          updated_anusaya.kama_raga = 30; // Weaken significantly
          eradicated_fetters.push('Kāma-rāga weakened');
        }
        if (updated_anusaya.patigha > 30) {
          updated_anusaya.patigha = 30;
          eradicated_fetters.push('Paṭigha weakened');
        }
        break;

      case 'anagami':
        // Non-Returner: Completely eradicates sensual lust & ill-will
        if (updated_samyojana.kama_raga) {
          updated_samyojana.kama_raga = false;
          eradicated_fetters.push('Kāma-rāga (Sensual Lust) - ERADICATED');
          updated_anusaya.kama_raga = 0;
        }

        if (updated_samyojana.patigha) {
          updated_samyojana.patigha = false;
          eradicated_fetters.push('Paṭigha (Ill-will) - ERADICATED');
          updated_anusaya.patigha = 0;
        }

        // Anagami will be reborn in Pure Abodes only
        break;

      case 'arahatta':
        // Arahant: Eradicates ALL remaining 5 fetters
        if (updated_samyojana.rupa_raga) {
          updated_samyojana.rupa_raga = false;
          eradicated_fetters.push('Rūpa-rāga (Fine-Material Lust) - ERADICATED');
        }

        if (updated_samyojana.arupa_raga) {
          updated_samyojana.arupa_raga = false;
          eradicated_fetters.push('Arūpa-rāga (Immaterial Lust) - ERADICATED');
        }

        if (updated_samyojana.mana) {
          updated_samyojana.mana = false;
          eradicated_fetters.push('Māna (Conceit) - ERADICATED');
        }

        if (updated_samyojana.uddhacca) {
          updated_samyojana.uddhacca = false;
          eradicated_fetters.push('Uddhacca (Restlessness) - ERADICATED');
        }

        if (updated_samyojana.avijja) {
          updated_samyojana.avijja = false;
          eradicated_fetters.push('Avijjā (Ignorance) - ERADICATED');
          updated_anusaya.avijja = 0;
        }

        // Eradicate ALL Anusaya
        updated_anusaya.kama_raga = 0;
        updated_anusaya.patigha = 0;
        updated_anusaya.mana = 0;
        updated_anusaya.vicikiccha = 0;
        updated_anusaya.ditthi = 0;
        updated_anusaya.bhava_raga = 0;
        updated_anusaya.avijja = 0;

        // Arahant will not be reborn - attains Parinibbana at death
        break;
    }

    return {
      updated_samyojana,
      updated_anusaya,
      eradicated_fetters,
    };
  }

  /**
   * Check if character can attain a particular Magga stage
   * Requirements based on Parami levels and Kilesa levels
   */
  static canAttainMagga(
    magga_stage: MaggaStage,
    character: Character
  ): {
    can_attain: boolean;
    requirements_met: string[];
    requirements_missing: string[];
  } {
    const requirements_met: string[] = [];
    const requirements_missing: string[] = [];

    const parami = character.parami_portfolio;
    const anusaya = character.buddhist_psychology?.anusaya;

    // Validate required data
    if (!parami || !anusaya) {
      return {
        can_attain: false,
        requirements_met: [],
        requirements_missing: ['Missing parami or anusaya data']
      };
    }

    switch (magga_stage) {
      case 'sotapatti': {
        // Stream-Entry requirements:
        // 1. Sacca (Truthfulness) >= 70
        // 2. Panna (Wisdom) >= 60
        // 3. Viriya (Effort) >= 50
        // 4. Total Kilesa < 200

        if (parami.sacca.level >= 70) {
          requirements_met.push('Sacca (Truthfulness) sufficient');
        } else {
          requirements_missing.push(`Sacca needs ${70 - parami.sacca.level} more levels`);
        }

        if (parami.panna.level >= 60) {
          requirements_met.push('Paññā (Wisdom) sufficient');
        } else {
          requirements_missing.push(`Paññā needs ${60 - parami.panna.level} more levels`);
        }

        if (parami.viriya.level >= 50) {
          requirements_met.push('Viriya (Effort) sufficient');
        } else {
          requirements_missing.push(`Viriya needs ${50 - parami.viriya.level} more levels`);
        }

        const total_kilesa =
          anusaya.kama_raga +
          anusaya.patigha +
          anusaya.mana +
          anusaya.vicikiccha +
          anusaya.ditthi +
          anusaya.bhava_raga +
          anusaya.avijja;

        if (total_kilesa < 200) {
          requirements_met.push('Kilesa levels manageable');
        } else {
          requirements_missing.push(`Total Kilesa too high (${total_kilesa}/200)`);
        }
        break;
      }

      case 'sakadagami':
        // Once-Returner: Must be Sotapanna first + further reduce Kilesa
        if (parami.panna.level >= 80) {
          requirements_met.push('Paññā enhanced');
        } else {
          requirements_missing.push(`Paññā needs ${80 - parami.panna.level} more levels`);
        }

        if (anusaya.kama_raga < 50) {
          requirements_met.push('Kāma-rāga weakened');
        } else {
          requirements_missing.push('Kāma-rāga still too strong');
        }

        if (anusaya.patigha < 50) {
          requirements_met.push('Paṭigha weakened');
        } else {
          requirements_missing.push('Paṭigha still too strong');
        }
        break;

      case 'anagami':
        // Non-Returner: Complete eradication of sensual desire
        if (parami.panna.level >= 100) {
          requirements_met.push('Paññā very strong');
        } else {
          requirements_missing.push(`Paññā needs ${100 - parami.panna.level} more levels`);
        }

        if (parami.nekkhamma.level >= 80) {
          requirements_met.push('Nekkhamma (Renunciation) sufficient');
        } else {
          requirements_missing.push(`Nekkhamma needs ${80 - parami.nekkhamma.level} more levels`);
        }

        if (anusaya.kama_raga < 10) {
          requirements_met.push('Kāma-rāga nearly gone');
        } else {
          requirements_missing.push('Kāma-rāga must be < 10');
        }

        if (anusaya.patigha < 10) {
          requirements_met.push('Paṭigha nearly gone');
        } else {
          requirements_missing.push('Paṭigha must be < 10');
        }
        break;

      case 'arahatta': {
        // Arahantship: Perfect purity
        if (parami.panna.level >= 150) {
          requirements_met.push('Paññā perfected');
        } else {
          requirements_missing.push(`Paññā needs ${150 - parami.panna.level} more levels`);
        }

        if (parami.upekkha.level >= 120) {
          requirements_met.push('Upekkhā (Equanimity) perfected');
        } else {
          requirements_missing.push(`Upekkhā needs ${120 - parami.upekkha.level} more levels`);
        }

        const remaining_kilesa =
          anusaya.kama_raga + anusaya.patigha + anusaya.mana + anusaya.avijja;

        if (remaining_kilesa === 0) {
          requirements_met.push('All Kilesa eradicated');
        } else {
          requirements_missing.push('All Kilesa must be eradicated first');
        }
        break;
      }
    }

    return {
      can_attain: requirements_missing.length === 0,
      requirements_met,
      requirements_missing,
    };
  }

  /**
   * Calculate progress towards next Magga stage (0-100%)
   */
  static calculateMaggaProgress(target_magga: MaggaStage, character: Character): number {
    const check = this.canAttainMagga(target_magga, character);
    const total_requirements = check.requirements_met.length + check.requirements_missing.length;

    if (total_requirements === 0) return 0;

    return Math.floor((check.requirements_met.length / total_requirements) * 100);
  }
}

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

/**
 * Get next Magga stage after current one
 */
export function getNextMaggaStage(current: MaggaStage | null): MaggaStage | null {
  if (!current) return 'sotapatti';

  const stages: MaggaStage[] = ['sotapatti', 'sakadagami', 'anagami', 'arahatta'];
  const current_index = stages.indexOf(current);

  if (current_index === -1 || current_index === stages.length - 1) {
    return null; // Already Arahant
  }

  return stages[current_index + 1];
}

/**
 * Get description of Magga stage
 */
export function getMaggaDescription(stage: MaggaStage): string {
  const descriptions: Record<MaggaStage, string> = {
    sotapatti: 'โสดาบัน (ผู้ได้เข้ากระแสธรรม) - ตัดสังโยชน์ 3 ข้อแรก ไม่ตกอบาย',
    sakadagami: 'สกทาคามี (ผู้กลับมาอีกครั้งเดียว) - ลดกามราคะและพยาบาท',
    anagami: 'อนาคามี (ผู้ไม่กลับมา) - ตัดกามราคะและพยาบาทสิ้นเชิง เกิดสุทธาวาส',
    arahatta: 'อรหัตต์ (ผู้บรรลุธรรม) - ตัดกิเลสทั้งหมด ไม่เกิดอีก บรรลุปรินิพพาน',
  };

  return descriptions[stage];
}

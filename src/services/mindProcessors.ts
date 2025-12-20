/**
 * Mind Processing System - The Core Engine of Buddhist Psychology
 * Simulates the Abhidhamma mind-door process (Manodvāra Vīthi)
 *
 * Key Processors:
 * - JavanaDecisionEngine: Decides kusala vs akusala citta
 * - ChittaVithi_Generator: Simulates the 17-moment mind process
 * - TanhaToUpadana_Escalator: Escalates tanha to upadana
 */

import type { Character, AnusayaProfile, ParamiPortfolio } from '../types';
import type { CittaType, CittaMoment, VedanaType, HetuType } from '../types/cittaTypes';

// ========================================================================
// INTERFACES
// ========================================================================

export interface SensoryInput {
  type: 'pleasant' | 'unpleasant' | 'neutral';
  object: string; // Description of what is perceived
  intensity: number; // 0-100
  senseDoor: 'eye' | 'ear' | 'nose' | 'tongue' | 'body' | 'mind';
}

export interface JavanaResult {
  citta_type: CittaType;
  quality: 'kusala' | 'akusala' | 'vipaka' | 'kiriya';
  hetu: HetuType[];
  vedana: VedanaType;
  cetana_strength: number; // Volition strength (0-100)
  reasoning: string; // Explanation of why this citta arose
}

export interface VithiProcess {
  input: SensoryInput;
  manodvaravajjana: CittaMoment; // Mind-door adverting
  javana_cittas: CittaMoment[]; // 7 javana moments
  tadarammana_cittas: CittaMoment[]; // 2 retention moments
  kamma_created?: {
    type: string;
    quality: 'กุศล' | 'อกุศล';
    intensity: number;
  };
}

// ========================================================================
// JAVANA DECISION ENGINE - The Heart of Kusala/Akusala Determination
// ========================================================================

/**
 * JavanaDecisionEngine determines whether kusala or akusala citta arises
 *
 * Decision Logic:
 * 1. Check for Sati (mindfulness) intervention from Panna level
 * 2. If no Sati, evaluate Anusaya (latent tendencies) strength
 * 3. Check for Parami resistance against kilesa
 * 4. Check for ActiveUpadana that might override everything
 * 5. Consider current Bhumi environmental effects
 * 6. Calculate final probability and generate citta
 */
export class JavanaDecisionEngine {
  /**
   * Main decision function
   */
  static decide(input: SensoryInput, character: Character): JavanaResult {
    const { internal, buddhist_psychology } = character;
    const anusaya = buddhist_psychology?.anusaya;
    const parami = character.parami_portfolio;

    // Step 1: Check for Sati intervention (Panna-based awareness)
    const pannaLevel = internal?.consciousness?.['ปัญญา (Wisdom)'] || 0;
    const satiLevel = internal?.consciousness?.['สติ (Mindfulness)'] || 0;
    const satiStrength = (pannaLevel + satiLevel) / 2;

    const satiIntervention = Math.random() * 100 < satiStrength;

    if (satiIntervention && satiStrength > 60) {
      // High Sati: Kusala citta arises with mindfulness
      return this.generateKusalaCitta(input, 'sati_intervention', satiStrength);
    }

    // Step 2: Evaluate Anusaya (Latent Tendencies)
    const anusayaResponse = this.evaluateAnusaya(input, anusaya);

    // Step 3: Check Parami resistance
    const paramiResistance = this.evaluateParamiResistance(
      anusayaResponse.triggered_anusaya,
      parami
    );

    // Step 4: Check for ActiveUpadana (if implemented in character)
    const upadanaBonus = this.checkActiveUpadana(input, character);

    // Step 5: Calculate final scores
    const akusalaScore =
      anusayaResponse.kilesa_strength + upadanaBonus - paramiResistance.total_resistance;
    const kusalaScore = satiStrength + paramiResistance.total_resistance;

    // Step 6: Generate citta based on scores
    if (akusalaScore > kusalaScore) {
      return this.generateAkusalaCitta(
        input,
        anusayaResponse.triggered_anusaya,
        anusayaResponse.kilesa_strength,
        `Akusala citta arose due to ${anusayaResponse.triggered_anusaya} (${anusayaResponse.kilesa_strength}). Parami resistance (${paramiResistance.total_resistance}) was insufficient.`
      );
    } else {
      return this.generateKusalaCitta(
        input,
        'parami_resistance',
        kusalaScore,
        `Kusala citta arose. Parami resistance (${paramiResistance.total_resistance}) overcame kilesa tendency.`
      );
    }
  }

  /**
   * Evaluate which Anusaya gets triggered by the sensory input
   */
  private static evaluateAnusaya(
    input: SensoryInput,
    anusaya?: AnusayaProfile
  ): {
    triggered_anusaya: keyof AnusayaProfile;
    kilesa_strength: number;
  } {
    if (!anusaya) {
      return { triggered_anusaya: 'avijja', kilesa_strength: 50 };
    }

    switch (input.type) {
      case 'pleasant':
        // Pleasant input triggers Kāma-rāga (sensual desire)
        return {
          triggered_anusaya: 'kama_raga',
          kilesa_strength: anusaya.kama_raga * (input.intensity / 100),
        };

      case 'unpleasant':
        // Unpleasant input triggers Paṭigha (aversion)
        return {
          triggered_anusaya: 'patigha',
          kilesa_strength: anusaya.patigha * (input.intensity / 100),
        };

      case 'neutral': {
        // Neutral input triggers Avijjā (ignorance) or Vicikicchā (doubt)
        const avijjaStrength = anusaya.avijja || 50;
        const vicikicchaStrength = anusaya.vicikiccha || 30;

        if (avijjaStrength > vicikicchaStrength) {
          return { triggered_anusaya: 'avijja', kilesa_strength: avijjaStrength };
        } else {
          return { triggered_anusaya: 'vicikiccha', kilesa_strength: vicikicchaStrength };
        }
      }

      default:
        return { triggered_anusaya: 'avijja', kilesa_strength: 50 };
    }
  }

  /**
   * Calculate Parami resistance against specific kilesa
   */
  private static evaluateParamiResistance(
    triggered_anusaya: keyof AnusayaProfile,
    parami?: ParamiPortfolio
  ): {
    primary_parami: keyof ParamiPortfolio | null;
    supporting_paramis: Array<keyof ParamiPortfolio>;
    total_resistance: number;
  } {
    if (!parami) {
      return { primary_parami: null, supporting_paramis: [], total_resistance: 0 };
    }

    // Map anusaya to counter-parami
    const paramiCounters: Record<
      keyof AnusayaProfile,
      {
        primary: keyof ParamiPortfolio;
        supporting: Array<keyof ParamiPortfolio>;
      }
    > = {
      kama_raga: {
        primary: 'nekkhamma',
        supporting: ['dana', 'sila', 'upekkha'],
      },
      patigha: {
        primary: 'khanti',
        supporting: ['metta', 'upekkha'],
      },
      mana: {
        primary: 'upekkha',
        supporting: ['khanti', 'sacca'],
      },
      ditthi: {
        primary: 'panna',
        supporting: ['sacca', 'viriya'],
      },
      vicikiccha: {
        primary: 'sacca',
        supporting: ['panna', 'adhitthana'],
      },
      bhava_raga: {
        primary: 'nekkhamma',
        supporting: ['panna', 'upekkha'],
      },
      avijja: {
        primary: 'panna',
        supporting: ['nekkhamma', 'adhitthana'],
      },
    };

    const counter = paramiCounters[triggered_anusaya];
    if (!counter) {
      return { primary_parami: null, supporting_paramis: [], total_resistance: 0 };
    }

    // Calculate resistance
    const primaryLevel = parami[counter.primary]?.level || 0;
    const supportingLevels = counter.supporting
      .map(p => parami[p]?.level || 0)
      .reduce((sum, level) => sum + level, 0);

    const totalResistance = primaryLevel * 10 + supportingLevels * 3;

    return {
      primary_parami: counter.primary,
      supporting_paramis: counter.supporting,
      total_resistance: totalResistance,
    };
  }

  /**
   * Check for ActiveUpadana bonus (future implementation)
   */
  private static checkActiveUpadana(_input: SensoryInput, _character: Character): number {
    // TODO: Check if character has active upadana related to this input
    // For now, return 0
    return 0;
  }

  /**
   * Generate Kusala Citta based on conditions
   */
  private static generateKusalaCitta(
    input: SensoryInput,
    reason: string,
    strength: number,
    customReasoning?: string
  ): JavanaResult {
    // Determine which Mahā-kusala citta to generate
    const hasKnowledge = strength > 50;
    const isPrompted = Math.random() > 0.7;
    const vedana: VedanaType = input.type === 'pleasant' ? 'โสมนัส' : 'อุเบกขา';

    let cittaType: CittaType;

    if (vedana === 'โสมนัส') {
      if (hasKnowledge && !isPrompted) {
        cittaType = 'มหากุศลจิต โสมนัสสสหคตัง ญาณสัมปยุตตัง อสังขาริกัง';
      } else if (hasKnowledge && isPrompted) {
        cittaType = 'มหากุศลจิต โสมนัสสสหคตัง ญาณสัมปยุตตัง ส สังขาริกัง';
      } else if (!hasKnowledge && !isPrompted) {
        cittaType = 'มหากุศลจิต โสมนัสสสหคตัง ญาณวิปปยุตตัง อสังขาริกัง';
      } else {
        cittaType = 'มหากุศลจิต โสมนัสสสหคตัง ญาณวิปปยุตตัง ส สังขาริกัง';
      }
    } else {
      if (hasKnowledge && !isPrompted) {
        cittaType = 'มหากุศลจิต อุเบกขาสหคตัง ญาณสัมปยุตตัง อสังขาริกัง';
      } else if (hasKnowledge && isPrompted) {
        cittaType = 'มหากุศลจิต อุเบกขาสหคตัง ญาณสัมปยุตตัง ส สังขาริกัง';
      } else if (!hasKnowledge && !isPrompted) {
        cittaType = 'มหากุศลจิต อุเบกขาสหคตัง ญาณวิปปยุตตัง อสังขาริกัง';
      } else {
        cittaType = 'มหากุศลจิต อุเบกขาสหคตัง ญาณวิปปยุตตัง ส สังขาริกัง';
      }
    }

    return {
      citta_type: cittaType,
      quality: 'kusala',
      hetu: ['อโลภะ', 'อโทสะ', hasKnowledge ? 'อโมหะ' : 'อโมหะ'],
      vedana,
      cetana_strength: Math.min(strength, 100),
      reasoning:
        customReasoning ||
        `Kusala citta arose due to ${reason}. Strength: ${strength}. Mindfulness intervened successfully.`,
    };
  }

  /**
   * Generate Akusala Citta based on triggered Anusaya
   */
  private static generateAkusalaCitta(
    input: SensoryInput,
    anusaya: keyof AnusayaProfile,
    strength: number,
    reasoning: string
  ): JavanaResult {
    let cittaType: CittaType;
    let hetu: HetuType[];
    let vedana: VedanaType;

    switch (anusaya) {
      case 'kama_raga':
      case 'bhava_raga': {
        // Lobha-mūla citta
        const hasDitthi = Math.random() > 0.6;
        const isPrompted = Math.random() > 0.7;
        vedana = input.type === 'pleasant' ? 'โสมนัส' : 'อุเบกขา';

        if (vedana === 'โสมนัส') {
          if (hasDitthi && !isPrompted) {
            cittaType = 'โลภมูลจิต โสมนัสสสหคตัง ทิฏฐิคตสัมปยุตตัง อสังขาริกัง';
          } else if (hasDitthi && isPrompted) {
            cittaType = 'โลภมูลจิต โสมนัสสสหคตัง ทิฏฐิคตสัมปยุตตัง สสังขาริกัง';
          } else if (!hasDitthi && !isPrompted) {
            cittaType = 'โลภมูลจิต โสมนัสสสหคตัง ทิฏฐิคตวิปปยุตตัง อสังขาริกัง';
          } else {
            cittaType = 'โลภมูลจิต โสมนัสสสหคตัง ทิฏฐิคตวิปปยุตตัง สสังขาริกัง';
          }
        } else {
          if (hasDitthi && !isPrompted) {
            cittaType = 'โลภมูลจิต อุเบกขาสหคตัง ทิฏฐิคตสัมปยุตตัง อสังขาริกัง';
          } else if (hasDitthi && isPrompted) {
            cittaType = 'โลภมูลจิต อุเบกขาสหคตัง ทิฏฐิคตสัมปยุตตัง สสังขาริกัง';
          } else if (!hasDitthi && !isPrompted) {
            cittaType = 'โลภมูลจิต อุเบกขาสหคตัง ทิฏฐิคตวิปปยุตตัง อสังขาริกัง';
          } else {
            cittaType = 'โลภมูลจิต อุเบกขาสหคตัง ทิฏฐิคตวิปปยุตตัง สสังขาริกัง';
          }
        }
        hetu = hasDitthi ? ['โลภะ', 'โมหะ'] : ['โลภะ', 'โมหะ'];
        break;
      }

      case 'patigha': {
        // Dosa-mūla citta
        const dosaPrompted = Math.random() > 0.7;
        cittaType = dosaPrompted
          ? 'โทสมูลจิต โทมนัสสสหคตัง ปฏิฆสัมปยุตตัง สสังขาริกัง'
          : 'โทสมูลจิต โทมนัสสสหคตัง ปฏิฆสัมปยุตตัง อสังขาริกัง';
        hetu = ['โทสะ', 'โมหะ'];
        vedana = 'โทมนัส';
        break;
      }

      case 'vicikiccha':
        // Moha-mūla citta (doubt)
        cittaType = 'โมหมูลจิต อุเบกขาสหคตัง วิจิกิจฉาสัมปยุตตัง';
        hetu = ['โมหะ'];
        vedana = 'อุเบกขา';
        break;

      case 'avijja':
      default:
        // Moha-mūla citta (restlessness)
        cittaType = 'โมหมูลจิต อุเบกขาสหคตัง อุทธัจจสัมปยุตตัง';
        hetu = ['โมหะ'];
        vedana = 'อุเบกขา';
        break;
    }

    return {
      citta_type: cittaType,
      quality: 'akusala',
      hetu,
      vedana,
      cetana_strength: Math.min(strength, 100),
      reasoning,
    };
  }
}

// ========================================================================
// CHITTA VITHI GENERATOR - Mind-Door Process Simulator
// ========================================================================

/**
 * ChittaVithi_Generator simulates the complete mind-door process
 *
 * Process:
 * 1. Manodvārāvajjana (Mind-door adverting) - 1 moment
 * 2. Javana (Impulsion) - 7 moments (this is where kusala/akusala arises)
 * 3. Tadārammaṇa (Retention) - 2 moments
 */
export class ChittaVithiGenerator {
  static generate(input: SensoryInput, character: Character): VithiProcess {
    // Step 1: Mind-door adverting (neutral functional citta)
    const manodvaravajjana: CittaMoment = {
      type: 'มโนทวาราวัชชนจิต',
      vedana: 'อุเบกขา',
      cetasika: {
        phassa: true,
        vedana: true,
        sanna: true,
        cetana: true,
        ekaggata: true,
        jivitindriya: true,
        manasikara: true,
      },
      arammana: input.object,
      intensity: input.intensity,
      timestamp: new Date().toISOString(),
    };

    // Step 2: Javana moments (7 repetitions of the same citta)
    const javanaDecision = JavanaDecisionEngine.decide(input, character);
    const javanaCittas: CittaMoment[] = [];

    for (let i = 0; i < 7; i++) {
      javanaCittas.push({
        type: javanaDecision.citta_type,
        vedana: javanaDecision.vedana,
        hetu: javanaDecision.hetu,
        cetasika: this.getCetasikaForCitta(javanaDecision),
        arammana: input.object,
        intensity: javanaDecision.cetana_strength,
        timestamp: new Date().toISOString(),
      });
    }

    // Step 3: Tadārammaṇa (registration/retention) - 2 moments
    const tadarammanaCittas: CittaMoment[] = [
      {
        type:
          javanaDecision.quality === 'kusala'
            ? 'มหาวิบากจิต อุเบกขาสหคตัง ญาณสัมปยุตตัง อสังขาริกัง'
            : 'จักขุวิญญาณ อกุศลวิบาก',
        vedana: 'อุเบกขา',
        cetasika: {
          phassa: true,
          vedana: true,
          sanna: true,
          cetana: true,
          ekaggata: true,
          jivitindriya: true,
          manasikara: true,
        },
        arammana: input.object,
        intensity: input.intensity * 0.5,
        timestamp: new Date().toISOString(),
      },
      {
        type:
          javanaDecision.quality === 'kusala'
            ? 'มหาวิบากจิต อุเบกขาสหคตัง ญาณสัมปยุตตัง อสังขาริกัง'
            : 'จักขุวิญญาณ อกุศลวิบาก',
        vedana: 'อุเบกขา',
        cetasika: {
          phassa: true,
          vedana: true,
          sanna: true,
          cetana: true,
          ekaggata: true,
          jivitindriya: true,
          manasikara: true,
        },
        arammana: input.object,
        intensity: input.intensity * 0.3,
        timestamp: new Date().toISOString(),
      },
    ];

    // Step 4: Create kamma if javana was kusala or akusala
    let kammaCreated: VithiProcess['kamma_created'];
    if (javanaDecision.quality === 'kusala' || javanaDecision.quality === 'akusala') {
      kammaCreated = {
        type: input.senseDoor === 'mind' ? 'มโนกรรม' : 'วจีกรรม',
        quality: javanaDecision.quality === 'kusala' ? 'กุศล' : 'อกุศล',
        intensity: javanaDecision.cetana_strength,
      };
    }

    return {
      input,
      manodvaravajjana,
      javana_cittas: javanaCittas,
      tadarammana_cittas: tadarammanaCittas,
      kamma_created: kammaCreated,
    };
  }

  /**
   * Get appropriate Cetasika set for citta type
   */
  private static getCetasikaForCitta(
    javana: JavanaResult
  ): Partial<import('../types/cittaTypes').CetasikaSet> {
    const base = {
      phassa: true,
      vedana: true,
      sanna: true,
      cetana: true,
      ekaggata: true,
      jivitindriya: true,
      manasikara: true,
    };

    if (javana.quality === 'kusala') {
      return {
        ...base,
        saddha: true,
        sati: true,
        hiri: true,
        ottappa: true,
        alobha: true,
        adosa: true,
        vitakka: true,
        vicara: true,
        viriya: true,
        piti: javana.vedana === 'โสมนัส',
      };
    } else if (javana.quality === 'akusala') {
      const akusala = {
        ...base,
        moha: true,
        ahirika: true,
        anottappa: true,
        uddhacca: true,
      };

      if (javana.hetu.includes('โลภะ')) {
        return { ...akusala, lobha: true };
      } else if (javana.hetu.includes('โทสะ')) {
        return { ...akusala, dosa: true };
      } else {
        return akusala;
      }
    }

    return base;
  }
}

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

/**
 * Process a scene action and generate mind moments
 */
export function processSceneAction(
  action: string,
  character: Character
): {
  vithiProcess: VithiProcess;
  javanaResult: JavanaResult;
  kammaCreated?: { type: string; quality: 'กุศล' | 'อกุศล'; intensity: number };
} {
  // Analyze action to create sensory input
  const input = analyzAction(action);

  // Generate vithi process
  const vithiProcess = ChittaVithiGenerator.generate(input, character);

  // Extract javana result
  const javanaResult = {
    citta_type: vithiProcess.javana_cittas[0].type,
    quality: vithiProcess.javana_cittas[0].type.includes('กุศล')
      ? ('kusala' as const)
      : vithiProcess.javana_cittas[0].type.includes('อกุศล')
        ? ('akusala' as const)
        : vithiProcess.javana_cittas[0].type.includes('วิบาก')
          ? ('vipaka' as const)
          : ('kiriya' as const),
    hetu: vithiProcess.javana_cittas[0].hetu || [],
    vedana: vithiProcess.javana_cittas[0].vedana,
    cetana_strength: vithiProcess.javana_cittas[0].intensity,
    reasoning: `Mind process generated for action: "${action}"`,
  };

  return {
    vithiProcess,
    javanaResult,
    kammaCreated: vithiProcess.kamma_created,
  };
}

/**
 * Analyze action text to create sensory input
 */
function analyzAction(action: string): SensoryInput {
  const lowerAction = action.toLowerCase();

  // Detect pleasant actions
  if (
    lowerAction.includes('smile') ||
    lowerAction.includes('laugh') ||
    lowerAction.includes('love') ||
    lowerAction.includes('happy') ||
    lowerAction.includes('ยิ้ม') ||
    lowerAction.includes('รัก') ||
    lowerAction.includes('มีความสุข')
  ) {
    return {
      type: 'pleasant',
      object: action,
      intensity: 70,
      senseDoor: 'mind',
    };
  }

  // Detect unpleasant actions
  if (
    lowerAction.includes('angry') ||
    lowerAction.includes('hate') ||
    lowerAction.includes('hurt') ||
    lowerAction.includes('sad') ||
    lowerAction.includes('โกรธ') ||
    lowerAction.includes('เกลียด') ||
    lowerAction.includes('เจ็บปวด')
  ) {
    return {
      type: 'unpleasant',
      object: action,
      intensity: 70,
      senseDoor: 'mind',
    };
  }

  // Default neutral
  return {
    type: 'neutral',
    object: action,
    intensity: 50,
    senseDoor: 'mind',
  };
}


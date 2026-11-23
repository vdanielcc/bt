import { Injectable } from '@angular/core';
import {
  KataScoringConfiguration,
  ScoreboardRuleSet
} from '../models/scoreboard.models';

@Injectable({ providedIn: 'root' })
export class ScoreboardRuleService {
  calculateKata(scores: number[], config: KataScoringConfiguration): number {
    const sorted = [...scores].filter(Number.isFinite).sort((a, b) => a - b);
    const kept = sorted.slice(
      Number(config.dropLowest ?? 0),
      sorted.length - Number(config.dropHighest ?? 0) || undefined
    );
    const strategy = String(config.strategy ?? 'SUM').toUpperCase();
    const base =
      strategy === 'AVERAGE'
        ? kept.reduce((a, b) => a + b, 0) / Math.max(kept.length, 1)
        : kept.reduce((a, b) => a + b, 0);
    const precision = Number(config.precision ?? 2);
    return Number((base * Number(config.multiplier ?? 1)).toFixed(precision));
  }
  validate(ruleSet: ScoreboardRuleSet): string[] {
    const errors: string[] = [];
    if (!ruleSet?.id || !ruleSet.associationCode)
      errors.push('RuleSet incompleto');
    if (
      ruleSet.modality === 'KUMITE' &&
      !ruleSet.configuration.scoring?.availableScores?.length
    )
      errors.push('No hay puntajes configurados');
    if (ruleSet.modality === 'KATA' && !ruleSet.configuration.kata?.judgeCount)
      errors.push('No hay jueces configurados');
    return errors;
  }
}

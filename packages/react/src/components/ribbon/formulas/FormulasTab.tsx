/**
 * FormulasTab.tsx
 *
 * Formulas Tab - Main Component
 * Assembles all Formulas groups: Function Library, Defined Names, Formula Auditing, Calculation
 */

import React from 'react';
import { FunctionLibraryGroup } from './FunctionLibraryGroup';
import { DefinedNamesGroup } from './DefinedNamesGroup';
import { FormulaAuditingGroup } from './FormulaAuditingGroup';
import { CalculationGroup } from './CalculationGroup';
import '../ribbon.css';

export interface FormulasTabProps {
  // Function Library
  onInsertFunction?: () => void;
  onAutoSum?: (type: 'sum' | 'average' | 'count' | 'max' | 'min' | 'more') => void;
  onSelectFunction?: (category: string, functionName: string) => void;

  // Defined Names
  onNameManager?: () => void;
  onDefineName?: () => void;
  onApplyNames?: () => void;
  onUseInFormula?: (name: string) => void;
  onCreateFromSelection?: () => void;
  definedNames?: string[];

  // Formula Auditing
  onTracePrecedents?: () => void;
  onTraceDependents?: () => void;
  onRemoveArrows?: (type: 'precedents' | 'dependents' | 'all') => void;
  onShowFormulas?: (show: boolean) => void;
  onErrorChecking?: () => void;
  onTraceError?: () => void;
  onCircularReferences?: () => void;
  onEvaluateFormula?: () => void;
  onWatchWindow?: () => void;
  showFormulas?: boolean;

  // Calculation
  onCalculationModeChange?: (mode: 'automatic' | 'automaticExceptTables' | 'manual') => void;
  onCalculateNow?: () => void;
  onCalculateSheet?: () => void;
  calculationMode?: 'automatic' | 'automaticExceptTables' | 'manual';
}

export const FormulasTab: React.FC<FormulasTabProps> = (props) => {
  return (
    <div className="ribbon-content ribbon-tab-content">
      {/* Function Library Group */}
      <FunctionLibraryGroup
        onInsertFunction={props.onInsertFunction}
        onAutoSum={props.onAutoSum}
        onSelectFunction={props.onSelectFunction}
      />

      <div className="ribbon-tab-divider" />

      {/* Defined Names Group */}
      <DefinedNamesGroup
        onNameManager={props.onNameManager}
        onDefineName={props.onDefineName}
        onApplyNames={props.onApplyNames}
        onUseInFormula={props.onUseInFormula}
        onCreateFromSelection={props.onCreateFromSelection}
        definedNames={props.definedNames}
      />

      <div className="ribbon-tab-divider" />

      {/* Formula Auditing Group */}
      <FormulaAuditingGroup
        onTracePrecedents={props.onTracePrecedents}
        onTraceDependents={props.onTraceDependents}
        onRemoveArrows={props.onRemoveArrows}
        onShowFormulas={props.onShowFormulas}
        onErrorChecking={props.onErrorChecking}
        onTraceError={props.onTraceError}
        onCircularReferences={props.onCircularReferences}
        onEvaluateFormula={props.onEvaluateFormula}
        onWatchWindow={props.onWatchWindow}
        showFormulas={props.showFormulas}
      />

      <div className="ribbon-tab-divider" />

      {/* Calculation Group */}
      <CalculationGroup
        onCalculationModeChange={props.onCalculationModeChange}
        onCalculateNow={props.onCalculateNow}
        onCalculateSheet={props.onCalculateSheet}
        calculationMode={props.calculationMode}
      />
    </div>
  );
};

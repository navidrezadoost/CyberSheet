import React from 'react';
import type { DrawingLayer } from '@cyber-sheet/core';
import { HomeTab } from './HomeTab';
import { InsertTab } from './insert/InsertTab';
import { PageLayoutTab } from './pagelayout/PageLayoutTab';
import { FormulasTab } from './formulas/FormulasTab';
import { DataTab } from './data/DataTab';
import { ReviewTab } from './review/ReviewTab';
import { ViewTab } from './view/ViewTab';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import './ribbon.css';

export interface RibbonProps {
 commandManager: any;
  selection: any;
  activeTab?: string;
  drawingLayer?: DrawingLayer;
  workbook?: any;
}

/**
 * Ribbon - Main Ribbon content container
 * 
 * Renders the active tab content based on the activeTab prop.
 * Currently implements Home, Insert, Page Layout, and Formulas tabs.
 * Future tabs: Data, Review, View
 * 
 * ⚠️ CRITICAL: This component sets up the global keyboard shortcut system
 * Only ONE instance should exist per application
 * 
 * @example
 * <Ribbon 
 *   commandManager={workbook.commandManager} 
 *   selection={getCurrentSelection()}
 *   activeTab="Home"
 *   drawingLayer={drawingLayer}
 * />
 */
export const Ribbon: React.FC<RibbonProps> = ({ 
  commandManager, 
  selection, 
  activeTab = 'Home',
  drawingLayer,
  workbook,
}) => {
  // Set up global keyboard shortcuts (single entry point)
  useKeyboardShortcuts({
    commandManager,
    selection,
    registerStandardShortcuts: true,
    enabled: true,
  });

  return (
    <div className="ribbon">
      {/* Active Tab Content */}
      {activeTab === 'Home' && (
        <HomeTab commandManager={commandManager} selection={selection} />
      )}
      
      {activeTab === 'Insert' && (
        <InsertTab 
          drawingLayer={drawingLayer}
          onInsertTable={() => console.log('Insert table')}
          onInsertPivotTable={() => console.log('Insert pivot table')}
          onInsertPicture={() => console.log('Insert picture')}
          onInsertShape={(type) => console.log('Insert shape:', type)}
          onInsertIcon={() => console.log('Insert icon')}
          onInsertControl={(type) => console.log('Insert control:', type)}
          onInsertTextBox={() => console.log('Insert text box')}
          onInsertHeaderFooter={() => console.log('Insert header/footer')}
          onInsertWordArt={() => console.log('Insert WordArt')}
          onInsertChart={(type) => console.log('Insert chart:', type)}
          onInsertSparkline={(type) => console.log('Insert sparkline:', type)}
          onInsertHyperlink={() => console.log('Insert hyperlink')}
          onInsertEquation={() => console.log('Insert equation')}
          onInsertSymbol={() => console.log('Insert symbol')}
        />
      )}
      
      {activeTab === 'Page Layout' && (
        <PageLayoutTab 
          onThemeChange={(theme) => console.log('Theme changed:', theme)}
          onColorThemeChange={(colors) => console.log('Color theme changed:', colors)}
          onFontThemeChange={(fonts) => console.log('Font theme changed:', fonts)}
          onMarginChange={(margins) => console.log('Margins changed:', margins)}
          onOrientationChange={(orientation) => console.log('Orientation changed:', orientation)}
          onSizeChange={(size) => console.log('Paper size changed:', size)}
          onPageBreak={(action) => console.log('Page break action:', action)}
          onFitToPage={(options) => console.log('Fit to page:', options)}
          onPageSetupDialog={() => console.log('Open page setup dialog')}
        />
      )}
      
      {activeTab === 'Formulas' && (
        <FormulasTab 
          onInsertFunction={() => console.log('Insert function')}
          onAutoSum={(type) => console.log('AutoSum:', type)}
          onSelectFunction={(category, fn) => console.log('Function:', category, fn)}
          onNameManager={() => console.log('Name manager')}
          onDefineName={() => console.log('Define name')}
          onApplyNames={() => console.log('Apply names')}
          onUseInFormula={(name) => console.log('Use in formula:', name)}
          onCreateFromSelection={() => console.log('Create from selection')}
          onTracePrecedents={() => console.log('Trace precedents')}
          onTraceDependents={() => console.log('Trace dependents')}
          onRemoveArrows={(type) => console.log('Remove arrows:', type)}
          onShowFormulas={(show) => console.log('Show formulas:', show)}
          onErrorChecking={() => console.log('Error checking')}
          onTraceError={() => console.log('Trace error')}
          onCircularReferences={() => console.log('Circular references')}
          onEvaluateFormula={() => console.log('Evaluate formula')}
          onWatchWindow={() => console.log('Watch window')}
          onCalculationModeChange={(mode) => console.log('Calculation mode:', mode)}
          onCalculateNow={() => console.log('Calculate now (F9)')}
          onCalculateSheet={() => console.log('Calculate sheet (Shift+F9)')}
          calculationMode="automatic"
          definedNames={[]}
          showFormulas={false}
        />
      )}
      
      {activeTab === 'Data' && workbook && (
        <DataTab 
          workbook={workbook}
          selectedCells={selection ? [selection.start] : []}
          onCommand={(cmd) => console.log('Data command:', cmd)}
        />
      )}
      
      {activeTab === 'Review' && workbook && (
        <ReviewTab 
          workbook={workbook}
          selectedCells={selection ? [selection.start] : []}
          onCommand={(cmd) => console.log('Review command:', cmd)}
        />
      )}
      
      {activeTab === 'View' && workbook && (
        <ViewTab 
          workbook={workbook}
          selectedCells={selection ? [selection.start] : []}
          currentView="normal"
          currentZoom={100}
          showRuler={false}
          showGridlines={true}
          showFormulaBar={true}
          showHeadings={true}
          onViewChange={(view) => console.log('View changed:', view)}
          onZoomChange={(zoom) => console.log('Zoom changed:', zoom)}
          onToggleShow={(opt, val) => console.log('Toggle show:', opt, val)}
          onZoomToSelection={() => console.log('Zoom to selection')}
          onCustomViews={() => console.log('Custom views')}
          onCommand={(cmd) => console.log('View command:', cmd)}
        />
      )}
    </div>
  );
};
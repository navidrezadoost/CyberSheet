/**
 * VersionManager.ts
 * 
 * Strict semver compliance with deprecation warnings and migration detection
 */

export const VERSION = '1.0.0';

export interface DeprecationWarning {
  feature: string;
  since: string;
  removedIn: string;
  replacement?: string;
  message: string;
}

export interface MigrationGuide {
  fromVersion: string;
  toVersion: string;
  breaking: boolean;
  changes: {
    type: 'renamed' | 'removed' | 'changed' | 'added';
    api: string;
    before?: string;
    after?: string;
    migration: string;
  }[];
}

export class VersionManager {
  private static deprecations = new Map<string, DeprecationWarning>();
  private static migrations: MigrationGuide[] = [];
  private static warnedFeatures = new Set<string>();

  /**
   * Register a deprecation warning
   */
  static deprecate(warning: DeprecationWarning): void {
    this.deprecations.set(warning.feature, warning);
  }

  /**
   * Register a migration guide
   */
  static registerMigration(guide: MigrationGuide): void {
    this.migrations.push(guide);
  }

  /**
   * Warn about deprecated feature usage (only once per session)
   */
  static warnDeprecated(feature: string): void {
    if (this.warnedFeatures.has(feature)) return;
    
    const warning = this.deprecations.get(feature);
    if (!warning) return;

    this.warnedFeatures.add(feature);

    const message = [
      `⚠️ [Cyber Sheet] Deprecation Warning:`,
      `  Feature: ${warning.feature}`,
      `  Deprecated since: v${warning.since}`,
      `  Will be removed in: v${warning.removedIn}`,
      warning.replacement ? `  Use instead: ${warning.replacement}` : '',
      `  ${warning.message}`,
      `  See migration guide: https://cyber-sheet.dev/migrations/${warning.since}`
    ].filter(Boolean).join('\n');

    console.warn(message);
  }

  /**
   * Get migration path between versions
   */
  static getMigrationPath(fromVersion: string, toVersion: string): MigrationGuide[] {
    const path: MigrationGuide[] = [];
    
    for (const migration of this.migrations) {
      if (this.isVersionBetween(migration.fromVersion, fromVersion, toVersion)) {
        path.push(migration);
      }
    }
    
    return path.sort((a, b) => this.compareVersions(a.fromVersion, b.fromVersion));
  }

  /**
   * Check if current usage has any deprecations
   */
  static checkCompatibility(currentVersion: string): {
    compatible: boolean;
    warnings: DeprecationWarning[];
    migrations: MigrationGuide[];
  } {
    const warnings: DeprecationWarning[] = [];
    const migrations: MigrationGuide[] = [];

    // Check if any deprecated features will be removed
    for (const warning of this.deprecations.values()) {
      if (this.compareVersions(currentVersion, warning.removedIn) >= 0) {
        warnings.push(warning);
      }
    }

    // Get migration path
    migrations.push(...this.getMigrationPath('0.0.0', currentVersion));

    return {
      compatible: warnings.length === 0,
      warnings,
      migrations
    };
  }

  /**
   * Compare two semantic versions
   */
  private static compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const diff = (parts1[i] || 0) - (parts2[i] || 0);
      if (diff !== 0) return diff;
    }

    return 0;
  }

  /**
   * Check if version is between two versions
   */
  private static isVersionBetween(version: string, min: string, max: string): boolean {
    return this.compareVersions(version, min) >= 0 && this.compareVersions(version, max) <= 0;
  }

  /**
   * Parse version string
   */
  static parseVersion(version: string): { major: number; minor: number; patch: number } {
    const [major, minor, patch] = version.split('.').map(Number);
    return { major, minor, patch };
  }

  /**
   * Check if breaking change
   */
  static isBreakingChange(fromVersion: string, toVersion: string): boolean {
    const from = this.parseVersion(fromVersion);
    const to = this.parseVersion(toVersion);
    return to.major > from.major;
  }
}

// ============================================================================
// Register Known Deprecations (Examples)
// ============================================================================

// Example: Deprecated in 0.9.0, removed in 2.0.0
VersionManager.deprecate({
  feature: 'Worksheet.getCellByAddress',
  since: '0.9.0',
  removedIn: '2.0.0',
  replacement: 'Worksheet.getCell',
  message: 'Use getCell(address) instead of getCellByAddress(row, col)'
});

// ============================================================================
// Register Migration Guides
// ============================================================================

VersionManager.registerMigration({
  fromVersion: '0.9.0',
  toVersion: '1.0.0',
  breaking: true,
  changes: [
    {
      type: 'renamed',
      api: 'getCellByAddress',
      before: 'worksheet.getCellByAddress(row, col)',
      after: 'worksheet.getCell({ row, col })',
      migration: 'Replace all getCellByAddress calls with getCell using Address object'
    },
    {
      type: 'changed',
      api: 'setCellValue',
      before: 'worksheet.setCellValue(row, col, value)',
      after: 'worksheet.setCellValue({ row, col }, value)',
      migration: 'Update setCellValue signature to accept Address object as first parameter'
    },
    {
      type: 'added',
      api: 'FormulaEngine',
      after: 'new FormulaEngine()',
      migration: 'New formula engine available for Excel-like calculations'
    }
  ]
});

VersionManager.registerMigration({
  fromVersion: '1.0.0',
  toVersion: '1.1.0',
  breaking: false,
  changes: [
    {
      type: 'added',
      api: 'CollaborationEngine',
      after: 'new CollaborationEngine(worksheet)',
      migration: 'New collaboration features available - fully backward compatible'
    },
    {
      type: 'added',
      api: 'PivotEngine',
      after: 'new PivotEngine(worksheet)',
      migration: 'Pivot table support added - no migration needed'
    }
  ]
});

// ============================================================================
// API Stability Guarantees
// ============================================================================

export const API_STABILITY = {
  // Stable APIs (guaranteed no breaking changes in minor versions)
  stable: [
    'Worksheet.getCell',
    'Worksheet.setCellValue',
    'Worksheet.rowCount',
    'Worksheet.columnCount',
    'FormulaEngine.evaluate',
    'CanvasRenderer.render',
    'AccessibilityManager',
    'I18nManager',
    'VirtualizationManager'
  ],
  
  // Experimental APIs (may change in minor versions with deprecation warnings)
  experimental: [
    'CollaborationEngine.vectorClock',
    'PivotEngine.buildDimensions',
    'ChartEngine.renderGrid'
  ],
  
  // Internal APIs (subject to change without notice)
  internal: [
    'CanvasRenderer._renderCell',
    'VirtualizationManager._findRowAtOffset',
    'FormulaEngine._evaluateExpression'
  ]
};

// ============================================================================
// Version Compatibility Matrix
// ============================================================================

export const COMPATIBILITY_MATRIX = {
  '1.0.0': {
    node: '>=14.0.0',
    browsers: {
      chrome: '>=90',
      firefox: '>=88',
      safari: '>=14',
      edge: '>=90'
    },
    typescript: '>=4.5.0'
  },
  '1.1.0': {
    node: '>=14.0.0',
    browsers: {
      chrome: '>=90',
      firefox: '>=88',
      safari: '>=14',
      edge: '>=90'
    },
    typescript: '>=4.5.0'
  }
};

// ============================================================================
// Backward Compatibility Helpers
// ============================================================================

export class BackwardCompatibility {
  /**
   * Create a deprecated function wrapper
   */
  static deprecatedFunction<T extends (...args: any[]) => any>(
    feature: string,
    newFunction: T,
    transform?: (args: Parameters<T>) => Parameters<T>
  ): T {
    return ((...args: Parameters<T>) => {
      VersionManager.warnDeprecated(feature);
      const transformedArgs = transform ? transform(args) : args;
      return newFunction(...transformedArgs);
    }) as T;
  }

  /**
   * Create a deprecated property wrapper
   */
  static deprecatedProperty<T extends object, K extends keyof T>(
    obj: T,
    oldKey: string,
    newKey: K,
    feature: string
  ): void {
    Object.defineProperty(obj, oldKey, {
      get() {
        VersionManager.warnDeprecated(feature);
        return obj[newKey];
      },
      set(value: T[K]) {
        VersionManager.warnDeprecated(feature);
        obj[newKey] = value;
      },
      enumerable: false,
      configurable: true
    });
  }
}

// ============================================================================
// Changelog Generator
// ============================================================================

export class ChangelogGenerator {
  /**
   * Generate changelog between versions
   */
  static generate(fromVersion: string, toVersion: string): string {
    const migrations = VersionManager.getMigrationPath(fromVersion, toVersion);
    
    let changelog = `# Changelog: v${fromVersion} → v${toVersion}\n\n`;
    
    for (const migration of migrations) {
      const isBreaking = migration.breaking ? '⚠️ BREAKING' : '✨ New';
      changelog += `## ${isBreaking}: v${migration.toVersion}\n\n`;
      
      const grouped = this.groupChangesByType(migration.changes);
      
      for (const [type, changes] of Object.entries(grouped)) {
        if (changes.length === 0) continue;
        
        changelog += `### ${this.getTypeLabel(type)}\n\n`;
        
        for (const change of changes) {
          changelog += `- **${change.api}**\n`;
          if (change.before) changelog += `  - Before: \`${change.before}\`\n`;
          if (change.after) changelog += `  - After: \`${change.after}\`\n`;
          changelog += `  - Migration: ${change.migration}\n\n`;
        }
      }
    }
    
    return changelog;
  }

  private static groupChangesByType(changes: MigrationGuide['changes']): Record<string, typeof changes> {
    return changes.reduce((acc, change) => {
      if (!acc[change.type]) acc[change.type] = [];
      acc[change.type].push(change);
      return acc;
    }, {} as Record<string, typeof changes>);
  }

  private static getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      added: '✅ Added',
      changed: '🔄 Changed',
      renamed: '📝 Renamed',
      removed: '🗑️ Removed'
    };
    return labels[type] || type;
  }
}

import type { CommandManager, Command } from '@cyber-sheet/core';
import type { CyberSheetAppConfig } from './appConfig';
import { canExecuteCommand, canUndoRedo } from './commandPermissions';

export function createGuardedCommandManager(
  base: CommandManager,
  config: CyberSheetAppConfig,
): CommandManager {
  return {
    execute(command: Command) {
      if (!canExecuteCommand(config, command)) return;
      base.execute(command);
    },
    undo() {
      if (!canUndoRedo(config)) return false;
      return base.undo();
    },
    redo() {
      if (!canUndoRedo(config)) return false;
      return base.redo();
    },
    canUndo: () => canUndoRedo(config) && base.canUndo(),
    canRedo: () => canUndoRedo(config) && base.canRedo(),
    subscribe: (listener: () => void) => base.subscribe(listener),
    clear: () => base.clear(),
    getHistorySize: () => base.getHistorySize(),
    getUndoHistory: () => base.getUndoHistory(),
    setEventBus: (eventBus) => base.setEventBus?.(eventBus),
  } as CommandManager;
}

/**
 * CollaborationEngine.ts
 * 
 * Zero-dependency CRDT-based collaborative editing system
 * Inspired by Yjs but optimized for spreadsheets with no external dependencies
 */

import type { Address, CellValue } from './types';
import type { Worksheet } from './worksheet';

export type OperationType = 'set' | 'delete' | 'style' | 'insert-row' | 'delete-row' | 'insert-col' | 'delete-col';

export interface Operation {
  id: string;
  clientId: string;
  timestamp: number;
  type: OperationType;
  address?: Address;
  value?: CellValue;
  data?: unknown;
  // Vector clock for causal ordering
  vectorClock: Map<string, number>;
}

export interface ClientPresence {
  clientId: string;
  username: string;
  color: string;
  cursor?: Address;
  selection?: { start: Address; end: Address };
  lastSeen: number;
}

export interface CollaborationOptions {
  clientId?: string;
  username?: string;
  color?: string;
  syncInterval?: number;
  presenceTimeout?: number;
}

/**
 * CRDT-based collaboration engine
 */
export class CollaborationEngine {
  private clientId: string;
  private username: string;
  private color: string;
  private worksheet: Worksheet;
  
  // Operation log for CRDT
  private operations: Operation[] = [];
  private vectorClock = new Map<string, number>();
  
  // Client presence tracking
  private clients = new Map<string, ClientPresence>();
  private presenceTimeout: number;
  
  // WebSocket connection (optional)
  private ws: WebSocket | null = null;
  private syncInterval: number;
  private syncTimer: number | null = null;
  
  // Event handlers
  private onOperation?: (op: Operation) => void;
  private onPresence?: (presence: ClientPresence[]) => void;
  private onSync?: (ops: Operation[]) => void;

  constructor(worksheet: Worksheet, options: CollaborationOptions = {}) {
    this.worksheet = worksheet;
    this.clientId = options.clientId ?? this.generateClientId();
    this.username = options.username ?? `User-${this.clientId.slice(0, 6)}`;
    this.color = options.color ?? this.generateColor();
    this.syncInterval = options.syncInterval ?? 1000;
    this.presenceTimeout = options.presenceTimeout ?? 30000;
    
    // Add self to clients
    this.updatePresence({
      clientId: this.clientId,
      username: this.username,
      color: this.color,
      lastSeen: Date.now()
    });
    
    // Start presence cleanup
    this.startPresenceCleanup();
  }

  /**
   * Connect to collaboration server
   */
  connect(url: string): void {
    this.ws = new WebSocket(url);
    
    this.ws.onopen = () => {
      console.log('[Collaboration] Connected to server');
      // Send initial sync request
      this.sendMessage({
        type: 'sync-request',
        vectorClock: Object.fromEntries(this.vectorClock)
      });
    };
    
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('[Collaboration] Failed to parse message:', error);
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('[Collaboration] WebSocket error:', error);
    };
    
    this.ws.onclose = () => {
      console.log('[Collaboration] Disconnected from server');
      // Auto-reconnect after 5 seconds
      setTimeout(() => this.connect(url), 5000);
    };
    
    // Start periodic sync
    this.startSync();
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Apply local operation and broadcast
   */
  applyOperation(type: OperationType, data: Partial<Operation>): void {
    // Increment local vector clock
    const currentClock = this.vectorClock.get(this.clientId) ?? 0;
    this.vectorClock.set(this.clientId, currentClock + 1);
    
    // Create operation
    const op: Operation = {
      id: this.generateOperationId(),
      clientId: this.clientId,
      timestamp: Date.now(),
      type,
      vectorClock: new Map(this.vectorClock),
      ...data
    };
    
    // Add to operation log
    this.operations.push(op);
    
    // Apply to worksheet
    this.executeOperation(op);
    
    // Broadcast to other clients
    this.broadcast(op);
    
    // Trigger callback
    this.onOperation?.(op);
  }

  /**
   * Execute an operation on the worksheet
   */
  private executeOperation(op: Operation): void {
    switch (op.type) {
      case 'set':
        if (op.address && op.value !== undefined) {
          this.worksheet.setCellValue(op.address, op.value);
        }
        break;
        
      case 'delete':
        if (op.address) {
          this.worksheet.setCellValue(op.address, null);
        }
        break;
        
      case 'style':
        if (op.address && op.data) {
          const cell = this.worksheet.getCell(op.address);
          if (cell) {
            cell.style = { ...cell.style, ...(op.data as object) };
          }
        }
        break;
        
      case 'insert-row':
        // TODO: Implement row insertion
        break;
        
      case 'delete-row':
        // TODO: Implement row deletion
        break;
        
      case 'insert-col':
        // TODO: Implement column insertion
        break;
        
      case 'delete-col':
        // TODO: Implement column deletion
        break;
    }
  }

  /**
   * Handle incoming message from server
   */
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'operation':
        this.handleRemoteOperation(message.operation);
        break;
        
      case 'sync-response':
        this.handleSyncResponse(message.operations);
        break;
        
      case 'presence':
        this.handlePresenceUpdate(message.presence);
        break;
        
      case 'batch':
        message.operations.forEach((op: Operation) => {
          this.handleRemoteOperation(op);
        });
        break;
    }
  }

  /**
   * Handle remote operation with CRDT conflict resolution
   */
  private handleRemoteOperation(op: Operation): void {
    // Check if already applied (idempotency)
    if (this.operations.some(existing => existing.id === op.id)) {
      return;
    }
    
    // Update vector clock
    const remoteVersion = op.vectorClock.get(op.clientId) ?? 0;
    const localVersion = this.vectorClock.get(op.clientId) ?? 0;
    
    if (remoteVersion > localVersion) {
      this.vectorClock.set(op.clientId, remoteVersion);
    }
    
    // Resolve conflicts using Last-Write-Wins (LWW) with timestamp
    const conflicts = this.operations.filter(local => 
      local.address?.row === op.address?.row &&
      local.address?.col === op.address?.col &&
      local.type === op.type
    );
    
    let shouldApply = true;
    
    for (const conflict of conflicts) {
      if (conflict.timestamp > op.timestamp) {
        // Local operation is newer, ignore remote
        shouldApply = false;
        break;
      } else if (conflict.timestamp === op.timestamp) {
        // Same timestamp, use clientId for deterministic resolution
        if (conflict.clientId > op.clientId) {
          shouldApply = false;
          break;
        }
      }
    }
    
    if (shouldApply) {
      // Add to operation log
      this.operations.push(op);
      
      // Apply operation
      this.executeOperation(op);
      
      // Trigger callback
      this.onOperation?.(op);
    }
  }

  /**
   * Handle sync response from server
   */
  private handleSyncResponse(operations: Operation[]): void {
    operations.forEach(op => this.handleRemoteOperation(op));
    this.onSync?.(operations);
  }

  /**
   * Update presence (cursor, selection)
   */
  updatePresence(presence: Partial<ClientPresence>): void {
    const current = this.clients.get(this.clientId) ?? {
      clientId: this.clientId,
      username: this.username,
      color: this.color,
      lastSeen: Date.now()
    };
    
    const updated: ClientPresence = {
      ...current,
      ...presence,
      lastSeen: Date.now()
    };
    
    this.clients.set(this.clientId, updated);
    
    // Broadcast presence
    this.sendMessage({
      type: 'presence',
      presence: updated
    });
  }

  /**
   * Handle presence update from other clients
   */
  private handlePresenceUpdate(presence: ClientPresence): void {
    if (presence.clientId !== this.clientId) {
      this.clients.set(presence.clientId, presence);
      this.onPresence?.(Array.from(this.clients.values()));
    }
  }

  /**
   * Get all active clients
   */
  getClients(): ClientPresence[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get client by ID
   */
  getClient(clientId: string): ClientPresence | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Send message to server
   */
  private sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast operation to other clients
   */
  private broadcast(op: Operation): void {
    this.sendMessage({
      type: 'operation',
      operation: op
    });
  }

  /**
   * Start periodic sync
   */
  private startSync(): void {
    this.syncTimer = window.setInterval(() => {
      // Send pending operations
      const pending = this.operations.slice(-10); // Last 10 ops
      
      if (pending.length > 0) {
        this.sendMessage({
          type: 'batch',
          operations: pending
        });
      }
    }, this.syncInterval);
  }

  /**
   * Start presence cleanup (remove inactive clients)
   */
  private startPresenceCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      
      for (const [clientId, presence] of this.clients.entries()) {
        if (clientId !== this.clientId && now - presence.lastSeen > this.presenceTimeout) {
          this.clients.delete(clientId);
          this.onPresence?.(Array.from(this.clients.values()));
        }
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Register operation callback
   */
  onOperationReceived(callback: (op: Operation) => void): void {
    this.onOperation = callback;
  }

  /**
   * Register presence callback
   */
  onPresenceChanged(callback: (presence: ClientPresence[]) => void): void {
    this.onPresence = callback;
  }

  /**
   * Register sync callback
   */
  onSyncCompleted(callback: (ops: Operation[]) => void): void {
    this.onSync = callback;
  }

  /**
   * Get operation history
   */
  getOperations(): Operation[] {
    return [...this.operations];
  }

  /**
   * Get vector clock
   */
  getVectorClock(): Map<string, number> {
    return new Map(this.vectorClock);
  }

  /**
   * Export state for persistence
   */
  exportState(): {
    operations: Operation[];
    vectorClock: Record<string, number>;
  } {
    return {
      operations: this.operations,
      vectorClock: Object.fromEntries(this.vectorClock)
    };
  }

  /**
   * Import state from persistence
   */
  importState(state: { operations: Operation[]; vectorClock: Record<string, number> }): void {
    this.operations = state.operations;
    this.vectorClock = new Map(Object.entries(state.vectorClock).map(([k, v]) => [k, Number(v)]));
    
    // Replay operations
    state.operations.forEach(op => this.executeOperation(op));
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `${this.clientId}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Generate random color for client
   */
  private generateColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52C41A'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.disconnect();
  }
}

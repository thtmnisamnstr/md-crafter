import { SyncStatusType } from '../types/document';

export class SyncStatus {
  private status: SyncStatusType = 'local';
  private listeners: Set<(status: SyncStatusType) => void> = new Set();

  getStatus(): SyncStatusType {
    return this.status;
  }

  setStatus(status: SyncStatusType): void {
    if (this.status !== status) {
      this.status = status;
      this.notifyListeners();
    }
  }

  subscribe(listener: (status: SyncStatusType) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.status));
  }

  isOnline(): boolean {
    return this.status !== 'offline';
  }

  isSynced(): boolean {
    return this.status === 'synced';
  }

  isSyncing(): boolean {
    return this.status === 'syncing';
  }

  hasConflict(): boolean {
    return this.status === 'conflict';
  }

  isPending(): boolean {
    return this.status === 'pending';
  }

  isLocal(): boolean {
    return this.status === 'local';
  }
}

export function getSyncStatusLabel(status: SyncStatusType): string {
  switch (status) {
    case 'synced':
      return 'Synced';
    case 'syncing':
      return 'Syncing...';
    case 'pending':
      return 'Changes pending';
    case 'conflict':
      return 'Conflict detected';
    case 'offline':
      return 'Offline';
    case 'local':
      return 'Local only';
    default:
      return 'Unknown';
  }
}

export function getSyncStatusIcon(status: SyncStatusType): string {
  switch (status) {
    case 'synced':
      return '✓';
    case 'syncing':
      return '↻';
    case 'pending':
      return '●';
    case 'conflict':
      return '⚠';
    case 'offline':
      return '○';
    case 'local':
      return '◇';
    default:
      return '?';
  }
}


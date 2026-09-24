import { create } from 'zustand';

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

interface ConnectionState {
  status: ConnectionStatus;
  lastEventAt: number | null;
  setStatus: (status: ConnectionStatus) => void;
  markEvent: () => void;
}

/** Client-only UI state: is the live stream up? (Server data lives in TanStack Query.) */
export const useConnectionStore = create<ConnectionState>()((set) => ({
  status: 'connecting',
  lastEventAt: null,
  setStatus: (status) => set({ status }),
  markEvent: () => set({ lastEventAt: Date.now() }),
}));

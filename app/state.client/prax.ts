import { AllSlices, SliceCreator } from ".";
import { produce } from "immer";
import {
  CustodyService,
  PenumbraService,
  ViewService,
  GovernanceService,
  StakeService,
} from "@penumbra-zone/protobuf";
import { PromiseClient } from "@connectrpc/connect";
import { penumbra } from '~/penumbra';

// Types
export interface PraxSlice {
  requestConnection: () => Promise<void>;
  connected: boolean;
  connectionErr: string | undefined;
  connectionLoading: boolean;
  stakeQueryClient: () => Promise<PromiseClient<typeof StakeService>>;
  govQueryClient: () => Promise<PromiseClient<typeof GovernanceService>>;
  viewClient: () => Promise<PromiseClient<typeof ViewService>>;
  custodyClient: () => Promise<PromiseClient<typeof CustodyService>>;
  checkConnectionStatus: () => boolean;
}

// Helper function to update state
const updateState = (set: Function, updates: Partial<PraxSlice>) => {
  set((state: AllSlices) =>
    produce(state, (draft) => {
      Object.assign(draft.prax, updates);
    }),
  );
};

// Create a generic client getter
const createClientGetter = <T extends PenumbraService>(
  Service: T,
  set: (state: (arg: AllSlices) => AllSlices) => void,
) => {
  return async () => {
    try {
      return penumbra.service(Service);
    } catch (e) {
      let errorMessage = `Failed to create ${Service.typeName} client`;
      if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === "string") {
        errorMessage = e;
      }
      updateState(set, {
        connectionErr: errorMessage,
        connected: false,
        connectionLoading: false,
      });
      throw e;
    }
  };
};

// Main slice creator
export const createPraxSlice: SliceCreator<PraxSlice> = (set, get) => ({
  // Initial state
  connected: Boolean(penumbra.connected),
  connectionErr: undefined,
  connectionLoading: false,

  // Client getters
  stakeQueryClient: createClientGetter(StakeService, set),
  govQueryClient: createClientGetter(GovernanceService, set),
  viewClient: createClientGetter(ViewService, set),
  custodyClient: createClientGetter(CustodyService, set),

  // Connection request handler
  requestConnection: async () => {
    updateState(set, {
      connectionLoading: true,
      connectionErr: undefined,
    });

    try {
      await penumbra.connect();

      updateState(set, {
        connected: true,
        connectionLoading: false,
        connectionErr: undefined,
      });
    } catch (error) {
      let errorMessage = "Connection failed";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }
      updateState(set, {
        connected: false,
        connectionLoading: false,
        connectionErr: errorMessage,
      });
      throw error;
    }
  },

  // Method to check current connection status
  checkConnectionStatus: () => {
    const isConnected = Boolean(penumbra.connected);
    updateState(set, {
      connected: isConnected,
      connectionErr: isConnected ? undefined : get().prax.connectionErr,
    });
    return isConnected;
  },
});

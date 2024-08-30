import { useQuery } from "@tanstack/react-query";
import { AllSlices, useStore } from "~/state.client";
import {
  Metadata,
  AssetId,
} from "@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb";

export default function useAssets() {
  const { viewClient, connected } = useStore((state: AllSlices) => state.prax);

  return useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const responses = (await viewClient())?.assets({});

      let assets: Map<AssetId, Metadata> = new Map();
      if (responses) {
        for await (const response of responses) {
          assets.set(
            response.denomMetadata?.penumbraAssetId!,
            response.denomMetadata!,
          );
        }
      }
      return assets;
    },
    enabled: connected,
  });
}

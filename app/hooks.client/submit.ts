import {
  Transaction,
  TransactionPlan,
} from "@buf/penumbra-zone_penumbra.bufbuild_es/penumbra/core/transaction/v1/transaction_pb";
import { PromiseClient } from "@connectrpc/connect";
import { ViewService } from "@penumbra-zone/protobuf";
import toast from "react-hot-toast";

export async function submitTransaction(
  view: PromiseClient<typeof ViewService>,
  plan: TransactionPlan,
  toastId: string,
) {
  const responses = view.authorizeAndBuild({ transactionPlan: plan });
  let transaction: Transaction | undefined;

  for await (const response of responses) {
    switch (response.status.case) {
      case "buildProgress": {
        const progress = Math.round(response.status.value.progress * 100);
        toast.loading(`Building transaction: ${progress}%`, { id: toastId });
        break;
      }
      case "complete": {
        toast.success("Transaction built successfully", { id: toastId });
        transaction = response.status.value.transaction;
      }
    }
  }

  if (!transaction) {
    toast.error("Failed to build transaction", { id: toastId });
    throw new Error("Failed to build transaction");
  }

  toast.loading("Broadcasting transaction...", { id: toastId });
  const broadcastResponses = view.broadcastTransaction({
    transaction,
    awaitDetection: true,
  });

  for await (const response of broadcastResponses) {
    if (response.status.case === "broadcastSuccess") {
      toast.loading(`Transaction broadcast`, {
        id: toastId,
      });
    } else if (response.status.case === "confirmed") {
      toast.success(
        `Transaction confirmed at height ${response.status.value.detectionHeight}`,
        { id: toastId },
      );
      return;
    }
  }

  // If we get here, the transaction wasn't confirmed
  toast.error("Transaction was not confirmed", { id: toastId });
  throw new Error("Transaction was not confirmed");
}

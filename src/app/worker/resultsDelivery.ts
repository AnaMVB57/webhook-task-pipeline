import { randomUUID } from "crypto";
import { Subscriber } from "../../db/schema.js";
import { createDeliveryAttempt } from "../../db/queries/deliveryAttempts/deliveryAttempts.js";

const MAX_DELIVERY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000; // 2 seconds between attempts

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Tries to deliver payload to specific URL
async function deliverOnce(
  url: string,
  payload: unknown,
): Promise<{ success: boolean; responseCode: number | null }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000), // 5 seconds timeout
    });

    return {
      success: response.ok,
      responseCode: response.status,
    };
  } catch (error) {
    // Network error, DNS failure, or timeout — no HTTP code available
    const reason =
      error instanceof Error ? error.message : "Unknown network error";
    console.error(`[Delivery] Network error delivering to ${url}: ${reason}`);
    return {
      success: false,
      responseCode: null,
    };
  }
}

// Deliver with retry to a specific subscriber
async function deliverToSubscriber(
  jobId: string,
  subscriber: Subscriber,
  payload: unknown,
): Promise<void> {
  for (let attempt = 1; attempt <= MAX_DELIVERY_ATTEMPTS; attempt++) {
    const { success, responseCode } = await deliverOnce(
      subscriber.url,
      payload,
    );

    // Record every attempt regardless of outcome
    await createDeliveryAttempt({
      id: randomUUID(),
      jobId,
      subscriberId: subscriber.id,
      status: success ? "success" : "failed",
      responseCode,
    });

    if (success) {
      console.log(`Delivered to ${subscriber.url} on attempt ${attempt}`);
      return;
    }

    console.warn(
      `[Delivery] Failed to deliver to ${subscriber.url} — attempt ${attempt}/${MAX_DELIVERY_ATTEMPTS}` +
        (responseCode ? ` (HTTP ${responseCode})` : " (no response)"),
    );

    // If it's not the last try, it waits before trying again
    if (attempt < MAX_DELIVERY_ATTEMPTS) {
      const delay = RETRY_DELAY_MS * attempt; // 2s, then 4s
      console.log(`[Delivery] Retrying in ${delay / 1000}s...`);
      await wait(RETRY_DELAY_MS * attempt); // exponential delay: 2s, then 4s
    }
  }

  console.error(
    `[Delivery] All ${MAX_DELIVERY_ATTEMPTS} attempts failed for subscriber ${subscriber.id} (${subscriber.url})`,
  );
}

export async function deliverToAllSubscribers(
  jobId: string,
  subscribers: Subscriber[],
  payload: unknown,
): Promise<void> {
  // Delivers to all job susbcribers in paralel
  await Promise.all(
    subscribers.map((subscriber) =>
      deliverToSubscriber(jobId, subscriber, payload),
    ),
  );
}

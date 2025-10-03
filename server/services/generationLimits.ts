import { GenerationLimitResult } from "server/types/generationLimitResult";
import { PageGenerationMetadata } from "server/types/pageGenerationMetadata";

export class GenerationLimitError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 429) {
    super(message);
    this.statusCode = statusCode;
  }
}

const DAILY_LIMIT = 2;
const COOLDOWN_MS = 15 * 60 * 1000;

export const evaluateGenerationLimit = (
  metadata: PageGenerationMetadata | null,
  now: Date = new Date(),
): GenerationLimitResult => {
  const currentDate = now.toISOString().slice(0, 10);

  const previousDate = metadata?.imageGenerationDate;
  const lastCount =
    previousDate === currentDate ? metadata?.imageGenerationCount ?? 0 : 0;

  if (lastCount >= DAILY_LIMIT) {
    throw new GenerationLimitError(
      `You can only generate ${DAILY_LIMIT} images for this page per day. Try again tomorrow.`,
    );
  }

  if (metadata?.lastImageGeneratedAt) {
    const lastGeneratedAt = new Date(metadata.lastImageGeneratedAt);
    const msSinceLast = now.getTime() - lastGeneratedAt.getTime();

    if (!Number.isNaN(msSinceLast) && msSinceLast < COOLDOWN_MS) {
      const minutesLeft = Math.ceil((COOLDOWN_MS - msSinceLast) / (60 * 1000));
      throw new GenerationLimitError(
        `Please wait ${minutesLeft} more minute(s) before generating another image for this page.`,
      );
    }
  }

  return {
    nextCount: lastCount + 1,
    generationDate: currentDate,
    lastGeneratedAtIso: now.toISOString(),
  };
};

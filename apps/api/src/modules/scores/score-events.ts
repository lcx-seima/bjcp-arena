export type ScoreEventName = "score.updated";

export interface ScoreEvent {
  name: ScoreEventName;
  competitionId: number;
  beerId: number;
  scoreId: number;
  occurredAt: string;
}

export interface ScoreEventHub {
  publish(event: Omit<ScoreEvent, "occurredAt">): void;
  subscribe(competitionId: number, listener: (event: ScoreEvent) => void): () => void;
}

export function createScoreEventHub(): ScoreEventHub {
  const listeners = new Map<number, Set<(event: ScoreEvent) => void>>();

  return {
    publish(event) {
      const payload: ScoreEvent = {
        ...event,
        occurredAt: new Date().toISOString(),
      };
      for (const listener of listeners.get(event.competitionId) ?? []) {
        listener(payload);
      }
    },

    subscribe(competitionId, listener) {
      const competitionListeners = listeners.get(competitionId) ?? new Set();
      competitionListeners.add(listener);
      listeners.set(competitionId, competitionListeners);

      return () => {
        competitionListeners.delete(listener);
        if (competitionListeners.size === 0) {
          listeners.delete(competitionId);
        }
      };
    },
  };
}

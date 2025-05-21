export type RevisionId = string;
export type RevisionError = string;

export interface NewRevision {
  NewRevision: RevisionId;
}

export interface RevisionErrorEvent {
  RevisionError: RevisionError;
}

export type RevisionBroadcastEvent = NewRevision | RevisionErrorEvent;

export function isNewRevision(event: RevisionBroadcastEvent): event is NewRevision {
  return "NewRevision" in event;
}

export function isRevisionError(event: RevisionBroadcastEvent): event is RevisionErrorEvent {
  return "RevisionError" in event;
}

export type RevisionId = string;
export type RevisionError = string;

export interface NewRevision {
    new_revision: RevisionId;
}

export interface RevisionErrorEvent {
    revision_error: RevisionError;
}

export type RevisionBroadcastEvent = NewRevision | RevisionErrorEvent;

export function isNewRevision(event: RevisionBroadcastEvent): event is NewRevision {
    return "new_revision" in event;
}

export function isRevisionError(event: RevisionBroadcastEvent): event is RevisionErrorEvent {
    return "revision_error" in event;
}

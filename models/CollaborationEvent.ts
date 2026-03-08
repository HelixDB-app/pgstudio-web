import { ObjectId } from "mongodb";

export const COLLABORATION_EVENTS_COLLECTION = "collaboration_events";

export interface CollaborationEventDocument {
    _id?: ObjectId;
    title: string;
    roomId: string;
    hostUserId: ObjectId;
    startsAt: Date;
    endsAt: Date;
    timezone: string;
    notes?: string;
    invitedEmails: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface CollaborationEventPublic {
    id: string;
    title: string;
    roomId: string;
    startsAt: string;
    endsAt: string;
    timezone: string;
    notes?: string;
    invitedEmails: string[];
    createdAt: string;
}

export function collaborationEventToPublic(doc: CollaborationEventDocument): CollaborationEventPublic {
    return {
        id: doc._id!.toString(),
        title: doc.title,
        roomId: doc.roomId,
        startsAt: doc.startsAt.toISOString(),
        endsAt: doc.endsAt.toISOString(),
        timezone: doc.timezone,
        notes: doc.notes,
        invitedEmails: doc.invitedEmails,
        createdAt: doc.createdAt.toISOString(),
    };
}

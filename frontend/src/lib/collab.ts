import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";

type CollabUser = {
  id: string;
  full_name: string;
  email: string;
  avatar_color: string;
};

type CreateCollabSessionParams = {
  projectId: string;
  wsUrl: string;
  token: string;
  initialPlainText: string;
  initialStateBase64?: string | null;
  user: CollabUser;
};

export type PresenceUser = {
  clientId: number;
  userId: string;
  fullName: string;
  email?: string;
  avatarColor: string;
  isEditing: boolean;
};

function base64ToUint8Array(value: string): Uint8Array {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function createCollabSession(params: CreateCollabSessionParams) {
  const doc = new Y.Doc();
  const text = doc.getText("monaco");

  if (params.initialStateBase64) {
    const update = base64ToUint8Array(params.initialStateBase64);
    Y.applyUpdate(doc, update);
  } else if (params.initialPlainText) {
    text.insert(0, params.initialPlainText);
  }

  const provider = new HocuspocusProvider({
    url: params.wsUrl,
    name: params.projectId,
    document: doc,
    token: params.token,
  });

  const awareness = provider.awareness;
  if (!awareness) {
    throw new Error("Hocuspocus awareness is not available.");
  }

  awareness.setLocalStateField("user", {
    id: params.user.id,
    email: params.user.email,
    name: params.user.full_name,
    fullName: params.user.full_name,
    color: params.user.avatar_color,
    avatarColor: params.user.avatar_color,
  });

  return {
    doc,
    text,
    provider,
    awareness,
    destroy() {
      provider.destroy();
      doc.destroy();
    },
  };
}

export function readPresenceUsers(
  awareness: NonNullable<HocuspocusProvider["awareness"]>
): PresenceUser[] {
  const states = Array.from(awareness.getStates().entries());

  const users = states.map(([clientId, state]): PresenceUser | null => {
    const user = state.user as
      | {
          id?: string;
          name?: string;
          fullName?: string;
          email?: string;
          color?: string;
          avatarColor?: string;
        }
      | undefined;

    if (!user?.id) {
      return null;
    }

    const fullName = user.fullName ?? user.name;
    const avatarColor = user.avatarColor ?? user.color;

    if (!fullName || !avatarColor) {
      return null;
    }

    return {
      clientId,
      userId: user.id,
      fullName,
      email: user.email,
      avatarColor,
      isEditing: Boolean(state.selection),
    };
  });

  return users.filter((item): item is PresenceUser => item !== null);
}
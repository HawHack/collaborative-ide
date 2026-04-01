import jwt, { JwtPayload } from "jsonwebtoken";

import { getConfig } from "./config.js";
import { assertProjectAccess } from "./db.js";

const config = getConfig();

export type AuthContext = {
  userId: string;
  email?: string;
};

export async function authenticateProjectToken(
  token: string,
  projectId: string
): Promise<AuthContext> {
  if (!token) {
    throw new Error("Missing collaboration token.");
  }

  const decoded = jwt.verify(token, config.jwtSecretKey) as JwtPayload;
  const tokenType = decoded.type;
  const userId = decoded.sub;

  if (tokenType !== "access" || typeof userId !== "string") {
    throw new Error("Invalid collaboration token.");
  }

  await assertProjectAccess(projectId, userId);

  return {
    userId,
    email: typeof decoded.email === "string" ? decoded.email : undefined,
  };
}
import "server-only";

import {betterAuth} from "better-auth";
import {admin} from "better-auth/plugins";
import {db} from "./db";

const baseURL = process.env.BETTER_AUTH_URL;
const secret = process.env.BETTER_AUTH_SECRET;

if (!baseURL || !secret) {
  throw new Error("Better Auth 환경변수가 없습니다.");
}

export const auth = betterAuth({
  appName: "UXM Qwen",
  baseURL,
  secret,

  database: db,

  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
  },

  plugins: [admin()],
});

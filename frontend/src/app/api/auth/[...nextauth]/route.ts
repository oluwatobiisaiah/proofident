import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { jwtDecode } from "jwt-decode";
import { nanoid } from "nanoid";

declare module "next-auth" {
  interface User {
    phone: string;
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
  }

  interface Session {
    accessToken?: string;
    refreshToken?: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      phone: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      phone: string;
    };
    error?: string;
  }
}

export type User = {
  id: string;
  phone: string;
  phoneVerified: boolean;

  bvn: string | null;
  bvnVerified: boolean;

  name: string | null;
  email: string | null;
  dateOfBirth: string | null;
  state: string | null;
  occupation: string | null;
  monthlyIncome: number | null;

  squadVirtualAccount: string | null;
  squadCustomerId: string | null;

  passwordHash: string | null;
  tokenVersion: number;

  createdAt: string;
  updatedAt: string;
};

type LoginResponse = {
  success: boolean;
  user: User;
  accessToken: string;
  refreshToken: string;
};

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const reqId = nanoid();
    const url = process.env.API_URL;
    const res = await fetch(`${url}/auth/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": `refresh-token-${reqId}`,
      },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    });

    const result = await res.json();
    if (!res.ok || "error" in result) throw result;
    const decoded = jwtDecode<{ exp: number }>(result.data.accessToken);

    return {
      ...token,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      accessTokenExpires: decoded.exp * 1000,
    };
    // eslint-disable-next-line
  } catch (error) {
    return {
      ...token,
      error: "RefreshAccessTokenError", // Do something about this
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        phone: { label: "Phone", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.otp) return null;
        const url = process.env.API_URL;

        const reqId = nanoid();
        console.log(credentials, "See mr", url);
        const res = await fetch(`${url}/auth/verify-otp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": `verify-otp-${reqId}`,
          },
          body: JSON.stringify({
            phone: credentials.phone.replace(/\s/g, ""),
            otp: credentials.otp,
          }),
        });

        if (!res.ok) {
          console.log("Fial here?");
          const body = await res.json().catch(() => null);
          console.log(body, "data");
          console.log(JSON.stringify(body, null, 2), "Stringified here");
          throw new Error(
            body?.error || body?.message || "Login request failed",
          );
        }
        console.log("Passed a");
        const result = (await res.json()) as LoginResponse;
        console.log("b", result);
        const { accessToken, refreshToken, user: userData } = result;
        try {
          const decoded = jwtDecode<{ exp: number }>(accessToken);
          console.log(decoded);
        } catch (err) {
          console.error("JWT decode failed", err);
        }
        // console.log("Passed decoding", new Date(decoded.exp));
        return {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          accessToken,
          refreshToken,
          accessTokenExpires: decoded.exp * 1000,
        };
      },
    }),
  ],

  session: { strategy: "jwt" },
  pages: { signIn: "/login" },

  callbacks: {
    async jwt({ user, token }) {
      if (user) {
        return {
          ...token,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          accessTokenExpires: user.accessTokenExpires,
          user: {
            id: user.id,
            name: user.name as string | null,
            email: user.email as string | null,
            phone: user.phone,
          },
        };
      }

      console.log("I ran")

      // Check if token is still valid
      if (Date.now() < token.accessTokenExpires) {
        return token;
      }

      // Refresh if expired
      const res = await refreshAccessToken(token);
      return res;
    },

    async session({ session, token }) {
      session.user = token.user;
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

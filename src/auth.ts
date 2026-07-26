import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { prisma } from "@/lib/db/prisma";

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/en/login",
    error: "/en/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) {
        return false;
      }

      const dbUser = await prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        },
        create: {
          email: user.email,
          name: user.name,
          image: user.image,
          role: "USER",
        },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
        },
      });

      user.id = dbUser.id;
      user.email = dbUser.email;
      user.name = dbUser.name ?? user.name;
      user.image = dbUser.image ?? user.image;
      user.role = dbUser.role;

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId ?? token.sub ?? "";
      if (typeof token.email === "string") {
        session.user.email = token.email;
      }
      session.user.name = token.name ?? null;
      session.user.image = token.picture ?? null;
      session.user.role = token.role ?? "USER";

      return session;
    },
  },
});

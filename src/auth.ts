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
  // NextAuth 설정은 요청마다 달라질 수 없으므로 locale을 붙이지 않는다.
  // locale 없는 `/login`은 next-intl 미들웨어가 기존 정책(NEXT_LOCALE 쿠키 → Accept-Language
  // → defaultLocale)대로 `/ko/login` 또는 `/en/login`으로 넘긴다. 쿼리(`?error=`)는 그대로 따라간다.
  pages: {
    signIn: "/login",
    error: "/login",
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

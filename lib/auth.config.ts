import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

export default {
  providers: [GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id; // sign-in এর সময় user.id কে token এ কপি করছে
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string; // token থেকে session এ কপি করছে
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
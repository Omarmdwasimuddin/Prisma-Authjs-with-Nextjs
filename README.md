## Prisma Auth.js with Next.js

### Create a new Next.js application
```powershell
npx create-next-app@latest authjs-prisma
```
---

### Install dependencies
```terminal
npm install prisma tsx @types/pg --save-dev
```
```terminal
npm install @prisma/client @prisma/adapter-pg dotenv pg
```
```terminal
npx prisma init
```
---

### Connect database
#### [See how connect prisma with neondb](https://github.com/Omarmdwasimuddin/Prisma-Connect-with-NeonDB-for-NextJS#%E0%A7%AA-neondb-database-%E0%A6%A4%E0%A7%88%E0%A6%B0%E0%A6%BF-%E0%A6%95%E0%A6%B0%E0%A7%8B)
---

### In the prisma/schema.prisma file, swap the provider to prisma-client and add the runtime nodejs to the generator:
```schema.prisma
generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma"
  runtime  = "nodejs"
}

datasource db {
  provider = "postgresql"
}
```
---

### Add the following models to the schema.prisma file, these models are provided by Auth.js:
```schema.prisma
model Account { 
  id                String  @id @default(cuid()) 
  userId            String  @map("user_id") 
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id") 
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user User @relation(fields: [userId], references: [id], onDelete: Cascade) 
  @@unique([provider, providerAccountId]) 
  @@map("accounts") 
} 
model Session { 
  id           String   @id @default(cuid()) 
  sessionToken String   @unique @map("session_token") 
  userId       String   @map("user_id") 
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade) 
  @@map("sessions") 
} 
model User { 
  id            String    @id @default(cuid()) 
  name          String?
  email         String?   @unique
  emailVerified DateTime? @map("email_verified") 
  image         String?
  accounts      Account[]
  sessions      Session[]
  @@map("users") 
} 
model VerificationToken { 
  identifier String
  token      String
  expires    DateTime
  @@unique([identifier, token]) 
  @@map("verification_tokens") 
} 
```
---

This creates the following models:

Account: Stores OAuth provider information (access tokens, refresh tokens, provider account IDs) and enables users to sign in with multiple providers while maintaining a single user record.

Session: Tracks authenticated user sessions with a unique session token, user ID, and expiration time to maintain authentication state across requests.

User: The core model storing user information (name, email, profile image). Users can have multiple accounts from different providers and multiple active sessions.

VerificationToken: Stores temporary tokens for email verification, password reset, and other security operations with expiration times.

---

### Now, run the following command to create the database tables and generate the Prisma Client:
```terminal
npx prisma migrate dev --name init
```
```terminal
npx prisma generate
```
---

### Create lib/prisma.ts from root directory
```code
import { PrismaClient } from "../app/generated/prisma/client"; 
import { PrismaPg } from "@prisma/adapter-pg"; 
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!, 
}); 
const globalForPrisma = global as unknown as {
  prisma: PrismaClient; 
}; 
const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter, 
  }); 
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma; 
export default prisma; 
```
---

### Install the Auth.js dependencies:
```terminal
npm install @auth/prisma-adapter next-auth@beta
```
---

Credentials
For this guide, you'll be setting up OAuth with Github. For this, you'll need 3 environment variables:

- AUTH_SECRET - Provided by Auth.js
- CLIENT_ID - Provided by Github
- CLIENT_SECRET - Provided by Github
#### To get the AUTH_SECRET, you can run the following command:
```powershell
npx auth secret
```

### .env
```code
DATABASE_URL=<YOUR_DATABASE_URL>
AUTH_SECRET=<YOUR_AUTH_SECRET>
```

To get the CLIENT_ID and CLIENT_SECRET, you can create a new OAuth application on Github.

- Navigate to [Github Developer Settings](https://github.com/settings/developers)
- Click on New OAuth App
- Enter a name for your app, a home page URL, and a callback URL
- Name: Auth.js + Prisma (Or anything you want)
- Homepage URL: http://localhost:3000
- Callback URL: http://localhost:3000/api/auth/callback/github
- Click Register application
- Click Generate new client secret and copy the Client ID and Client Secret.

#### Add the Client ID and Client Secret to the .env file:
```code
DATABASE_URL=<YOUR_DATABASE_URL>
AUTH_SECRET=<YOUR_AUTH_SECRET>
AUTH_GITHUB_ID=<YOUR_GITHUB_CLIENT_ID>
AUTH_GITHUB_SECRET=<YOUR_GITHUB_CLIENT_SECRET>
```
---

### In the /lib folder, create a new file called auth.config.ts and add the following code:
```code
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
```

### In the /lib folder, create a new file called auth.ts and add the following code:
```code
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import authConfig from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
  ...authConfig,
});
```
---

### In the root, create a new file called proxy.ts. This will protect your routes and ensure that only authenticated users can access them:
```code
import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;
```
---

### Create a new file at app/api/auth/[...nextauth]/route.ts:
```code
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```
---

You will be creating a Sign In and Sign Out button. Create a /components folder in the root and add a new file called auth-components.tsx in it.

Start by importing the signIn and signOut functions from the auth file:
```code
import { signIn, signOut } from "@/lib/auth";

export function SignIn({ provider }: { provider?: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn(provider);
      }}
    >
      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 bg-white text-black text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-neutral-200 transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.68-.22.68-.48 0-.24-.01-.86-.01-1.69-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .27.18.58.69.48A10.01 10.01 0 0022 12c0-5.523-4.477-10-10-10z" />
        </svg>
        Sign in with {provider}
      </button>
    </form>
  );
}

export function SignOut() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut();
      }}
      className="w-full"
    >
      <button
        type="submit"
        className="w-full text-sm text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 rounded-lg px-4 py-2.5 transition-colors"
      >
        Sign out
      </button>
    </form>
  );
}
```
---

### In the /app folder, replace the page.tsx file with the following code:
```code
import { SignIn, SignOut } from "../app/components/auth-components";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Image from "next/image";

const Page = async () => {
  const session = await auth();

  let user = null;
  if (session?.user?.id) {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-8 pb-6 text-center border-b border-neutral-800">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-800 mb-4">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.68-.22.68-.48 0-.24-.01-.86-.01-1.69-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .27.18.58.69.48A10.01 10.01 0 0022 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </div>
            <h1 className="text-white text-lg font-semibold">Auth.js + Prisma</h1>
            <p className="text-neutral-500 text-sm mt-1">Secure authentication demo</p>
          </div>

          {/* Body */}
          <div className="p-6">
            {!session ? (
              <SignIn provider="github" />
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  {session.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name ?? "User avatar"}
                      width={44}
                      height={44}
                      className="rounded-full ring-2 ring-neutral-800"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-neutral-700 flex items-center justify-center text-white text-sm font-medium">
                      {session.user?.name?.[0] ?? "U"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {session.user?.name ?? "Unknown user"}
                    </p>
                    <p className="text-neutral-500 text-xs truncate">{session.user?.email}</p>
                  </div>
                </div>

                <div>
                  <p className="text-neutral-500 text-xs uppercase tracking-wide mb-2">
                    Database record
                  </p>
                  {user ? (
                    <dl className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs space-y-1.5">
                      <div className="flex justify-between gap-3">
                        <dt className="text-neutral-500">ID</dt>
                        <dd className="text-neutral-300 truncate">{user.id}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-neutral-500">Email verified</dt>
                        <dd className="text-neutral-300">{user.emailVerified ? "Yes" : "No"}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-neutral-500 text-xs italic">
                      No matching record found in database.
                    </p>
                  )}
                </div>

                <SignOut />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
```
---

### next.config.ts
```code
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;
```
---

### types/next-auth.d.ts
```code
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
```
---

### run 
```
npm run dev
```
---

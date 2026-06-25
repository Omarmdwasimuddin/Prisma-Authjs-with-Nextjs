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
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    Configuration: "There is a problem with the server configuration.",
    AccessDenied: "You do not have permission to sign in.",
    Verification: "The verification token has expired or has already been used.",
    OAuthSignin: "Error in the OAuth sign-in flow.",
    OAuthCallback: "Error in the OAuth callback handler.",
    OAuthCreateAccount: "Could not create OAuth provider user in the database.",
    EmailCreateAccount: "Could not create email provider user in the database.",
    Callback: "Error in the OAuth callback handler.",
    OAuthAccountNotLinked: "This email is already associated with another account.",
    Default: "An unexpected error occurred.",
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-surface-900 mb-2">Authentication Error</h1>
        <p className="text-surface-500 mb-2">
          {errorMessages[error || "Default"] || errorMessages.Default}
        </p>
        {error && (
          <p className="text-xs text-surface-400 mb-6 font-mono bg-surface-100 rounded p-2">
            Error code: {error}
          </p>
        )}
        <Link
          href="/auth/login"
          className="inline-block px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition"
        >
          Try Again
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>}>
      <ErrorContent />
    </Suspense>
  );
}

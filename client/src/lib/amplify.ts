import config from "@config";

let configured: Promise<void> | null = null;

/**
 * Load and configure Amplify on first use. Kept out of the initial bundle so
 * marketing pages don't pay for the auth library.
 */
export function ensureAmplify() {
  if (!configured) {
    configured = import("aws-amplify").then(({ Amplify }) => {
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId: config.api.cognito.userPoolId,
            userPoolClientId: config.api.cognito.userPoolClientId,
          },
        },
      });
    });
  }
  return configured;
}

export async function authModule() {
  await ensureAmplify();
  return import("aws-amplify/auth");
}

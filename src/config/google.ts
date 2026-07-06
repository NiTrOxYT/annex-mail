/**
 * Google OAuth / Gmail API configuration.
 * All Google credentials are server-side only.
 */

export const googleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID ?? "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  pubSubTopic:
    process.env.GOOGLE_PUB_SUB_TOPIC ??
    "projects/annex-mail/topics/incoming-emails",
};

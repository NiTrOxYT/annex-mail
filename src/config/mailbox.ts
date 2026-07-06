/**
 * Mailbox configuration.
 *
 * Defines the primary inbound/outbound mailbox for this installation.
 * Future mailbox configurations should extend this structure.
 */

export const mailboxConfig = {
  /** Mail provider: brevo | smtp | ses */
  provider: (process.env.MAIL_PROVIDER ?? "brevo") as "brevo" | "smtp" | "ses",
  primary: {
    /** Display name for outbound emails */
    name: process.env.MAIL_PRIMARY_NAME ?? "Annex",
    /** From/reply-to address for outbound emails */
    address:
      process.env.MAIL_PRIMARY_ADDRESS ?? "business@annex-consultancy.com",
  },
};

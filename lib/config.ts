export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");

export const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "shakibshovon.10@gmail.com";

export const ADMIN_CONTACT = {
  label: process.env.NEXT_PUBLIC_ADMIN_CONTACT_LABEL || "যোগাযোগ",
  email: ADMIN_EMAIL,
  href: `mailto:${ADMIN_EMAIL}`,
  gmailComposeUrl: `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(ADMIN_EMAIL)}`,
};

/**
 * Whole-blood donation interval used for the "recently donated" badge and sort order.
 * 120 days (~4 months) follows the common national whole-blood interval; confirm with
 * your community's medical guidance before launch and change it only here.
 */
export const COOLDOWN_DAYS = 120;

/** Max donors per search (Firestore reads). Must stay <= 200 (see firestore.rules). */
export const SEARCH_LIMIT = 100;

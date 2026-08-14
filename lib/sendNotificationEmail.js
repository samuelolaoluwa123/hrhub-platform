// Fire-and-forget: an email failing to send should never block or
// break the actual leave/payroll action it's attached to. Errors are
// swallowed here on purpose — the in-app notification (already saved
// to the database before this runs) is the reliable record either way.
export async function sendNotificationEmail({ to, subject, message, link }) {
  if (!to) return;

  try {
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        subject,
        message,
        link: link ? `${window.location.origin}${link}` : undefined,
      }),
    });
  } catch (err) {
    console.error("Notification email failed:", err);
  }
}
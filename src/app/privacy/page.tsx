import { FEEDBACK_URL, PRIVACY_UPDATED } from "@/lib/site";

export const metadata = { title: "Privacy · Chess Trainer" };

/**
 * The privacy note. Every sentence must stay true: when the app starts
 * storing or sending anything new (accounts, analytics, a backend), change
 * this page in the same change, and update PRIVACY_UPDATED in lib/site.ts.
 */
export default function PrivacyPage() {
  return (
    <main className="text-page">
      <p className="section-tag">Privacy</p>
      <h1 className="page-title">
        <span className="title-outline">Your</span> <span className="title-solid">privacy</span>
      </h1>
      <p className="lede">The short version: this app doesn&apos;t collect anything about you.</p>

      <section>
        <h2>What the app does not do</h2>
        <ul>
          <li>There are no accounts and no sign-in, so the app never asks for your name, email or age.</li>
          <li>It doesn&apos;t use advertising, tracking or analytics tools, and it doesn&apos;t set cookies.</li>
          <li>
            The games you play, paste or upload stay in your browser. The chess engine runs on your own device, so your
            moves are never sent to us.
          </li>
          <li>The fonts are served from this site, so your browser doesn&apos;t contact Google for them.</li>
        </ul>
      </section>

      <section>
        <h2>What is kept in your browser</h2>
        <p>Two small things, which only you can see, on this device:</p>
        <ul>
          <li>Which step of &quot;First steps&quot; you reached, so the lesson can continue where you left off.</li>
          <li>
            A finished game against the bot, for a moment, while it is passed to the review page. It is deleted as soon as
            the review page reads it.
          </li>
        </ul>
        <p>You can remove both at any time by clearing this site&apos;s data in your browser settings.</p>
      </section>

      <section>
        <h2>The website host</h2>
        <p>
          The site is hosted by Vercel. Like any web host, Vercel keeps short-lived technical logs (such as IP addresses)
          to deliver pages and keep the service secure. See <a href="https://vercel.com/legal/privacy-policy">Vercel&apos;s privacy policy</a>.
        </p>
      </section>

      {FEEDBACK_URL && (
        <section>
          <h2>Feedback</h2>
          <p>
            The feedback form is a Google Form, so Google&apos;s privacy policy applies to what you type into it. Please
            don&apos;t include personal details such as full names or school names. If you are under 18, ask a parent or
            guardian before sending feedback.
          </p>
          <p>
            <a href={FEEDBACK_URL}>Open the feedback form</a>
          </p>
        </section>
      )}

      <p className="muted">Last updated {PRIVACY_UPDATED}.</p>
    </main>
  );
}

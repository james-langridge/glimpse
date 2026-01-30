import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About - Glimpse",
  description: "Temporary, secure photo sharing",
};

export default function About() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <header className="mb-12">
          <Link
            href="/"
            className="text-sm text-zinc-600 transition-colors hover:text-zinc-400"
          >
            &larr; Back
          </Link>
          <h1 className="mt-6 text-3xl font-light tracking-widest text-white">
            GLIMPSE
          </h1>
          <p className="mt-2 text-lg text-zinc-400">
            Temporary, secure photo sharing.
          </p>
        </header>

        <section className="space-y-6 leading-relaxed">
          <p>
            Glimpse is a self-hosted photo sharing app designed for one thing:
            letting you share photos privately and temporarily.
          </p>

          <h2 className="pt-4 text-xl font-medium text-white">How it works</h2>
          <ol className="list-inside list-decimal space-y-3 text-zinc-400">
            <li>
              <span className="text-zinc-300">You upload photos</span> to your
              personal Glimpse server through the admin panel.
            </li>
            <li>
              <span className="text-zinc-300">You create a share link</span> by
              selecting which photos to include and setting an expiry
              date&mdash;tomorrow, next week, whenever you want.
            </li>
            <li>
              <span className="text-zinc-300">You send the link</span> to
              whoever you want. They get a short URL with a 6-character code.
            </li>
            <li>
              <span className="text-zinc-300">They view the photos</span> by
              visiting the link or entering the code on the homepage. No sign-up,
              no app download, no account needed.
            </li>
            <li>
              <span className="text-zinc-300">The link expires</span> on the
              date you set. After that, the photos are no longer accessible. You
              can also revoke a link at any time if you change your mind.
            </li>
          </ol>
          <p>
            That&rsquo;s it. You stay in control of what&rsquo;s shared, who
            sees it, and for how long.
          </p>

          <h2 className="pt-4 text-xl font-medium text-white">
            Why is it secure?
          </h2>
          <p>
            Unlike sharing photos through social media, messaging apps, or cloud
            storage services, Glimpse keeps you in control:
          </p>
          <ul className="space-y-4 text-zinc-400">
            <li>
              <span className="font-medium text-zinc-300">
                Your photos stay on your server.
              </span>{" "}
              They aren&rsquo;t uploaded to Google, Apple, Meta, or any third
              party. They live on a server that you own and control.
            </li>
            <li>
              <span className="font-medium text-zinc-300">
                Links expire automatically.
              </span>{" "}
              Every share link has an expiry date. Once it passes, the photos
              can&rsquo;t be accessed anymore. No &ldquo;shared with link&rdquo;
              that lives forever.
            </li>
            <li>
              <span className="font-medium text-zinc-300">
                You can revoke access instantly.
              </span>{" "}
              Changed your mind? Revoke a link and it stops working immediately.
            </li>
            <li>
              <span className="font-medium text-zinc-300">
                No viewer accounts.
              </span>{" "}
              The people you share with don&rsquo;t need to create accounts,
              hand over their email address, or download an app. Less data
              floating around means less risk.
            </li>
            <li>
              <span className="font-medium text-zinc-300">
                Photos are cleaned up automatically.
              </span>{" "}
              Photos that aren&rsquo;t part of any active share link are
              automatically deleted after 30 days. Nothing lingers on the server
              forgotten.
            </li>
            <li>
              <span className="font-medium text-zinc-300">
                Download protection.
              </span>{" "}
              The gallery viewer prevents casual right-click saving and image
              dragging. This won&rsquo;t stop a determined technical user, but
              it discourages casual copying.
            </li>
            <li>
              <span className="font-medium text-zinc-300">
                No tracking by third parties.
              </span>{" "}
              Glimpse doesn&rsquo;t embed analytics scripts, social media
              pixels, or advertising trackers. The built-in analytics use IP
              hashing so even the server admin can&rsquo;t see the real IP
              addresses of viewers.
            </li>
            <li>
              <span className="font-medium text-zinc-300">
                Password-protected admin.
              </span>{" "}
              Only someone with the admin password can upload photos, create
              links, or view analytics. The login is rate-limited to prevent
              brute-force attacks.
            </li>
          </ul>
        </section>

        <footer className="mt-16 border-t border-zinc-800 pt-6 text-center text-sm text-zinc-600">
          <Link
            href="/"
            className="transition-colors hover:text-zinc-400"
          >
            &larr; Back to Glimpse
          </Link>
        </footer>
      </div>
    </div>
  );
}

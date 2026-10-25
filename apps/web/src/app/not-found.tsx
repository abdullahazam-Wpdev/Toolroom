import Link from "next/link";
export default function NotFound() {
  return (
    <section className="section page-section">
      <div className="eyebrow">404</div>
      <h1>This shelf is empty.</h1>
      <p>That page could not be found.</p>
      <Link href="/tools" className="button primary">
        Browse tools
      </Link>
    </section>
  );
}

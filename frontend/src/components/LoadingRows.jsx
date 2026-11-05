/** A stable placeholder for route content and secondary document lists. */
export default function LoadingRows({ label, page = false }) {
  return (
    <div className={`content-loading ${page ? 'content-loading-page' : ''}`} role="status" aria-live="polite">
      <p>{label}</p>
      <div className="content-loading-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

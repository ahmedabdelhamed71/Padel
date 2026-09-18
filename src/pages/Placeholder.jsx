export default function Placeholder({ title }) {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">RIVERSIDE PADEL CLUB</span>
          <h1>{title}</h1>
          <p>This screen is ready for your backend data later.</p>
        </div>
      </div>

      <section className="panel empty-panel">
        <div className="empty-mark">MP</div>
        <h2>{title}</h2>
        <p>The League and Friendly Group flows are fully implemented in this frontend.</p>
      </section>
    </div>
  );
}

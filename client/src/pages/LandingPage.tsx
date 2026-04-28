function LandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-card" aria-labelledby="landing-title">
        <h1 id="landing-title">Sunshine Academy</h1>
        <p>Get instant answers to your questions — powered by AI</p>
        <div className="landing-actions">
          <a className="landing-button parent" href="/chat">
            💬 I&apos;m a Parent
          </a>
          <a className="landing-button intake" href="/intake">
            📋 Submit intake form
          </a>
          <a className="landing-button staff" href="/operator">
            ⚙️ I&apos;m a Staff Member
          </a>
        </div>
      </section>
    </main>
  );
}

export default LandingPage;

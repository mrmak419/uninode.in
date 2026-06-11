export default function Privacy() {
  return (
    <div className="min-h-screen bg-paper text-ink p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-display font-bold">Privacy Policy</h1>
        <p className="text-muted">Last Updated: June 2026</p>
        
        <section className="space-y-3">
          <h2 className="text-xl font-bold">1. Information We Collect</h2>
          <p>
            We collect anonymous usage data to improve our services. This includes your interactions with our website, such as search queries, selected categories, and the ranks you enter. We use Google Analytics to gather this aggregate data.
          </p>
          <p>
            We <strong>do not</strong> collect Personally Identifiable Information (PII) such as your name, email address, phone number, or CET roll numbers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">2. How We Use Your Information</h2>
          <p>
            The anonymous data we collect is used strictly for analytical purposes to understand user trends, fix bugs, and improve the functionality of the KCET College Analyzer.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">3. Third-Party Services</h2>
          <p>
            We use Google Analytics to measure traffic and usage trends. Google Analytics may set cookies on your browser or read cookies that are already there.
          </p>
        </section>
        
        <div className="pt-8">
          <a href="/" className="text-primary hover:underline">&larr; Back to Home</a>
        </div>
      </div>
    </div>
  )
}

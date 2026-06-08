export default function Terms() {
  return (
    <div className="min-h-screen bg-paper text-ink p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-display font-bold">Terms of Service</h1>
        <p className="text-muted">Last Updated: June 2026</p>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">1. Nature of the Service</h2>
          <p>
            The KCET College Predictor is an informational tool designed to help students analyze historical KCET cut-off data. The predictions and historical cut-offs provided on this website are for reference purposes only.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">2. No Guarantee of Admission</h2>
          <p>
            We do not guarantee admission to any college or university. The final cut-offs for the current year may vary significantly from historical data depending on the difficulty of the exam, the number of applicants, and the availability of seats. 
            Always consult the official KEA website for final confirmation.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">3. Disclaimer of Liability</h2>
          <p>
            The developers of this website are not responsible for any decisions made based on the data provided here. Users are entirely responsible for their own counseling choices and application procedures.
          </p>
        </section>

        <div className="pt-8">
          <a href="/" className="text-primary hover:underline">&larr; Back to Home</a>
        </div>
      </div>
    </div>
  )
}

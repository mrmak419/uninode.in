export default function ArticleFAQ({
  branch,
  cleanCollege,
  category,
  latestYear,
  firstRoundRank,
  latestRoundRank,
  prevYear,
  rounds,
  hasDropHistory,
  topYears,
  latestRounds
}) {
  return (
    <div className="mt-10 border-t pt-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
      <div className="grid gap-6">
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-bold text-gray-900 text-lg mb-2">What rank do I need for {branch} at {cleanCollege} for {category} category?</h3>
          <p className="text-gray-700">
            Based on {latestYear} data, you need a rank of {firstRoundRank ? firstRoundRank.toLocaleString() : '--'} or better to secure a seat in Round 1. The final round cutoff was {latestRoundRank ? latestRoundRank.toLocaleString() : '--'}, meaning students with ranks up to {latestRoundRank ? latestRoundRank.toLocaleString() : '--'} were admitted by the end of counseling.
          </p>
        </div>
        
        {prevYear && rounds[prevYear] && latestRoundRank && rounds[prevYear] && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-bold text-gray-900 text-lg mb-2">Is {branch} at {cleanCollege} getting easier or harder to get into?</h3>
          <p className="text-gray-700">
            {latestRoundRank > (rounds[prevYear][Object.keys(rounds[prevYear]).map(Number).sort((a,b)=>b-a)[0]]) ? 'Easing. The closing rank increased compared to the previous year, meaning competition has slightly relaxed.' : 'More competitive. The cutoff rank tightened compared to the previous year.'}
          </p>
        </div>
        )}

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-bold text-gray-900 text-lg mb-2">Should I wait for Round 2?</h3>
          <p className="text-gray-700">
            {hasDropHistory 
              ? `Yes. Based on ${topYears.length} year(s) of data for this specific branch, cutoffs generally relax in later rounds. If your rank is close to the Round 1 cutoff, it is statistically viable to wait.`
              : `Historically, based on ${topYears.length} year(s) of available data, cutoffs for this specific combination do not move significantly after Round 1. If you get a seat here in Round 1, it is highly recommended to secure it rather than risking the wait.`}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-bold text-gray-900 text-lg mb-2">Should I wait till Round 3 (Extended Round)?</h3>
          <p className="text-gray-700">
            {(latestRounds.includes(3) && rounds[latestYear][3] > (rounds[latestYear][2] || rounds[latestYear][1] || 0))
              ? `Based on historical trends, Round 3 cutoffs do relax further for this branch. However, participating in the extended round carries risk as seat availability drops significantly.`
              : `Based on available data, there is no significant cutoff relaxation in Round 3 for this specific branch. It is highly advised to secure a seat by Round 2 and not rely on Round 3.`}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-bold text-gray-900 text-lg mb-2">Which round had the lowest cutoff for {branch} at {cleanCollege}?</h3>
          <p className="text-gray-700">
            In the latest {latestYear} counseling, the lowest cutoff was in Round {latestRounds[latestRounds.length - 1]} at {latestRoundRank ? latestRoundRank.toLocaleString() : '--'}.
          </p>
        </div>

      </div>
    </div>
  )
}

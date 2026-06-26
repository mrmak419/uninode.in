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
          <h3 className="font-bold text-gray-900 text-lg mb-2">Should I wait till Round 3?</h3>
          <p className="text-gray-700">
            {(latestRounds.includes(3) && rounds[latestYear][3] > (rounds[latestYear][2] || rounds[latestYear][1] || 0))
              ? `Based on historical trends, Round 3 cutoffs do relax further for this branch. However, participating in the extended round carries risk as seat availability drops significantly.`
              : `Based on available data, there is no significant cutoff relaxation in Round 3 for this specific branch. It is highly advised to secure a seat by Round 2 and not rely on Round 3.`}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-bold text-gray-900 text-lg mb-2">Which round had the final closing cutoff for {branch} at {cleanCollege}?</h3>
          <p className="text-gray-700">
            In the {latestYear} counseling, the closing cutoff was recorded in Round {latestRounds[latestRounds.length - 1]} at {latestRoundRank ? latestRoundRank.toLocaleString() : '--'}. The final round cutoff represents the absolute threshold for admission in that academic year.
          </p>
        </div>

        {hasDropHistory && firstRoundRank && latestRoundRank && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-2">How much did the cutoff change between the first and final round in {latestYear}?</h3>
            <p className="text-gray-700">
              The cutoff rank for this category shifted by {Math.abs(latestRoundRank - firstRoundRank).toLocaleString()} ranks between Round 1 and the final round in {latestYear}. This numeric difference indicates the extent to which seats were reallocated, surrendered, or upgraded by candidates during the intermediate counseling phases. A larger shift generally implies higher mobility and seat vacancy after the initial allotment.
            </p>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-bold text-gray-900 text-lg mb-2">If my rank is exactly {latestRoundRank ? latestRoundRank.toLocaleString() : 'the closing cutoff'}, am I guaranteed a seat next year?</h3>
          <p className="text-gray-700">
            No, historical cutoffs are not guarantees for future admissions. The cutoff of {latestRoundRank ? latestRoundRank.toLocaleString() : '--'} in {latestYear} simply reflects the rank of the last candidate admitted that year based on that specific candidate pool. Future cutoffs will depend entirely on the number of applicants, seat availability, paper difficulty, and the specific choices made by candidates in the upcoming counseling cycle.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-bold text-gray-900 text-lg mb-2">How should I use this historical cutoff data during option entry?</h3>
          <p className="text-gray-700">
            It is best used as a comparative baseline. If your rank is reasonably close to the final closing rank of {latestRoundRank ? latestRoundRank.toLocaleString() : '--'}, you should certainly include {cleanCollege} in your preference list. However, to mitigate risk, always construct a balanced option entry list that includes "safe" colleges (where past cutoffs are significantly lower than your rank) alongside your preferred "reach" colleges.
          </p>
        </div>

      </div>
    </div>
  )
}

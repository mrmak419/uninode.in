export default function ArticleNarrative({
  branch,
  cleanCollege,
  category,
  latestYear,
  latestRoundRank,
  prevYear,
  firstRoundRank,
  rounds
}) {
  let analysisParagraphs = [];

  const latestRounds = Object.keys(rounds[latestYear] || {})
    .map(Number)
    .filter(r => rounds[latestYear][r] !== null && rounds[latestYear][r] !== undefined && rounds[latestYear][r] !== '--')
    .sort((a,b) => a - b);
    
  const hasPrevYear = prevYear && rounds[prevYear];
  const hasMultipleRounds = latestRounds.length > 1;

  let p1 = `The historical cutoff data for the ${branch} program at ${cleanCollege} provides valuable insights into the admission patterns for the ${category} category. In the ${latestYear} counseling cycle, the closing cutoff rank was recorded at ${latestRoundRank && latestRoundRank !== '--' ? latestRoundRank.toLocaleString() : '--'}. This final cutoff rank represents the rank of the last admitted candidate for this specific branch and category during that year's counseling process.`;

  if (hasPrevYear) {
    const prevRounds = Object.keys(rounds[prevYear] || {})
      .map(Number)
      .filter(r => rounds[prevYear][r] !== null && rounds[prevYear][r] !== undefined && rounds[prevYear][r] !== '--')
      .sort((a,b) => a - b);
    const prevRank = prevRounds.length > 0 ? rounds[prevYear][prevRounds[prevRounds.length - 1]] : null;
    
    if (latestRoundRank && prevRank && latestRoundRank !== '--' && prevRank !== '--') {
      const diff = latestRoundRank - prevRank;
      const pct = Math.abs((diff / prevRank) * 100).toFixed(1);
      const absDiff = Math.abs(diff);

      if (diff > 0) {
        p1 += ` When comparing this to the previous year, the cutoff rank eased by ${absDiff.toLocaleString()} ranks, which translates to a shift of ${pct}%. A positive shift in the cutoff rank indicates that the seat was available to candidates with a relatively lower rank compared to the preceding year.`;
      } else if (diff < 0) {
        p1 += ` When comparing this to the previous year, the cutoff rank tightened by ${absDiff.toLocaleString()} ranks, reflecting a shift of ${pct}%. A negative shift in the cutoff rank indicates an increase in competition, as the seat closed at a higher rank than the preceding year.`;
      } else {
        p1 += ` The cutoff rank remained entirely unchanged compared to the previous year, indicating a consistent historical demand for this particular seat.`;
      }
    }
  }
  analysisParagraphs.push(p1);

  if (hasMultipleRounds && latestRoundRank && firstRoundRank && latestRoundRank !== '--' && firstRoundRank !== '--') {
    let p2 = `Analyzing the round-by-round progression in ${latestYear}, the admission process opened with a Round 1 cutoff rank of ${firstRoundRank.toLocaleString()}. As candidates exercised their choices and seat allocations were adjusted in subsequent phases, `;
    if (latestRoundRank === firstRoundRank) {
       p2 += `the cutoff rank remained static at ${latestRoundRank.toLocaleString()} through to the final round. This suggests that the initial seat allotment was largely retained by the candidates, leaving little room for the cutoff to drop in later rounds.`;
    } else {
       const drop = latestRoundRank - firstRoundRank;
       if (drop > 0) {
         const dropPct = ((drop / firstRoundRank) * 100).toFixed(1);
         p2 += `the cutoff rank relaxed by ${drop.toLocaleString()} ranks, representing a ${dropPct}% change. By the final round, the closing rank settled at ${latestRoundRank.toLocaleString()}. This round-over-round relaxation typically occurs as candidates upgrade to other colleges or courses, freeing up seats for subsequent allotments.`;
       } else {
         p2 += `the cutoff rank closed tighter at ${latestRoundRank.toLocaleString()} in the final round. Tightening across rounds can happen in specific scenarios where seat availability or category adjustments come into play.`;
       }
    }
    analysisParagraphs.push(p2);
  }

  if (latestRoundRank && latestRoundRank !== '--') {
     let p3 = `Beyond the numbers, the category assignment plays a critical role in these admission patterns. The ${category} category represents a specific reservation or quota outlined by the examination authority. Candidates falling under this classification have access to a dedicated pool of seats, which often results in different cutoff dynamics compared to the general merit pool. Variations in this cutoff rank from year to year are heavily influenced by the number of eligible candidates within the ${category} category and their performance in the entrance examination. When reviewing the ${latestYear} data, it is essential to remember that the cutoff of ${latestRoundRank.toLocaleString()} is specific only to candidates possessing the valid documentation for the ${category} quota.`;
     analysisParagraphs.push(p3);

     let p4 = `The structure of the counseling process itself also introduces significant variables into the final admission outcomes. The counseling authority typically conducts multiple rounds, starting with an initial mock allotment followed by the first official round. The opening rank of ${firstRoundRank && firstRoundRank !== '--' ? firstRoundRank.toLocaleString() : 'the initial round'} reflects the immediate preferences of top-scoring candidates. As the counseling progresses into the second round and potentially an extended or mop-up round, seats are frequently reallocated. This reallocation happens because candidates may opt to surrender their allotted seats to pursue opportunities in other prestigious institutions, migrate to different courses such as medical or architecture, or successfully secure upgraded choices within the same engineering counseling structure. The difference between the initial and final cutoff ranks captures this exact mobility.`;
     analysisParagraphs.push(p4);

     let p5 = `Prospective students aiming for ${branch} at ${cleanCollege} should use these historical ranks as a baseline for their option entry strategy rather than an absolute guarantee. While historical cutoffs are a reliable indicator of past admission trends and institutional popularity, the actual cutoffs for upcoming counseling sessions will depend on the overall performance of the candidate pool, the total number of available seats as defined by the latest seat matrix, and any governmental changes in category-wise reservations. It is highly advisable to list choices dynamically during the option entry phase. A sound strategy involves including colleges where the previous year's closing rank was both slightly above and below the candidate's actual rank, ensuring a safe margin around the ${latestRoundRank.toLocaleString()} benchmark established in ${latestYear}.`;
     analysisParagraphs.push(p5);
  }

  let trendString = null;
  if (hasPrevYear) {
    const prevRounds = Object.keys(rounds[prevYear] || {})
      .map(Number)
      .filter(r => rounds[prevYear][r] !== null && rounds[prevYear][r] !== undefined && rounds[prevYear][r] !== '--')
      .sort((a,b) => a - b);
    const prevRank = prevRounds.length > 0 ? rounds[prevYear][prevRounds[prevRounds.length - 1]] : null;
    if (latestRoundRank && prevRank && latestRoundRank !== '--' && prevRank !== '--') {
      const diff = latestRoundRank - prevRank;
      const pct = Math.abs((diff / prevRank) * 100).toFixed(1);
      if (diff > 0) {
         trendString = `Eased by ${pct}% over two years`;
      } else if (diff < 0) {
         trendString = `Tightened by ${pct}% over two years`;
      } else {
         trendString = "Stable over two years";
      }
    }
  } else if (hasMultipleRounds && latestRoundRank && firstRoundRank && latestRoundRank !== '--' && firstRoundRank !== '--') {
     const diff = latestRoundRank - firstRoundRank;
     const pct = Math.abs((diff / firstRoundRank) * 100).toFixed(1);
     if (diff > 0) {
         trendString = `Eased by ${pct}% across rounds in ${latestYear}`;
     } else if (diff < 0) {
         trendString = `Tightened by ${pct}% across rounds in ${latestYear}`;
     } else {
         trendString = `Stable across rounds in ${latestYear}`;
     }
  }

  return (
    <div className="prose prose-blue max-w-none mt-8">
      <div className="text-lg font-bold mb-6">
        <div className="text-gray-900 mb-2">
          Closing cutoff: {latestRoundRank ? latestRoundRank.toLocaleString() : '--'} ({latestYear} Round {latestRounds[latestRounds.length - 1]})
        </div>
        {trendString && <div className="text-blue-700">Trend: {trendString}</div>}
      </div>
      {analysisParagraphs.map((text, i) => (
        <p key={i} className="text-gray-700 leading-relaxed text-lg mb-6">
          {text}
        </p>
      ))}
    </div>
  )
}

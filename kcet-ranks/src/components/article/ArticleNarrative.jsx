function pickVariant(variants, seed) {
  return variants[seed % variants.length];
}

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
  const seed = (cleanCollege.length * 7) + (branch.length * 3) + (latestRoundRank && latestRoundRank !== '--' ? parseInt(latestRoundRank, 10) : 0);


  // ----------------------------------------------------------------------
  // Paragraph 1: Year-over-Year Narrative with Tiered Volatility Logic
  // ----------------------------------------------------------------------
  const latestRounds = Object.keys(rounds[latestYear] || {})
    .map(Number)
    .filter(r => rounds[latestYear][r] !== null && rounds[latestYear][r] !== undefined && rounds[latestYear][r] !== '--')
    .sort((a,b) => a - b);
    
  const hasPrevYear = prevYear && rounds[prevYear];
  const hasMultipleRounds = latestRounds.length > 1;

  let p1 = '';
  if (!hasPrevYear && !hasMultipleRounds) {
    p1 = `For the ${branch} program at ${cleanCollege}, the cutoff rank for the ${category} category in the ${latestYear} counseling cycle was established at ${latestRoundRank && latestRoundRank !== '--' ? latestRoundRank.toLocaleString() : '--'}.`;
  } else {
    p1 = `Analyzing the historical admissions data for ${branch} at ${cleanCollege}, we can observe clear trends for the ${category} category. In the most recent ${latestYear} counseling cycle, the final cutoff rank landed at ${latestRoundRank && latestRoundRank !== '--' ? latestRoundRank.toLocaleString() : '--'}.`;
  }
  
  if (prevYear && rounds[prevYear]) {
    const prevRounds = Object.keys(rounds[prevYear] || {})
      .map(Number)
      .filter(r => rounds[prevYear][r] !== null && rounds[prevYear][r] !== undefined && rounds[prevYear][r] !== '--')
      .sort((a,b) => a - b);
    const prevRank = prevRounds.length > 0 ? rounds[prevYear][prevRounds[prevRounds.length - 1]] : null;
    
    if (latestRoundRank && prevRank && latestRoundRank !== '--' && prevRank !== '--') {
      const diff = latestRoundRank - prevRank;
      const pct = (diff / prevRank) * 100; // Positive = easier, Negative = harder
      const absDiff = Math.abs(diff);
      const isHighRank = prevRank > 40000;

      if (diff > 0) {
        // Easing Competition
        if (pct >= 50) {
          p1 += pickVariant([
            ` Comparing this to the previous year, the cutoff experienced an unprecedented freefall, dropping by an astonishing ${absDiff.toLocaleString()} ranks (${pct.toFixed(1)}%). This indicates a near-total collapse in demand or a massive influx of available seats.`,
            ` In a shocking turn of events, the cutoff plummeted by ${absDiff.toLocaleString()} ranks (${pct.toFixed(1)}%) from the previous year. It has become drastically easier to get into this program.`
          ], seed);
        } else if (pct >= 30) {
          p1 += pickVariant([
            ` Comparing this to the previous year, the cutoff plummeted by ${absDiff.toLocaleString()} ranks (${pct.toFixed(1)}%). This massive relaxation indicates a significant drop in demand.`,
            ` We observed a massive easing in competition, with the cutoff relaxing by ${absDiff.toLocaleString()} ranks (${pct.toFixed(1)}%) compared to last year.`
          ], seed + 1);
        } else if (pct >= 15) {
          p1 += pickVariant([
            ` Comparing this to the previous year, the cutoff relaxed significantly by ${absDiff.toLocaleString()} ranks (${pct.toFixed(1)}%), making it notably easier to secure a seat here.`,
            ` Good news for applicants: the cutoff dropped by ${absDiff.toLocaleString()} ranks (${pct.toFixed(1)}%) from last year, showing a clear relaxation in competition.`
          ], seed + 2);
        } else if (pct >= 5) {
          p1 += pickVariant([
            ` Comparing this to the previous year, the cutoff relaxed moderately by ${absDiff.toLocaleString()} ranks (${pct.toFixed(1)}%), showing a steady easing in competition.`,
            ` The cutoff moved down by ${absDiff.toLocaleString()} ranks (${pct.toFixed(1)}%) compared to last year, which points to a moderate decrease in applicant demand.`
          ], seed + 3);
        } else {
          if (isHighRank) {
            p1 += pickVariant([
              ` The cutoff drifted lower by ${absDiff.toLocaleString()} ranks compared to the previous year. While this number seems large, at these higher rank ranges it represents a relatively minor natural fluctuation (${pct.toFixed(1)}%) in demand.`,
              ` A shift of ${absDiff.toLocaleString()} ranks lower was observed. Due to the high rank tier, this ${pct.toFixed(1)}% change is just normal year-to-year variance.`
            ], seed + 4);
          } else {
            p1 += pickVariant([
              ` Comparing this to the previous year, the cutoff relaxed slightly by ${absDiff.toLocaleString()} ranks, indicating a minor easing in competition.`,
              ` The closing rank eased by a gentle ${absDiff.toLocaleString()} ranks from last year, suggesting competition cooled off just a bit.`
            ], seed + 5);
          }
        }
      } else if (diff < 0) {
        // Tightening Competition
        if (pct <= -50) {
          p1 += pickVariant([
            ` The cutoff witnessed an unprecedented exponential surge in demand, aggressively tightening by ${absDiff.toLocaleString()} ranks (${Math.abs(pct).toFixed(1)}%). Securing this seat has become extraordinarily difficult compared to last year.`,
            ` Competition skyrocketed this year! The cutoff tightened by a massive ${absDiff.toLocaleString()} ranks (${Math.abs(pct).toFixed(1)}%), making this program exceptionally hard to get into compared to previous cycles.`
          ], seed + 6);
        } else if (pct <= -30) {
          p1 += pickVariant([
            ` The cutoff saw a massive spike in competition, tightening by an aggressive ${absDiff.toLocaleString()} ranks (${Math.abs(pct).toFixed(1)}%) compared to the previous year.`,
            ` Demand for this seat surged significantly. The cutoff closed ${absDiff.toLocaleString()} ranks earlier (${Math.abs(pct).toFixed(1)}%) than last year, marking a sharp increase in competition.`
          ], seed + 7);
        } else if (pct <= -15) {
          p1 += pickVariant([
            ` Comparing this to the previous year, the cutoff tightened notably by ${absDiff.toLocaleString()} ranks (${Math.abs(pct).toFixed(1)}%), reflecting a clear surge in student demand for this program.`,
            ` We've seen a strong upward trend in demand here; the cutoff tightened by ${absDiff.toLocaleString()} ranks (${Math.abs(pct).toFixed(1)}%) since the last cycle.`
          ], seed + 8);
        } else if (pct <= -5) {
          p1 += pickVariant([
            ` Comparing this to the previous year, the cutoff tightened moderately by ${absDiff.toLocaleString()} ranks (${Math.abs(pct).toFixed(1)}%), indicating a steady increase in competition.`,
            ` The cutoff closed ${absDiff.toLocaleString()} ranks tighter (${Math.abs(pct).toFixed(1)}%) than last year. This steady climb shows growing interest among applicants.`
          ], seed + 9);
        } else {
          if (isHighRank) {
            p1 += pickVariant([
              ` The cutoff tightened by ${absDiff.toLocaleString()} ranks compared to the previous year. Because this is a higher rank tier, this ${Math.abs(pct).toFixed(1)}% shift represents a minor natural fluctuation rather than a severe spike in competition.`,
              ` A tightening of ${absDiff.toLocaleString()} ranks occurred compared to last year. At these higher ranges, this ${Math.abs(pct).toFixed(1)}% movement is standard and doesn't necessarily imply a massive competitive surge.`
            ], seed + 10);
          } else {
            p1 += pickVariant([
              ` Comparing this to the previous year, the cutoff tightened by ${absDiff.toLocaleString()} ranks, indicating that securing a seat here has become slightly more competitive.`,
              ` With the cutoff closing ${absDiff.toLocaleString()} ranks earlier this year, we can see a slight bump in student preference for this program.`,
              ` The data shows a minor tightening of ${absDiff.toLocaleString()} ranks from last year, suggesting competition is slowly heating up for this seat.`
            ], seed + 11);
          }
        }
      } else {
        p1 += pickVariant([
          ` Comparing this to the previous year, the cutoff remained perfectly stable, indicating a highly consistent and predictable demand for this program.`,
          ` The cutoff rank didn't move an inch compared to last year. This level of stability shows rock-solid, unchanging demand for this exact seat.`
        ], seed + 12);
      }
    }
  }
  analysisParagraphs.push(p1);

  // ----------------------------------------------------------------------
  // Paragraph 2: Round-by-Round Narrative
  // ----------------------------------------------------------------------
  
  if (latestRounds.length > 1 && latestRoundRank && firstRoundRank && latestRoundRank !== '--' && firstRoundRank !== '--') {
    let p2 = `When looking at the round-by-round dynamics during the ${latestYear} counseling process, `;
    if (latestRoundRank === firstRoundRank) {
       p2 += `the cutoffs proved to be extremely rigid. The ranks did not move a single position from the initial Round 1 cutoff of ${firstRoundRank.toLocaleString()}, meaning students who were hoping for the cutoffs to drop in later rounds were left disappointed.`;
    } else {
       const drop = latestRoundRank - firstRoundRank;
       if (drop > 0) {
         const dropPct = (drop / firstRoundRank) * 100;
         if (dropPct >= 50) {
           p2 += `there was a massive shift in availability. Counseling opened with a Round 1 cutoff of ${firstRoundRank.toLocaleString()}, but seats were aggressively reallocated, resulting in a staggering freefall of ${drop.toLocaleString()} ranks (${dropPct.toFixed(1)}%) by the final round.`;
         } else if (dropPct >= 30) {
           p2 += `there was a significant shift in availability. Counseling opened with a Round 1 cutoff of ${firstRoundRank.toLocaleString()}, but the cutoff ultimately plummeted by ${drop.toLocaleString()} ranks (${dropPct.toFixed(1)}%) to settle at its final position.`;
         } else if (dropPct >= 15) {
           p2 += `there was a notable shift in availability. Counseling opened with a Round 1 cutoff of ${firstRoundRank.toLocaleString()}, but as students shuffled, the cutoff relaxed comfortably by ${drop.toLocaleString()} ranks (${dropPct.toFixed(1)}%).`;
         } else if (dropPct >= 5) {
           p2 += `there was a moderate shift in availability. Counseling opened with a Round 1 cutoff of ${firstRoundRank.toLocaleString()} and steadily relaxed by ${drop.toLocaleString()} ranks (${dropPct.toFixed(1)}%) over subsequent rounds.`;
         } else {
           p2 += `there was only a slight shift. Counseling opened with a Round 1 cutoff of ${firstRoundRank.toLocaleString()} and relaxed by a minor ${drop.toLocaleString()} ranks (${dropPct.toFixed(1)}%) to its final position.`;
         }
       } else {
         p2 += `the counseling opened with a Round 1 cutoff of ${firstRoundRank.toLocaleString()} and eventually closed tighter at ${latestRoundRank.toLocaleString()}.`;
       }
    }
    analysisParagraphs.push(p2);
  }

  // ----------------------------------------------------------------------
  // Summary Trend String (For the bold UI block)
  // ----------------------------------------------------------------------
  let trendString = "Newly added or limited data";
  if (prevYear && rounds[prevYear]) {
    const prevRounds = Object.keys(rounds[prevYear] || {})
      .map(Number)
      .filter(r => rounds[prevYear][r] !== null && rounds[prevYear][r] !== undefined && rounds[prevYear][r] !== '--')
      .sort((a,b) => a - b);
    const prevRank = prevRounds.length > 0 ? rounds[prevYear][prevRounds[prevRounds.length - 1]] : null;
    if (latestRoundRank && prevRank && latestRoundRank !== '--' && prevRank !== '--') {
      const diff = latestRoundRank - prevRank;
      const pct = ((diff / prevRank) * 100).toFixed(1);
      const pctNum = parseFloat(pct);
      const isHighRank = prevRank > 40000;
      
      if (diff > 0) {
         if (pctNum >= 50) trendString = `Unprecedented Freefall over two years (+${pct}%)`;
         else if (pctNum >= 30) trendString = `Massive Easing over two years (+${pct}%)`;
         else if (pctNum >= 15) trendString = `Significant Easing over two years (+${pct}%)`;
         else if (pctNum >= 5) trendString = `Moderate Easing over two years (+${pct}%)`;
         else if (isHighRank) trendString = `Minor Fluctuation over two years (+${pct}%)`;
         else trendString = `Slightly Easing over two years (+${pct}%)`;
      } else if (diff < 0) {
         if (pctNum <= -50) trendString = `Unprecedented Competition Spike over two years (${pct}%)`;
         else if (pctNum <= -30) trendString = `Massive Competition Spike over two years (${pct}%)`;
         else if (pctNum <= -15) trendString = `Significantly More Competitive over two years (${pct}%)`;
         else if (pctNum <= -5) trendString = `Moderately More Competitive over two years (${pct}%)`;
         else if (isHighRank) trendString = `Minor Fluctuation over two years (${pct}%)`;
         else trendString = `Slightly More Competitive over two years (${pct}%)`;
      } else {
         trendString = "Perfectly stable over two years";
      }
    }
  } else if (latestRounds.length > 1 && latestRoundRank && firstRoundRank && latestRoundRank !== '--' && firstRoundRank !== '--') {
     const diff = latestRoundRank - firstRoundRank;
     const pct = ((diff / firstRoundRank) * 100).toFixed(1);
     const pctNum = parseFloat(pct);
     const isHighRank = firstRoundRank > 40000;
     
     if (diff > 0) {
         if (pctNum >= 50) trendString = `Unprecedented Freefall across rounds in ${latestYear} (+${pct}%)`;
         else if (pctNum >= 30) trendString = `Massive Easing across rounds in ${latestYear} (+${pct}%)`;
         else if (pctNum >= 15) trendString = `Significant Easing across rounds in ${latestYear} (+${pct}%)`;
         else if (pctNum >= 5) trendString = `Moderate Easing across rounds in ${latestYear} (+${pct}%)`;
         else if (isHighRank) trendString = `Minor Fluctuation across rounds in ${latestYear} (+${pct}%)`;
         else trendString = `Slightly Easing across rounds in ${latestYear} (+${pct}%)`;
     } else if (diff < 0) {
         if (pctNum <= -50) trendString = `Unprecedented Competition Spike across rounds in ${latestYear} (${pct}%)`;
         else if (pctNum <= -30) trendString = `Massive Competition Spike across rounds in ${latestYear} (${pct}%)`;
         else if (pctNum <= -15) trendString = `Significantly More Competitive across rounds in ${latestYear} (${pct}%)`;
         else if (pctNum <= -5) trendString = `Moderately More Competitive across rounds in ${latestYear} (${pct}%)`;
         else if (isHighRank) trendString = `Minor Fluctuation across rounds in ${latestYear} (${pct}%)`;
         else trendString = `Slightly More Competitive across rounds in ${latestYear} (${pct}%)`;
     } else {
         trendString = `Stable across rounds in ${latestYear}`;
     }
  } else {
     trendString = null;
  }

  return (
    <div className="prose prose-blue max-w-none mt-8">
      <div className="text-lg font-bold mb-6">
        <div className="text-gray-900 mb-2">
          Latest cutoff: {latestRoundRank ? latestRoundRank.toLocaleString() : '--'} ({latestYear} Round {latestRounds[latestRounds.length - 1]})
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

// Math Engine for Advanced Cutoff Analytics

export function calculateAdvancedMetrics(allMatrixData) {
  // 1. Group data for cross-sectional math
  const branchCategoryMap = {}; // { branchName: { category: [ closingRanks... ] } }
  const collegeMinRankMap = {}; // { collegeCode: minRank (flagship) }
  const collegeBranchCatMap = {}; // { "college|branch": { category: rank } } // for cushion ratio

  // Pre-process grouping
  allMatrixData.forEach(row => {
    const parsed = parseRounds(row.rounds);
    if (parsed.length === 0) return;
    
    // Sort years descending, then rounds descending
    parsed.sort((a, b) => b.y - a.y || b.r - a.r);
    
    // Latest year closing rank
    const latestYear = parsed[0].y;
    const latestClosing = parsed.filter(p => p.y === latestYear)[0]?.val;
    
    if (latestClosing) {
      // 1. State-wide Branch + Category aggregation (for Z-Score)
      const bKey = row.course_name;
      const cKey = row.category;
      if (!branchCategoryMap[bKey]) branchCategoryMap[bKey] = {};
      if (!branchCategoryMap[bKey][cKey]) branchCategoryMap[bKey][cKey] = [];
      branchCategoryMap[bKey][cKey].push({ rank: latestClosing, row });

      // 2. Intra-College Flagship (for BPI)
      // Usually General Merit indicates true flagship status, but we'll take the absolute min rank across any category to find the most competitive seat
      if (!collegeMinRankMap[row.college_code] || latestClosing < collegeMinRankMap[row.college_code]) {
        collegeMinRankMap[row.college_code] = latestClosing;
      }

      // 3. Intra-College Category Map (for Cushion Ratio)
      const cbKey = `${row.college_code}|${row.course_name}`;
      if (!collegeBranchCatMap[cbKey]) collegeBranchCatMap[cbKey] = {};
      collegeBranchCatMap[cbKey][cKey] = latestClosing;
    }
  });

  // Calculate Mean and SD for Z-Scores
  const branchCategoryStats = {};
  for (const bKey in branchCategoryMap) {
    branchCategoryStats[bKey] = {};
    for (const cKey in branchCategoryMap[bKey]) {
      const ranks = branchCategoryMap[bKey][cKey].map(x => x.rank);
      const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length;
      const variance = ranks.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / ranks.length;
      const sd = Math.sqrt(variance);
      branchCategoryStats[bKey][cKey] = { mean, sd, ranks };
    }
  }

  // 2. Iterate again to calculate individual row metrics
  allMatrixData.forEach(row => {
    row.advMath = {};
    const parsed = parseRounds(row.rounds);
    if (parsed.length === 0) return;
    
    const yearsDesc = [...new Set(parsed.map(p => p.y))].sort((a, b) => b - a);
    const latestYear = yearsDesc[0];
    const latestEntries = parsed.filter(p => p.y === latestYear).sort((a, b) => a.r - b.r);
    
    const R1 = latestEntries[0]?.val;
    const R_latest = latestEntries[latestEntries.length - 1]?.val;

    if (!R_latest) return; // Need a closing rank

    // --- 1. Round-to-Round Volatility ---
    if (R1 && R1 !== R_latest && R1 > 0) {
      const deltaRound = ((R_latest - R1) / R1) * 100;
      row.advMath.volatility = deltaRound;
      if (deltaRound <= 2) row.advMath.volatilityTag = "low volatility";
      else if (deltaRound > 15) row.advMath.volatilityTag = "high volatility";
      else row.advMath.volatilityTag = "moderate volatility";
    }

    // --- 2. Multi-Year Trend (CAGR & Momentum) ---
    if (yearsDesc.length >= 2) {
      const oldestYear = yearsDesc[yearsDesc.length - 1];
      const R_begin = parsed.filter(p => p.y === oldestYear).sort((a, b) => b.r - a.r)[0]?.val;
      
      const t = latestYear - oldestYear;
      row.advMath.years = yearsDesc.length;
      if (t > 0 && R_begin > 0) {
        const cagr = Math.pow(R_latest / R_begin, 1 / t) - 1;
        row.advMath.cagr = cagr;
        if (cagr < -0.05) row.advMath.cagrTag = "rapidly tightening";
        else if (cagr > 0.05) row.advMath.cagrTag = "relaxing cutoffs";
        else row.advMath.cagrTag = "stable";
      }

      // Momentum (if 3 years available)
      if (yearsDesc.length >= 3) {
        const y0 = yearsDesc[0];
        const y1 = yearsDesc[1];
        const y2 = yearsDesc[2];
        
        const R_y0 = parsed.filter(p => p.y === y0).sort((a, b) => b.r - a.r)[0]?.val;
        const R_y1 = parsed.filter(p => p.y === y1).sort((a, b) => b.r - a.r)[0]?.val;
        const R_y2 = parsed.filter(p => p.y === y2).sort((a, b) => b.r - a.r)[0]?.val;
        
        if (R_y0 && R_y1 && R_y2) {
          const delta1 = R_y1 - R_y2;
          const delta2 = R_y0 - R_y1;
          const acceleration = delta2 - delta1;
          row.advMath.acceleration = acceleration;

          if (delta2 < 0 && acceleration < 0) row.advMath.momentumTag = "compounding competition";
          else if (delta2 < 0 && acceleration > 0) row.advMath.momentumTag = "stabilizing demand";
        }
      }
    }

    // --- 3. Z-Score (State-Wide Standardization) ---
    const stats = branchCategoryStats[row.course_name]?.[row.category];
    if (stats && stats.sd > 0) {
      const z = (R_latest - stats.mean) / stats.sd;
      row.advMath.zScore = z;
      if (z < -1.5) row.advMath.zScoreTag = "highly competitive";
      else if (z >= -0.5 && z <= 0.5) row.advMath.zScoreTag = "moderately competitive";
      else if (z > 1.5) row.advMath.zScoreTag = "highly accessible";
    }

    // --- 4. BPI (Branch Preference Index) ---
    const minRankCollege = collegeMinRankMap[row.college_code];
    if (minRankCollege > 0) {
      const bpi = R_latest / minRankCollege;
      row.advMath.bpi = bpi;
      if (bpi === 1.0) row.advMath.bpiTag = "a campus flagship program";
      else if (bpi > 3.0) row.advMath.bpiTag = "highly accessible";
    }

    // --- 5. Category Cushion Ratio ---
    const gmRank = collegeBranchCatMap[`${row.college_code}|${row.course_name}`]?.['GM'];
    if (gmRank && gmRank > 0 && row.category !== 'GM') {
      const cushion = ((R_latest - gmRank) / gmRank) * 100;
      row.advMath.cushion = cushion;
      row.advMath.gmRank = gmRank;
      row.advMath.latestRank = R_latest;
      row.advMath.cushionTag = `provides a ${Math.round(cushion)}% rank safety buffer over General Merit`;
    }

    // --- 6. Safe Rank Confidence Interval ---
    const allValidRanks = parsed.map(p => p.val).filter(v => v > 0);
    if (allValidRanks.length >= 3) {
      const n = allValidRanks.length;
      const mean = allValidRanks.reduce((a, b) => a + b, 0) / n;
      const variance = allValidRanks.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
      const sd = Math.sqrt(variance);
      
      const margin = 1.96 * (sd / Math.sqrt(n));
      row.advMath.ci = {
        lower: Math.round(mean - margin),
        upper: Math.round(mean + margin),
        n
      };
    }

    // --- 7. Euclidean Seat Distance (Peers) ---
    const peers = branchCategoryMap[row.course_name]?.[row.category];
    if (peers) {
      const distances = peers
        .filter(p => p.row.college_code !== row.college_code)
        .map(p => {
          return {
            college_code: p.row.college_code,
            college_name: p.row.college_name.split('(')[0].split(',')[0].trim(),
            rank: p.rank,
            distance: Math.abs(p.rank - R_latest)
          };
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);
      
      if (distances.length > 0) {
        row.advMath.peers = distances;
      }
    }
  });

  return allMatrixData;
}

function parseRounds(roundsObj) {
  if (!roundsObj) return [];
  const parsed = [];
  for (const key of Object.keys(roundsObj)) {
    const [yStr, rStr] = key.split('_R');
    const y = Number(yStr);
    const r = Number(rStr);
    const val = roundsObj[key];
    // EXCLUDE MOCK ROUNDS: Only take rounds > 0
    if (!isNaN(y) && !isNaN(r) && r > 0 && val !== null && val !== undefined && val !== '--') {
      parsed.push({ y, r, val });
    }
  }
  return parsed;
}

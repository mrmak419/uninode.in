export function processCollegeChunks(allMatrixData) {
    function getLatestRank(roundsObj) {
        if (!roundsObj) return null;
        let latestY = 0;
        let latestR = 0;
        let rank = null;
        for (const key of Object.keys(roundsObj)) {
            const [y, r] = key.split('_R').map(Number);
            if (!isNaN(y) && !isNaN(r)) {
                if (y > latestY || (y === latestY && r > latestR)) {
                    latestY = y;
                    latestR = r;
                    rank = roundsObj[key];
                }
            }
        }
        return rank;
    }

    // 1. Map rows with latest rank
    const rows = allMatrixData.map(r => ({
        ...r,
        latestRank: getLatestRank(r.rounds)
    })).filter(r => r.latestRank !== null);

    // Grouping
    const byBranch = {}; // key: "course|category|seat"
    const byCollege = {}; // key: "college|category|seat"
    
    rows.forEach(r => {
        const bKey = `${r.course_name}|${r.category}|${r.seat_type}`;
        if (!byBranch[bKey]) byBranch[bKey] = [];
        byBranch[bKey].push(r);

        const cKey = `${r.college_code}|${r.category}|${r.seat_type}`;
        if (!byCollege[cKey]) byCollege[cKey] = [];
        byCollege[cKey].push(r);
    });

    // Sort groups
    for (const k in byBranch) {
        byBranch[k].sort((a,b) => a.latestRank - b.latestRank);
    }
    for (const k in byCollege) {
        byCollege[k].sort((a,b) => a.latestRank - b.latestRank);
    }

    const collegeOutputs = {};

    rows.forEach(r => {
        if (!collegeOutputs[r.college_code]) {
            collegeOutputs[r.college_code] = { cutoffs: [], suggestions: {} };
        }
        // Exclude the added `latestRank` when putting back into cutoffs to keep JSON small
        const cleanRow = { ...r };
        delete cleanRow.latestRank;
        collegeOutputs[r.college_code].cutoffs.push(cleanRow);

        // Find Next College (Slightly easier cutoff)
        const bKey = `${r.course_name}|${r.category}|${r.seat_type}`;
        const bGroup = byBranch[bKey] || [];
        const bIdx = bGroup.indexOf(r);
        let bestCollege = null;
        if (bGroup.length > 1) {
            bestCollege = bIdx < bGroup.length - 1 ? bGroup[bIdx + 1] : bGroup[0];
        }

        // Find Next Branch (Slightly easier cutoff)
        const cKey = `${r.college_code}|${r.category}|${r.seat_type}`;
        const cGroup = byCollege[cKey] || [];
        const cIdx = cGroup.indexOf(r);
        let bestBranch = null;
        if (cGroup.length > 1) {
            bestBranch = cIdx < cGroup.length - 1 ? cGroup[cIdx + 1] : cGroup[0];
        }

        const suggKey = `${r.course_name}|${r.category}|${r.seat_type}`;
        collegeOutputs[r.college_code].suggestions[suggKey] = {
            similarCollege: bestCollege ? { college: bestCollege.college_name, college_code: bestCollege.college_code, branch: bestCollege.course_name, category: r.category } : null,
            similarBranch: bestBranch ? { college: bestBranch.college_name, college_code: bestBranch.college_code, branch: bestBranch.course_name, category: r.category } : null
        };
    });

    return collegeOutputs;
}

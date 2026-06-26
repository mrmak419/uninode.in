import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getArticleUrl } from '../../lib/url';

const MetricCard = ({ title, tooltip, children, iconPath }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="h-full flex flex-col bg-white p-5 rounded-xl shadow-sm border border-gray-200 relative" ref={containerRef}>
      <div className="flex items-center mb-2">
        <div className="bg-gray-100 p-2 rounded-lg mr-3 text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: iconPath }}></svg>
        </div>
        <h4 className="text-lg font-bold text-gray-800 m-0">{title}</h4>
        
        <div className="ml-auto relative flex items-center">
          <button 
            type="button" 
            className={`transition-colors p-1 ${isOpen ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'}`}
            aria-label="Info"
            onClick={() => setIsOpen(!isOpen)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 16v-4"></path>
              <path d="M12 8h.01"></path>
            </svg>
          </button>
          {isOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-xl z-10 pointer-events-auto">
              {tooltip}
              <div className="absolute w-3 h-3 bg-gray-800 transform rotate-45 -bottom-1.5 right-3"></div>
            </div>
          )}
        </div>
      </div>
      <div className="text-gray-700 leading-relaxed m-0 text-base">
        {children}
      </div>
    </div>
  )
}

export default function ArticleNarrative({
  examPrefix,
  stream,
  branch,
  cleanCollege,
  category,
  latestYear,
  latestRoundRank,
  prevYear,
  firstRoundRank,
  rounds,
  advMath
}) {
  const latestRounds = Object.keys(rounds[latestYear] || {})
    .map(Number)
    .filter(r => rounds[latestYear][r] !== null && rounds[latestYear][r] !== undefined && rounds[latestYear][r] !== '--')
    .sort((a,b) => a - b);
    
  let trendString = null;
  const hasPrevYear = prevYear && rounds[prevYear];
  const hasMultipleRounds = latestRounds.length > 1;

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

  let advancedMathUI = null;
  if (advMath) {
    let mathParagraphs = [];
    
    if (advMath.cagrTag) {
      mathParagraphs.push(
        <MetricCard 
          key="cagr" 
          title="Historical Trend" 
          tooltip="Measures whether the rank required to get this seat is increasing or decreasing over a multi-year period."
          iconPath='<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline>'
        >
          Over the last {advMath.years || 3} years, the competition for this seat is <strong>{advMath.cagrTag}</strong>.
          {advMath.cagr != null && ` Specifically, the rank boundary has been shifting at a compound annual rate of ${(Math.abs(advMath.cagr) * 100).toFixed(1)}% per year, giving us a very clear long-term trajectory.`}
        </MetricCard>
      );
    }
    
    if (advMath.momentumTag) {
      mathParagraphs.push(
        <MetricCard 
          key="mom" 
          title="Current Demand" 
          tooltip="Shows if the popularity of this seat is currently speeding up or slowing down compared to last year."
          iconPath='<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>'
        >
          Right now, the demand from students is <strong>{advMath.momentumTag}</strong>.
          {advMath.acceleration != null && ` The year-over-year shift in rank cutoffs accelerated by ${Math.abs(Math.round(advMath.acceleration))} positions recently, confirming this immediate momentum.`}
        </MetricCard>
      );
    }
    
    if (advMath.volatilityTag) {
      mathParagraphs.push(
        <MetricCard 
          key="vol" 
          title="Seat Drop Risk" 
          tooltip="Measures how much the cutoff falls between the first and last rounds. High risk means you shouldn't rely on it dropping much."
          iconPath='<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path>'
        >
          During counseling rounds, holding out for this seat exhibits <strong>{advMath.volatilityTag}</strong>.
          {advMath.volatility != null && ` Historically, the rank cutoff drops by an average of ${advMath.volatility.toFixed(1)}% between the first round and the final round.`}
        </MetricCard>
      );
    }
    
    if (advMath.zScoreTag) {
      mathParagraphs.push(
        <MetricCard 
          key="z" 
          title="State Rank" 
          tooltip="Compares this seat's difficulty against all other colleges in the state offering the exact same branch."
          iconPath='<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 1.1-.9 2-2 2H6"></path><path d="M14 14.66V17c0 1.1.9 2 2 2h2"></path><path d="M18 4c0 3.2-2 5.5-5 5.5h-2c-3 0-5-2.3-5-5.5V4h12z"></path>'
        >
          Compared to all other colleges offering this branch, this seat is <strong>{advMath.zScoreTag}</strong>.
          {advMath.zScore != null && ` This gives it a statistical Z-Score of ${advMath.zScore.toFixed(2)} when standardizing cutoffs across Karnataka.`}
        </MetricCard>
      );
    }
    
    if (advMath.bpiTag) {
      mathParagraphs.push(
        <MetricCard 
          key="bpi" 
          title="College Priority" 
          tooltip="Compares this specific branch to the most demanded branch (usually Computer Science) at this exact same college."
          iconPath='<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>'
        >
          Compared to the best branch in this college, this acts as <strong>{advMath.bpiTag}</strong>.
          {advMath.bpi != null && ` The Branch Preference Index (BPI) sits at ${advMath.bpi.toFixed(2)}, which mathematically compares its cutoff against the toughest branch at this campus.`}
        </MetricCard>
      );
    }

    if (advMath.ci) {
      mathParagraphs.push(
        <MetricCard 
          key="ci" 
          title="Expected Cutoff" 
          tooltip="A statistically calculated safe range for this year's cutoff based on all historical counseling rounds."
          iconPath='<rect width="16" height="20" x="4" y="2" rx="2"></rect><line x1="8" x2="16" y1="6" y2="6"></line><line x1="16" x2="16" y1="14" y2="18"></line><path d="M16 10h.01"></path><path d="M12 10h.01"></path><path d="M8 10h.01"></path><path d="M12 14h.01"></path><path d="M8 14h.01"></path><path d="M12 18h.01"></path><path d="M8 18h.01"></path>'
        >
          Based on past data, our confidence interval projects a safe target rank between <strong>{advMath.ci.lower.toLocaleString()} and {advMath.ci.upper.toLocaleString()}</strong>.
        </MetricCard>
      );
    }
    
    if (advMath.cushionTag) {
      mathParagraphs.push(
        <MetricCard 
          key="cushion" 
          title="Category Advantage" 
          tooltip="Shows if having this specific category reservation provides a large or small rank advantage over the General Merit category."
          iconPath='<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>'
        >
          The {category} quota <strong>{advMath.cushionTag}</strong>.
          {advMath.gmRank && advMath.latestRank && ` For example, while GM required a rank of ${advMath.gmRank.toLocaleString()}, this category allowed ranks up to ${advMath.latestRank.toLocaleString()}.`}
        </MetricCard>
      );
    }
    
    if (advMath.peers && advMath.peers.length > 0) {
      mathParagraphs.push(
        <MetricCard 
          key="peers" 
          title="Similar Options" 
          tooltip="Colleges that have an almost identical level of competition and cutoff rank for this branch."
          iconPath='<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"></path><path d="M15 5.764v15"></path><path d="M9 3.236v15"></path>'
        >
          <ul className="list-disc pl-6">
            {advMath.peers.map((peer, idx) => (
              <li key={idx} className="mb-1">
                <Link to={getArticleUrl(examPrefix, stream, peer.college_code, branch, category)} className="font-bold text-blue-600 hover:underline">
                  {peer.college_name}
                </Link> (Distance: {peer.distance} ranks)
              </li>
            ))}
          </ul>
        </MetricCard>
      );
    }

    if (mathParagraphs.length > 0) {
      advancedMathUI = (
        <div className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mathParagraphs}
          </div>
        </div>
      );
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
      {advancedMathUI}
    </div>
  )
}

import React from 'react'

export default function ArticleAdmissionProcess({ examPrefix = 'kcet', stream, cleanCollege }) {
  const isKCET = examPrefix === 'kcet'
  const isCOMEDK = examPrefix === 'comedk'

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 mt-8">
      <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
        Admission Process for {cleanCollege}
      </h2>
      <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed space-y-4">
        {isKCET ? (
          <>
            <p>
              Admission to {cleanCollege} through the KCET quota is managed by the Karnataka Examinations Authority (KEA). 
              The process involves several key stages starting with document verification.
            </p>
            <h3 className="text-lg font-bold text-gray-900 mt-4 mb-2">1. Document Verification</h3>
            <p>
              After the KCET results are announced, candidates must undergo document verification at designated nodal centers. 
              Only verified candidates are eligible to participate in the option entry process.
            </p>
            <h3 className="text-lg font-bold text-gray-900 mt-4 mb-2">2. Option Entry</h3>
            <p>
              Candidates need to log into the KEA portal and enter their preferences for colleges and courses in decreasing order of priority. 
              It is crucial to enter {cleanCollege} and your preferred branch at a high priority if you want to secure a seat here.
            </p>
            <h3 className="text-lg font-bold text-gray-900 mt-4 mb-2">3. Seat Allotment</h3>
            <p>
              KEA conducts multiple rounds of seat allotment (Mock Allotment, Round 1, Round 2, and Extended Round). 
              Seat allotment is based purely on your KCET rank, category reservation, and the options you've entered.
            </p>
          </>
        ) : isCOMEDK ? (
          <>
            <p>
              Admission to {cleanCollege} through COMEDK is conducted via an online centralized counseling process.
            </p>
            <h3 className="text-lg font-bold text-gray-900 mt-4 mb-2">1. Online Registration</h3>
            <p>
              Eligible candidates must register online, upload the required documents, and pay the counseling fee.
            </p>
            <h3 className="text-lg font-bold text-gray-900 mt-4 mb-2">2. Choice Filling</h3>
            <p>
              Candidates can select their preferred courses and colleges. Ensure you place {cleanCollege} at the top of your preference list.
            </p>
            <h3 className="text-lg font-bold text-gray-900 mt-4 mb-2">3. Allotment Rounds</h3>
            <p>
              The counseling happens in multiple phases. After allotment, candidates must accept the seat, pay the fee, and report to the college.
            </p>
          </>
        ) : (
          <p>
            The admission process for {cleanCollege} involves participating in the respective centralized counseling process, 
            verifying documents, and entering your options carefully based on your rank and category.
          </p>
        )}
      </div>
    </div>
  )
}

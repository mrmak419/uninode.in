import React, { useEffect, useRef } from 'react'

export default function RazorpayButton() {
  const formRef = useRef(null)

  useEffect(() => {
    // Prevent strict mode double-mounting
    if (formRef.current && formRef.current.children.length === 0) {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/payment-button.js'
      script.setAttribute('data-payment_button_id', 'pl_T2mjroqJW8riSt')
      script.async = true
      formRef.current.appendChild(script)
    }
  }, [])

  const handleAnalyticsTrack = () => {
    // Production safety check: prevents crashes if user has an ad-blocker active
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'select_content', {
        content_type: 'button',
        item_id: 'buy_us_a_chai_btn',
        event_category: 'engagement',
        event_label: 'Razorpay Checkout Opened'
      })
    } else {
      console.warn('GA is blocked or not loaded. Analytics event skipped.')
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-xs mx-auto">
      <p className="text-xs text-muted font-medium text-center leading-relaxed">
        If this tool helped you during counseling, you can click below to:
      </p>
      
      {/* onClickCapture guarantees the event logs before Razorpay intercepts the click flow */}
      <div 
        className="transform transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 hover:shadow-md rounded-md cursor-pointer"
        onClickCapture={handleAnalyticsTrack}
      >
        <form ref={formRef} className="m-0 flex justify-center w-full" />
      </div>
    </div>
  )
}
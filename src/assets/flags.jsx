import React from 'react';

export const Flags = {
  es: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 500" className="flag-svg">
      <rect width="750" height="500" fill="#c60b1e"/>
      <rect width="750" height="250" y="125" fill="#ffc400"/>
    </svg>
  ),
  va: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 667" className="flag-svg">
      <rect width="1000" height="667" fill="#fff"/>
      <rect width="1000" height="74" fill="#ffc400"/>
      <rect width="1000" height="74" y="148" fill="#ffc400"/>
      <rect width="1000" height="74" y="296" fill="#ffc400"/>
      <rect width="1000" height="74" y="444" fill="#ffc400"/>
      <rect width="1000" height="74" y="592" fill="#ffc400"/>
      <rect width="1000" height="74" y="74" fill="#c60b1e"/>
      <rect width="1000" height="74" y="222" fill="#c60b1e"/>
      <rect width="1000" height="74" y="370" fill="#c60b1e"/>
      <rect width="1000" height="74" y="518" fill="#c60b1e"/>
      <rect width="250" height="667" fill="#0047ab"/>
    </svg>
  ),
  gb: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className="flag-svg">
      <clipPath id="s">
        <path d="M0,0 v30 h60 v-30 z"/>
      </clipPath>
      <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
    </svg>
  ),
  ru: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6" className="flag-svg">
      <rect width="9" height="2" fill="#fff"/>
      <rect width="9" height="2" y="2" fill="#0039a6"/>
      <rect width="9" height="2" y="4" fill="#d52b1e"/>
    </svg>
  )
};

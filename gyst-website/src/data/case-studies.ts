export interface CaseStudy {
  id: string
  client: string
  industry: string
  challenge: string
  solution: string
  services: string[]
  results: {
    metric: string
    value: string
    description: string
  }[]
  technologies: string[]
  timeline: string
  teamSize: string
  featured: boolean
  image: string
  logo: string
  testimonial?: {
    quote: string
    author: string
    position: string
  }
}

export const caseStudies: CaseStudy[] = [
  {
    id: 'galaxy-housing',
    client: 'Galaxy Housing',
    industry: 'Property Management',
    challenge: 'Manual property management processes and inefficient lead qualification resulted in slow response times and missed opportunities in a competitive real estate market.',
    solution: 'End-to-end sales AI implementation with RAG database for property listings, automated lead qualification, and multi-channel voice marketing system.',
    services: ['RAG Solutions', 'Lead Generation AI', 'AI Chatbots', 'Voice Marketing'],
    results: [
      {
        metric: 'Qualified Leads',
        value: '300%',
        description: 'Increase in qualified leads through intelligent screening'
      },
      {
        metric: 'Response Time',
        value: '85%',
        description: 'Reduction in average response time to inquiries'
      },
      {
        metric: 'Conversion Rate',
        value: '40%',
        description: 'Improvement in lead-to-client conversion rates'
      },
      {
        metric: 'Operational Efficiency',
        value: '60%',
        description: 'Reduction in manual administrative tasks'
      }
    ],
    technologies: ['RAG Architecture', 'Voice AI', 'Multi-channel Marketing', 'CRM Integration'],
    timeline: '8 weeks',
    teamSize: '4 specialists',
    featured: true,
    image: '/images/case-studies/galaxy-housing-dashboard.jpg',
    logo: '/images/clients/galaxy-housing-logo.svg',
    testimonial: {
      quote: "GYST transformed our entire lead management process. We're now handling 3x more qualified leads with the same team size.",
      author: "Sarah Mitchell",
      position: "Operations Director, Galaxy Housing"
    }
  },
  {
    id: 'force-at-work',
    client: 'Force at Work',
    industry: 'Marketing Agency',
    challenge: 'Scaling personalized marketing campaigns across Japanese markets while maintaining cultural authenticity and engagement quality.',
    solution: 'AI avatars for culturally-aware content creation, social media automation bots, and intelligent lead generation system tailored for Japanese business culture.',
    services: ['AI Avatars', 'Social Media Automation', 'Lead Generation AI', 'Content Creation'],
    results: [
      {
        metric: 'Social Engagement',
        value: '500%',
        description: 'Increase in social media engagement rates'
      },
      {
        metric: 'Content Creation Time',
        value: '70%',
        description: 'Reduction in content creation and localization time'
      },
      {
        metric: 'Campaign ROI',
        value: '200%',
        description: 'Improvement in marketing campaign return on investment'
      },
      {
        metric: 'Market Reach',
        value: '250%',
        description: 'Expansion in target market reach and penetration'
      }
    ],
    technologies: ['AI Avatars', 'Social Media APIs', 'Cultural AI Training', 'Lead Generation Automation'],
    timeline: '10 weeks',
    teamSize: '5 specialists',
    featured: true,
    image: '/images/case-studies/force-at-work-avatars.jpg',
    logo: '/images/clients/force-at-work-logo.svg',
    testimonial: {
      quote: "The AI avatars perfectly captured Japanese business culture nuances. Our clients can't tell the difference from human-created content.",
      author: "Hiroshi Tanaka",
      position: "Creative Director, Force at Work"
    }
  },
  {
    id: 'rc-wallet',
    client: 'RC Wallet',
    industry: 'Crypto Finance',
    challenge: 'Identifying high-value crypto investors (whales) from on-chain data and providing automated, intelligent customer support for complex financial queries.',
    solution: 'On-chain analysis system with automated whale identification, intelligent lead generation, and RAG-powered customer support system for crypto-specific queries.',
    services: ['On-chain Analysis', 'Lead Generation AI', 'RAG Solutions', 'AI Chatbots'],
    results: [
      {
        metric: 'Whale Prospects Identified',
        value: '1000+',
        description: 'High-value crypto investors identified and qualified'
      },
      {
        metric: 'Support Resolution Time',
        value: '90%',
        description: 'Reduction in customer support ticket resolution time'
      },
      {
        metric: 'New Client Acquisitions',
        value: '$2.3M',
        description: 'Value of new client acquisitions directly attributed to AI'
      },
      {
        metric: 'Customer Satisfaction',
        value: '95%',
        description: 'Customer satisfaction score for AI-powered support'
      }
    ],
    technologies: ['Blockchain APIs', 'RAG Architecture', 'Automated Lead Generation', 'Intelligent Chatbots'],
    timeline: '12 weeks',
    teamSize: '6 specialists',
    featured: true,
    image: '/images/case-studies/rc-wallet-analytics.jpg',
    logo: '/images/clients/rc-wallet-logo.svg',
    testimonial: {
      quote: "GYST's on-chain analysis identified prospects we never would have found manually. The ROI has been exceptional.",
      author: "David Chen",
      position: "CEO, RC Wallet"
    }
  }
]

export const industryStats = {
  'Property Management': {
    projectsCompleted: 15,
    avgROI: '320%',
    clientSatisfaction: '96%'
  },
  'Marketing Agency': {
    projectsCompleted: 22,
    avgROI: '280%', 
    clientSatisfaction: '98%'
  },
  'Crypto Finance': {
    projectsCompleted: 8,
    avgROI: '450%',
    clientSatisfaction: '94%'
  },
  'Healthcare': {
    projectsCompleted: 12,
    avgROI: '250%',
    clientSatisfaction: '97%'
  },
  'Insurance': {
    projectsCompleted: 18,
    avgROI: '310%',
    clientSatisfaction: '95%'
  },
  'Government': {
    projectsCompleted: 6,
    avgROI: '180%',
    clientSatisfaction: '92%'
  }
} as const
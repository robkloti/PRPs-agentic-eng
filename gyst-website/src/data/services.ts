export interface Service {
  id: string
  title: string
  description: string
  includes: string[]
  benefits: string[]
  icon: string
  category: 'strategy' | 'implementation' | 'optimization'
  pricing: {
    starting: string
    typical: string
  }
  deliveryTime: string
  industries: string[]
}

export const services: Service[] = [
  {
    id: 'ai-strategy',
    title: 'AI Strategy Roadmap',
    description: 'Clear implementation plan for AI transformation with measurable outcomes',
    includes: [
      'Current AI readiness evaluation',
      'High-impact use case identification',
      'Step-by-step implementation roadmap',
      'Risk mitigation and compliance plan',
      'ROI projections and success metrics'
    ],
    benefits: [
      'Informed AI strategy decisions',
      'Reduced implementation risks',
      'Competitive market advantage',
      'Clear budget allocation',
      'Executive stakeholder alignment'
    ],
    icon: 'strategy',
    category: 'strategy',
    pricing: {
      starting: '$15K',
      typical: '$25K-50K'
    },
    deliveryTime: '4-6 weeks',
    industries: ['Finance', 'Healthcare', 'Manufacturing', 'Insurance', 'Government']
  },
  {
    id: 'rag-solutions',
    title: 'RAG Solutions',
    description: 'Enterprise knowledge bases with real-time data integration',
    includes: [
      'Custom embedding systems',
      'Real-time data integration',
      'Scalable retrieval architecture',
      'Security and compliance features',
      'Multi-source data connectors'
    ],
    benefits: [
      'Instant knowledge access',
      '70% faster information retrieval',
      'Improved decision accuracy',
      'Reduced training overhead',
      'Centralized knowledge management'
    ],
    icon: 'rag',
    category: 'implementation',
    pricing: {
      starting: '$35K',
      typical: '$75K-150K'
    },
    deliveryTime: '8-12 weeks',
    industries: ['Legal', 'Healthcare', 'Finance', 'Manufacturing', 'Government']
  },
  {
    id: 'ai-chatbots',
    title: 'AI Chatbots & Avatars',
    description: 'Conversational AI with human-like interactions and brand consistency',
    includes: [
      'Multi-channel support integration',
      'Voice and text capabilities',
      'Photorealistic avatar creation',
      'Brand voice consistency',
      'Advanced conversation flows'
    ],
    benefits: [
      '24/7 customer service availability',
      '60% reduction in support costs',
      'Enhanced customer engagement',
      'Consistent brand experience',
      'Scalable support operations'
    ],
    icon: 'chatbot',
    category: 'implementation',
    pricing: {
      starting: '$25K',
      typical: '$50K-100K'
    },
    deliveryTime: '6-10 weeks',
    industries: ['Retail', 'SaaS', 'Healthcare', 'Finance', 'Real Estate']
  },
  {
    id: 'lead-generation',
    title: 'Lead Generation & Sales AI',
    description: 'End-to-end sales automation with intelligent prospect scoring',
    includes: [
      'Automated prospect identification',
      'Multi-touch campaign orchestration',
      'Intelligent lead scoring',
      'CRM integration and automation',
      'Performance analytics dashboard'
    ],
    benefits: [
      '300% increase in qualified leads',
      'Reduced sales cycle time',
      'Higher conversion rates',
      'Automated follow-up sequences',
      'Data-driven sales insights'
    ],
    icon: 'leadgen',
    category: 'optimization',
    pricing: {
      starting: '$20K',
      typical: '$40K-80K'
    },
    deliveryTime: '4-8 weeks',
    industries: ['B2B SaaS', 'Real Estate', 'Insurance', 'Marketing', 'Crypto']
  },
  {
    id: 'content-generation',
    title: 'AI Content Generation',
    description: 'Industry-specific content creation with compliance awareness',
    includes: [
      'Brand voice modeling and training',
      'Multi-format content creation',
      'Compliance-aware content for regulated industries',
      'Content workflow automation',
      'Quality assurance and human oversight'
    ],
    benefits: [
      '70% reduction in content creation time',
      'Consistent brand messaging',
      'Scalable content production',
      'Regulatory compliance assurance',
      'Multi-language content support'
    ],
    icon: 'content',
    category: 'implementation',
    pricing: {
      starting: '$15K',
      typical: '$30K-60K'
    },
    deliveryTime: '3-6 weeks',
    industries: ['Marketing', 'Healthcare', 'Finance', 'Legal', 'E-commerce']
  },
  {
    id: 'ai-implementation',
    title: 'Custom AI Development',
    description: 'Bespoke AI solutions with MLOps and enterprise deployment',
    includes: [
      'Custom model development and training',
      'MLOps pipeline setup',
      'Enterprise-grade deployment',
      'Model monitoring and maintenance',
      'Performance optimization and scaling'
    ],
    benefits: [
      'Tailored solutions for unique challenges',
      'Proprietary competitive advantages',
      'Full control over AI capabilities',
      'Scalable enterprise architecture',
      'Ongoing optimization and improvement'
    ],
    icon: 'implementation',
    category: 'implementation',
    pricing: {
      starting: '$50K',
      typical: '$100K-300K'
    },
    deliveryTime: '12-20 weeks',
    industries: ['Manufacturing', 'Finance', 'Healthcare', 'Logistics', 'Energy']
  }
]

export const serviceCategories = {
  strategy: {
    title: 'AI Strategy',
    description: 'Strategic planning and roadmap development',
    color: 'primary'
  },
  implementation: {
    title: 'AI Implementation', 
    description: 'Custom development and deployment',
    color: 'secondary'
  },
  optimization: {
    title: 'AI Optimization',
    description: 'Performance enhancement and scaling',
    color: 'accent'
  }
} as const
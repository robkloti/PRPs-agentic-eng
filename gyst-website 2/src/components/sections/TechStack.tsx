"use client";

import { motion } from "framer-motion";

const technologies = [
  { name: "OpenAI", category: "LLM" },
  { name: "Anthropic", category: "LLM" },
  { name: "Google AI", category: "LLM" },
  { name: "Pinecone", category: "Vector DB" },
  { name: "Weaviate", category: "Vector DB" },
  { name: "Qdrant", category: "Vector DB" },
  { name: "LangChain", category: "Framework" },
  { name: "LlamaIndex", category: "Framework" },
  { name: "Retell AI", category: "Voice" },
  { name: "Vapi", category: "Voice" },
  { name: "ElevenLabs", category: "Voice" },
  { name: "Deepgram", category: "Voice" },
  { name: "n8n", category: "Automation" },
  { name: "Make", category: "Automation" },
  { name: "Zapier", category: "Automation" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
    },
  },
};

export function TechStack() {
  return (
    <section id="tech" className="py-24 px-4 bg-background">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Built with Industry-Leading Technology
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We leverage the best tools in the AI ecosystem to deliver enterprise-grade solutions
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-6xl mx-auto"
        >
          {technologies.map((tech) => (
            <motion.div
              key={tech.name}
              variants={itemVariants}
              className="group relative bg-card border border-border rounded-lg p-6 hover:border-secondary hover:shadow-lg hover:shadow-secondary/20 transition-all duration-300 cursor-pointer"
            >
              <div className="text-center">
                <div className="text-xs font-semibold text-secondary mb-2">
                  {tech.category}
                </div>
                <div className="font-semibold text-foreground group-hover:text-secondary transition-colors">
                  {tech.name}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            + Many more integrations available
          </p>
        </div>
      </div>
    </section>
  );
}

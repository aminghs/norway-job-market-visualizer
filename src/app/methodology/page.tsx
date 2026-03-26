import React from 'react';
import Link from 'next/link';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';

export const metadata = {
  title: 'Methodology | Sweden Job Market Visualizer',
};

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-8">
        <div className="container mx-auto max-w-4xl">
          <Link href="/" className="text-blue-400 hover:text-blue-300 hover:underline mb-4 inline-block font-medium">
            Back to Visualizer
          </Link>
          <h1 className="text-3xl md:text-5xl font-black text-slate-50 tracking-tight mb-4">Methodology & Limitations</h1>
          <p className="text-lg text-slate-400">
            How we calculate AI Exposure and Current Adoption scores for the Swedish Labor Market.
          </p>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl py-12 px-4 pb-32">
        <div className="prose prose-invert prose-slate prose-lg max-w-none">
          <h2 className="text-slate-100">Overview</h2>
          <p>
            The <strong>Sweden Job Market Visualizer</strong> is an exploration tool designed to prompt thinking about skills transition. It is heavily inspired by
            <a href="https://karpathy.ai/jobs/" target="_blank" rel="noreferrer" className="text-blue-400 px-1 hover:text-blue-300">Andrej Karpathy's jobs visualizer</a>,
            but rebuilt specifically to reflect Swedish occupational structures (SSYK 2012) and Swedish labor market dynamics.
          </p>

          <div className="bg-amber-900/20 border border-amber-700/50 p-6 rounded-lg my-8">
            <h3 className="text-amber-400 mt-0">CRITICAL: Exposure ≠ Displacement</h3>
            <p className="text-amber-200 mb-0">
              A high "AI Exposure" score does <strong>not</strong> mean a job is going away. Throughout economic history, automation of specific tasks often
              increases the overall value and demand for the human in the loop. Furthermore, the Swedish labor market is heavily unionized and features
              a large public welfare sector (education, healthcare, social work) where many tasks are statutory human responsibilities that cannot be legally delegated to software.
              <strong>Please use this tool to think about how your daily tasks might change, not whether your job title will exist.</strong>
            </p>
          </div>

          <h2>Data Sources</h2>
          <ul>
            <li><strong>SCB (Statistics Sweden) & JobTech Taxonomy:</strong> Underpins the occupational hierarchy (SSYK 2012) and the number of employed persons per occupation as of 2021.</li>
            <li><strong>Arbetsförmedlingen (Swedish Public Employment Service):</strong> Provides the labor market outlook and shortage index (Yrkesprognoser).</li>
            <li><strong>Vercel AI SDK (LLMs):</strong> Used during the build pipeline to assess and score each occupation against a strict rubric.</li>
          </ul>

          <h2>The Two Scores</h2>

          <h3>1. Theoretical AI Exposure (0-10)</h3>
          <p>
            This score evaluates the <em>tasks</em> that make up a job. It asks the question: "If the technology works perfectly, how much of this job's daily output is text, code, or decision-making that an LLM can simulate?"
          </p>
          <pre className="bg-slate-900 text-slate-300 p-4 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
            {`SCORING RUBRIC for "theoreticalExposure" (0–10):
- 9–10: Almost entirely screen/knowledge-based; output is text, code, data, or decisions AI models excel at
- 7–8: Majority of tasks are cognitive/digital but with some physical or interpersonal components
- 5–6: Mixed — significant cognitive tasks that AI could assist with, significant physical/relational tasks it cannot
- 3–4: Mostly physical, hands-on, interpersonal, or highly context-dependent (Swedish welfare/care setting)
- 1–2: Almost entirely physical, outdoor, or dependent on real-world embodiment
- 0: No plausible AI impact on core task structure`}
          </pre>

          <h3>2. Current AI Adoption (0-10)</h3>
          <p>
            This score attempts to measure what is actually happening in Swedish workplaces <em>right now</em>. It looks for observable signals that employers are buying tools (like GitHub Copilot, AI medical transcription, or automated customer service).
          </p>
          <pre className="bg-slate-900 text-slate-300 p-4 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
            {`Rate "currentAdoption" (0–10) based on OBSERVABLE signals:
- 8–10: Tools actively used in Sweden today
- 6–7: Significant tooling available and many employers adopting
- 4–5: Early adoption — some employers experimenting, tools exist but not mainstream
- 2–3: Marginal — a few pilot programs, mostly talk
- 0–1: No meaningful current adoption signals`}
          </pre>

          <h2>Limitations and Bias</h2>
          <p>
            <strong>LLM Self-Referential Bias:</strong> We use an LLM (such as GPT-4o or Claude 3.5 Sonnet) to score these jobs. LLMs tend to overestimate their own capabilities and underestimate the friction of enterprise deployment.
            We try to mitigate this by writing prompts that explicitly remind the model about Swedish labor friction, but bias remains.
          </p>
          <p>
            <strong>Coarse Categories:</strong> SSYK code 2412 ("Personalspecialister") lumps together technical recruiters, compensation analysts, and HR business partners. The AI exposure for these sub-roles varies wildly, but they receive a single aggregate score here.
          </p>
        </div>
      </main>

      <DisclaimerBanner />
    </div>
  );
}

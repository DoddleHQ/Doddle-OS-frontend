'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Send } from 'lucide-react';
import { FlowingThreads } from '@/components/v2/FlowingThreads';
import { DeskCard, AgentTyping, type CardVariant } from './DeskCard';
import { OptionSelector, type Option } from './OptionSelector';

/*
 * OnboardingDesk — "The Agent's Desk" onboarding experience.
 *
 * Design philosophy (3 skills applied):
 *
 * IMPPECCABLE: No step counters, no progress bars — the conversation IS the
 * progress. The first viewport is a thesis: a warm desk surface with a single
 * agent card asking the first question. No chrome, no clutter. Depth from
 * spacing and hairline borders, not shadows-as-decoration. The FlowingThreads
 * canvas runs at low opacity as ambient atmosphere (not the focal layer).
 *
 * MOTION DESIGN (Premium archetype):
 * - Primary layer: cards materializing with anticipation → arc → settle
 * - Secondary layer: agent avatar pulses softly when listening (ambient loop)
 * - Ambient layer: FlowingThreads canvas behind (sine-wave breath)
 * - Stagger: option cards fan out at 80ms intervals (under 500ms budget)
 * - Timing: 350ms card entry, 1.2s agent typing, 200ms option lift
 * - Easing: cubic-bezier(0.4, 0, 0.2, 1) — no overshoot, elegant
 *
 * CLAUDE DESIGN SKILLS: The interaction feels physical — cards are tactile
 * objects on a desk, not abstract UI. The vermilion accent is earned (active
 * states, send button, CTA), never decorative.
 */

const PREMIUM_EASE = [0.4, 0, 0.2, 1] as const;

type StepType = 'freetext' | 'single-select' | 'multi-select' | 'summary';

interface Step {
  id: number;
  agentMessage: string;
  type: StepType;
  options?: Option[];
  maxSelections?: number;
  confirmLabel?: string;
}

const STEPS: Step[] = [
  {
    id: 1,
    agentMessage: "Welcome to Doddle OS. I'm your GTM strategist — I'll help you set up your brand persona so every agent in your workspace understands your business. Let's start simple: what does your business do, and who do you serve?",
    type: 'freetext',
  },
  {
    id: 2,
    agentMessage: "Thanks. What industry best describes your business? This helps me tailor the right strategies.",
    type: 'single-select',
    options: [
      { id: 'ecommerce', label: 'E-Commerce', desc: 'Online retail, DTC, marketplaces' },
      { id: 'saas', label: 'SaaS / Software', desc: 'B2B or B2C software products' },
      { id: 'agency', label: 'Agency / Services', desc: 'Marketing, design, consulting' },
      { id: 'media', label: 'Media / Publishing', desc: 'Content, news, entertainment' },
      { id: 'other', label: 'Other', desc: 'Something else entirely' },
    ],
  },
  {
    id: 3,
    agentMessage: "What are your primary marketing goals? Pick the ones that matter most — I'll align your agents around them.",
    type: 'multi-select',
    options: [
      { id: 'lead-gen', label: 'Lead Generation', desc: 'Capture and qualify prospects' },
      { id: 'brand', label: 'Brand Awareness', desc: 'Maximize reach and visibility' },
      { id: 'conversion', label: 'Conversion Optimization', desc: 'Improve funnel metrics' },
      { id: 'retention', label: 'Customer Retention', desc: 'Increase lifetime value' },
      { id: 'content', label: 'Content Velocity', desc: 'Accelerate content production' },
    ],
    maxSelections: 3,
    confirmLabel: 'Lock in goals',
  },
  {
    id: 4,
    agentMessage: "Which tools and platforms do you currently use? I'll configure your workspace to integrate with them.",
    type: 'multi-select',
    options: [
      { id: 'google-ads', label: 'Google Ads', desc: 'Search, display, shopping' },
      { id: 'search-console', label: 'Search Console', desc: 'SEO and crawl data' },
      { id: 'social', label: 'Social Media', desc: 'LinkedIn, X, Instagram' },
      { id: 'analytics', label: 'Google Analytics', desc: 'Behavioral data, GTM' },
      { id: 'crm', label: 'CRM', desc: 'HubSpot, Salesforce, Pipedrive' },
    ],
    maxSelections: 5,
    confirmLabel: 'Connect tools',
  },
  {
    id: 5,
    agentMessage: "Last question. How would you describe your brand voice? Bold? Professional? Playful? A few words is enough — this shapes how every agent communicates on your behalf.",
    type: 'freetext',
  },
  {
    id: 6,
    agentMessage: "Here's your brand persona. This will guide every agent in your workspace — review it below.",
    type: 'summary',
  },
];

interface ConversationItem {
  id: string;
  variant: CardVariant;
  content: React.ReactNode;
}

export function OnboardingDesk() {
  const [currentStep, setCurrentStep] = useState(0);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [agentTyping, setAgentTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [completed, setCompleted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const step = STEPS[currentStep];

  // Auto-scroll on new conversation items
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [conversation, agentTyping]);

  // Start — show the first agent message
  useEffect(() => {
    if (currentStep === 0 && conversation.length === 0) {
      setAgentTyping(true);
      setTimeout(() => {
        setAgentTyping(false);
        setConversation([{ id: 'agent-0', variant: 'agent', content: STEPS[0].agentMessage }]);
        setIsListening(true);
      }, 1400);
    }
  }, []);

  // Move to next step with agent typing animation
  const advanceToStep = (stepIndex: number) => {
    setIsListening(false);

    if (stepIndex >= STEPS.length) {
      setCompleted(true);
      return;
    }

    setAgentTyping(true);
    setTimeout(() => {
      setAgentTyping(false);
      const nextStep = STEPS[stepIndex];
      setConversation((prev) => [
        ...prev,
        { id: `agent-${stepIndex}`, variant: 'agent', content: nextStep.agentMessage },
      ]);
      setCurrentStep(stepIndex);
      setIsListening(true);
    }, 1200);
  };

  // Handle free-text answer
  const handleSendText = () => {
    if (!inputValue.trim()) return;
    const answer = inputValue.trim();
    setInputValue('');

    setConversation((prev) => [
      ...prev,
      { id: `user-${currentStep}`, variant: 'user', content: answer },
    ]);
    setAnswers((prev) => ({ ...prev, [`step-${step.id}`]: answer }));

    setTimeout(() => advanceToStep(currentStep + 1), 500);
  };

  // Handle option selection
  const handleOptionConfirm = (selected: string[]) => {
    const labels = selected.map((id) => step.options?.find((o) => o.id === id)?.label || id);
    setConversation((prev) => [
      ...prev,
      { id: `user-${currentStep}`, variant: 'user', content: labels.join(', ') },
    ]);
    setAnswers((prev) => ({ ...prev, [`step-${step.id}`]: selected }));

    setTimeout(() => advanceToStep(currentStep + 1), 500);
  };

  // Generate the brand persona summary
  const generateSummary = (): string => {
    const business = answers['step-1'] || 'Your business';
    const industry = STEPS[1].options?.find((o) => o.id === answers['step-2'])?.label || 'Technology';
    const goals = (answers['step-3'] as string[] || []).map((id) => STEPS[2].options?.find((o) => o.id === id)?.label).filter(Boolean);
    const tools = (answers['step-4'] as string[] || []).map((id) => STEPS[3].options?.find((o) => o.id === id)?.label).filter(Boolean);
    const voice = answers['step-5'] || 'Professional yet approachable';

    return `**Business:** ${business}

**Industry:** ${industry}

**Voice & Tone:** ${voice}

**Primary Goals:** ${goals.join(', ') || 'Growth'}

**Tool Stack:** ${tools.join(', ') || 'To be configured'}

**Agent Alignment:** Your workspace agents will prioritize ${goals[0]?.toLowerCase() || 'growth'}-focused strategies, communicate in a ${voice.toLowerCase()} tone, and integrate with your ${tools.length} connected tools.`;
  };

  // Render the current step's interaction element
  const renderInteraction = () => {
    if (completed || agentTyping) return null;

    if (step.type === 'freetext') {
      return null;
    }

    if (step.type === 'single-select' && step.options) {
      return (
        <OptionSelector
          key={`step-${currentStep}`}
          options={step.options}
          onConfirm={handleOptionConfirm}
        />
      );
    }

    if (step.type === 'multi-select' && step.options) {
      return (
        <OptionSelector
          key={`step-${currentStep}`}
          options={step.options}
          multi
          maxSelections={step.maxSelections}
          onConfirm={handleOptionConfirm}
          confirmLabel={step.confirmLabel}
        />
      );
    }

    if (step.type === 'summary' && !completed) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: PREMIUM_EASE }}
          className="mt-2 mb-4"
        >
          <DeskCard variant="summary" delay={0.2}>
            <div className="v2-mono text-[13px] leading-[1.7] whitespace-pre-wrap">
              {generateSummary().split('\n').map((line, i) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <div key={i} className="v2-display text-[1.1rem] mt-3 mb-1" style={{ color: 'var(--v2-vermilion)' }}>{line.replace(/\*\*/g, '')}</div>;
                }
                if (line.startsWith('**')) {
                  const parts = line.split('**');
                  return <div key={i}><span className="font-semibold" style={{ color: 'var(--v2-paper-ink)' }}>{parts[1]}</span>{parts.slice(2).join('')}</div>;
                }
                return <div key={i}>{line || '\u00A0'}</div>;
              })}
            </div>
          </DeskCard>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.8, ease: PREMIUM_EASE }}
            className="flex justify-center mt-6"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-7 py-3.5 v2-label text-[12px] transition-all hover:scale-[1.02]"
              style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)', borderRadius: '10px', boxShadow: '0 4px 14px rgba(200,50,27,0.25)' }}
            >
              Enter the OS <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </motion.div>
      );
    }

    return null;
  };

  return (
    <div className="v2-scope min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'var(--v2-paper-ground)' }}>
      {/* Ambient layer — FlowingThreads at low opacity */}
      <div className="fixed inset-0 pointer-events-none" style={{ opacity: 0.3 }}>
        <FlowingThreads />
      </div>

      {/* Subtle ambient glow — warm vermilion, very faint */}
      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: '-15%',
          right: '-10%',
          width: '40vw',
          height: '40vh',
          background: 'var(--v2-vermilion)',
          filter: 'blur(140px)',
        }}
        animate={{ opacity: [0.02, 0.04, 0.02] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Wordmark — minimal, top-left */}
      <header className="flex-shrink-0 px-6 md:px-10 pt-8 pb-2 relative z-10">
        <div className="max-w-[720px] mx-auto flex items-center justify-between">
          <Link href="/" className="v2-display text-[1.125rem]" style={{ color: 'var(--v2-paper-ink)' }}>
            Doddle OS
          </Link>
          {/* Listening indicator — ambient pulse, replaces the progress thread */}
          <AnimatePresence>
            {isListening && !completed && !agentTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-2"
              >
                <motion.span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--v2-vermilion)' }}
                  animate={{ opacity: [1, 0.3, 1], scale: [1, 0.7, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="v2-mono text-[10px]" style={{ color: 'var(--v2-paper-ink-2)' }}>listening</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Chat area */}
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto px-6 md:px-10 relative z-10"
      >
        <div className="max-w-[720px] mx-auto flex flex-col py-4">
          <AnimatePresence>
            {conversation.map((item) => (
              <DeskCard key={item.id} variant={item.variant} delay={0}>
                {item.content}
              </DeskCard>
            ))}
          </AnimatePresence>

          {/* Agent typing indicator */}
          <AnimatePresence>
            {agentTyping && <AgentTyping />}
          </AnimatePresence>

          {/* Current step interaction */}
          {renderInteraction()}
        </div>
      </div>

      {/* Chat input — only for freetext steps */}
      <div className="flex-shrink-0 px-6 md:px-10 pb-6 pt-2 relative z-10">
        <div className="max-w-[720px] mx-auto">
          {!completed && !agentTyping && step?.type === 'freetext' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: PREMIUM_EASE }}
              className="flex items-center gap-2 p-1.5 rounded-[14px]"
              style={{
                background: 'rgba(255,255,255,0.55)',
                border: '1px solid var(--v2-paper-rule)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
                placeholder="Type your answer..."
                className="flex-1 bg-transparent px-3.5 py-2.5 text-[14px] outline-none"
                style={{ color: 'var(--v2-paper-ink)' }}
                autoFocus
              />
              <motion.button
                onClick={handleSendText}
                disabled={!inputValue.trim()}
                whileTap={{ scale: 0.92 }}
                className="w-10 h-10 rounded-[10px] flex items-center justify-center transition-colors flex-shrink-0"
                style={{
                  background: inputValue.trim() ? 'var(--v2-vermilion)' : 'var(--v2-paper-rule-strong)',
                  color: 'var(--v2-vermilion-ink)',
                  opacity: inputValue.trim() ? 1 : 0.4,
                  cursor: inputValue.trim() ? 'pointer' : 'default',
                }}
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}
          {/* Subtle hint when waiting for option selection */}
          {!completed && !agentTyping && step && step.type !== 'freetext' && step.type !== 'summary' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="v2-mono text-[10px] text-center"
              style={{ color: 'var(--v2-paper-ink-2)' }}
            >
              {step.type === 'single-select' ? 'tap to select' : `select up to ${step.maxSelections || 'all'}`}
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}

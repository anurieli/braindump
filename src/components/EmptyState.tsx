'use client'

import { useState } from 'react'
import { Brain, Lightbulb, Link2, Sparkles, Rocket, Network } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'

type ActionType = 'new' | 'demo' | null

const featureHighlights = [
  {
    icon: Lightbulb,
    title: 'Capture Ideas Fast',
    description: 'Type into the bottom input and press enter. Every thought drops directly onto the canvas.'
  },
  {
    icon: Link2,
    title: 'Connect Concepts',
    description: 'Hover any idea to reveal connection handles, then drag to build relationships.'
  },
  {
    icon: Sparkles,
    title: 'Organize Visually',
    description: 'Pan, zoom, and cluster ideas spatially to see how everything relates in context.'
  }
]

export default function EmptyState() {
  const [activeAction, setActiveAction] = useState<ActionType>(null)
  const [error, setError] = useState<string | null>(null)

  const createBrainDump = useStore(state => state.createBrainDump)
  const createDemoBrainDump = useStore(state => state.createDemoBrainDump)
  const loadIdeas = useStore(state => state.loadIdeas)
  const loadEdges = useStore(state => state.loadEdges)

  const handleCreate = async (mode: Exclude<ActionType, null>) => {
    setActiveAction(mode)
    setError(null)

    try {
      if (mode === 'demo') {
        // createDemoBrainDump already loads ideas/edges and switches to the new dump
        await createDemoBrainDump()
      } else {
        // For new brain dump, create it and then load ideas/edges
        const brainDumpId = await createBrainDump('My First Brain Dump')
        await Promise.all([
          loadIdeas(brainDumpId),
          loadEdges(brainDumpId)
        ])
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(message)
    } finally {
      setActiveAction(null)
    }
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-6 py-10">
      <div className="pointer-events-auto grid w-full max-w-5xl items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-950/65 p-10 text-white shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/10 p-4">
              <Brain className="h-12 w-12" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-wider text-white/70">You&apos;re ready to think spatially</p>
              <h1 className="text-4xl font-semibold">Brain Dump Canvas is empty… for now</h1>
            </div>
          </div>

          <p className="mt-6 text-lg leading-relaxed text-white/80">
            Start a blank canvas to capture thoughts from scratch, or jump into a guided demo with curated nodes and edges. Either way, you&apos;ll learn how to move, connect, and style ideas in under a minute.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {featureHighlights.map(feature => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="rounded-xl bg-white/15 p-2">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold">{feature.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-white/80">{feature.description}</p>
                </div>
              )
            })}
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Button
              size="lg"
              className="h-12 px-6 text-base font-semibold shadow-lg"
              onClick={() => handleCreate('new')}
              disabled={activeAction !== null}
            >
              {activeAction === 'new' ? 'Creating…' : 'Create New Brain Dump'}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="h-12 px-6 text-base font-semibold border border-white/40 bg-white/15 text-white hover:bg-white/20"
              onClick={() => handleCreate('demo')}
              disabled={activeAction !== null}
            >
              {activeAction === 'demo' ? 'Spinning up demo…' : 'Launch Demo Brain Dump'}
            </Button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200/80 bg-red-500/20 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3 text-sm text-white/80">
            <Rocket className="h-5 w-5" />
            <p>
              Tip: Press <span className="font-semibold">?</span> anytime to discover shortcuts.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/95 p-8 text-slate-900 shadow-2xl">
          <div className="flex items-center gap-3">
            <Network className="h-6 w-6 text-indigo-500" />
            <h2 className="text-xl font-semibold">How the demo is wired</h2>
          </div>
          <ul className="mt-6 space-y-3 text-sm text-slate-600">
            <li>
              <span className="font-medium text-slate-900">Guided ideas:</span> six nodes that explain capturing, connecting, and organizing thoughts.
            </li>
            <li>
              <span className="font-medium text-slate-900">Custom edges:</span> relationships pre-labelled with <code className="rounded bg-slate-100 px-2 py-0.5 text-xs">inspired_by</code>, <code className="rounded bg-slate-100 px-2 py-0.5 text-xs">prerequisite_for</code>, and more.
            </li>
            <li>
              <span className="font-medium text-slate-900">Playground ready:</span> move things around, delete, or add your own ideas—nothing will break.
            </li>
          </ul>
          <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/80 p-4 text-sm text-indigo-900">
            Prefer a blank slate? Create a new brain dump instead—we&apos;ll keep it totally empty so you can start from scratch.
          </div>
        </div>
      </div>
    </div>
  )
}



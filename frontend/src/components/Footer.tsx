import React from 'react'
import { ExternalLink, Database } from 'lucide-react'

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-800 bg-[#070b13] py-6 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-500" />
          <span>Contains BMRS data © Elexon Limited copyright and database right 2026.</span>
        </div>
        <div className="flex items-center gap-6 text-slate-400">
          <span>Decisions made in January 2026 (Delivery: 2 Jan – 1 Feb 2026)</span>
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
          >
            <span>OpenAPI Specification</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </footer>
  )
}

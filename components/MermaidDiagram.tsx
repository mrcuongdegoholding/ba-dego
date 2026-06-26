'use client';
import { useEffect, useRef, useState } from 'react';

interface Props {
  chart: string;
  className?: string;
}

export default function MermaidDiagram({ chart, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError('');
    setRendered(false);

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            primaryColor: '#EFF6FF',
            primaryTextColor: '#1e3a5f',
            primaryBorderColor: '#3B82F6',
            lineColor: '#6B7280',
            secondaryColor: '#F0FDF4',
            tertiaryColor: '#FEF9C3',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontSize: '14px',
          },
          flowchart: { curve: 'basis', padding: 20 },
        });

        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setRendered(true);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }

    render();
    return () => { cancelled = true; };
  }, [chart]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-600">
        <strong>Lỗi render diagram:</strong> {error}
      </div>
    );
  }

  return (
    <div className={`mermaid-wrapper overflow-auto rounded-xl border border-blue-100 bg-blue-50/30 p-4 ${className} ${rendered ? '' : 'animate-pulse min-h-[120px]'}`}>
      <div ref={ref} className="flex justify-center" />
      {!rendered && <div className="text-xs text-slate-400 text-center py-6">Đang render diagram...</div>}
    </div>
  );
}

'use client';
import { useEffect } from 'react';

export default function PrintButton({ autoPrint }: { autoPrint?: boolean }) {
  useEffect(() => {
    if (autoPrint) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [autoPrint]);

  return (
    <button
      onClick={() => window.print()}
      className="no-print print-btn"
      style={{
        position: 'fixed', bottom: 24, right: 24, background: '#2563eb', color: 'white',
        border: 'none', padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700,
        cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.4)', zIndex: 100,
      }}>
      🖨️ In / Xuất PDF
    </button>
  );
}

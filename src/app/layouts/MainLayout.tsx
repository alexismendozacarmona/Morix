import { useState } from 'react';
import { Outlet } from 'react-router';
import { BottomNav } from '../components/BottomNav';
import { ContentPreviewSheet } from '../components/ContentPreviewSheet';
import { PreviewProvider } from '../contexts/PreviewContext';
import { usePreview } from '../contexts/PreviewContext';
import type { Contenido } from '../data/mockData';

function LayoutInner() {
  const { previewItem, setPreviewItem } = usePreview();

  return (
    <div className="relative h-full overflow-hidden bg-[#030309]">
      {/* Scrollable content */}
      <div
        className="h-full overflow-y-auto no-scrollbar"
        style={{ paddingBottom: '108px', touchAction: 'pan-y' }}
      >
        <Outlet />
      </div>

      {/* Bottom nav fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(3,3,9,0.98) 0%, transparent 100%)', zIndex: 90 }}
      />

      {/* Floating bottom nav */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-5 pointer-events-none" style={{ zIndex: 100 }}>
        <div className="pointer-events-auto">
          <BottomNav />
        </div>
      </div>

      {/* Content preview sheet */}
      <ContentPreviewSheet
        item={previewItem}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  );
}

export default function MainLayout() {
  return (
    <PreviewProvider>
      <LayoutInner />
    </PreviewProvider>
  );
}
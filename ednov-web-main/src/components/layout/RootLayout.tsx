import * as React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useLayoutStore } from '@/stores/layoutStore';
import { useAuthStore } from '@/stores/authStore';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Toaster } from '@/components/ui/toaster';
import { HelpAssistantChat } from '@/components/help/HelpAssistantChat';
import { ModeProvider } from '@/contexts/ModeContext';
import { ApplicationContextProvider, CopilotShell } from '@/features/copilot';

export const RootLayout: React.FC = () => {
  const { sidebarWidth } = useLayoutStore();
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  // Calculer si le user a un mode hybride (peut basculer présentiel/distanciel)
  const isHybridRole = (user as any)?.mode === 'hybrid';
  const mainRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  const enableCopilot = import.meta.env.VITE_ENABLE_COPILOT !== 'false';

  return (
    <ModeProvider isHybridRole={isHybridRole}>
      <ApplicationContextProvider>
        <div className="flex h-full overflow-hidden">
          <Sidebar />

          <div
            className="flex flex-col flex-1 overflow-hidden transition-all duration-300"
            style={
              {
                '--sidebar-width': `${sidebarWidth}px`,
                marginLeft: `${sidebarWidth}px`,
              } as React.CSSProperties
            }
          >
            <Navbar />

            <main ref={mainRef} className="flex-1 overflow-y-auto p-6">
              <Outlet />
            </main>
          </div>

          <Toaster hasNavbar={true} />
          {enableCopilot ? <CopilotShell /> : <HelpAssistantChat />}
        </div>
      </ApplicationContextProvider>
    </ModeProvider>
  );
};

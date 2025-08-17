import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { AISettings } from './components/AISettings';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Toaster } from './components/ui/sonner';
import { Settings, MessageSquare, Zap, Shield } from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState<'dashboard' | 'settings'>('dashboard');

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <img src="/image.png" alt="Nardos Group" className="h-8 w-auto" />
                <div>
                  <h1 className="text-lg font-semibold">Nardos Group</h1>
                  <p className="text-xs text-gray-500">Asystent e‑mail (demo)</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">DEMO</Badge>
            </div>
            
            <nav className="flex gap-2">
              <Button
                variant={activeView === 'dashboard' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('dashboard')}
                className="flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Panel
              </Button>
              <Button
                variant={activeView === 'settings' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('settings')}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Ustawienia
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {activeView === 'dashboard' ? <Dashboard /> : <AISettings />}
      </main>

      {/* Floating Banners (stacked, right-bottom) */}
      <div className="fixed bottom-4 right-4 flex flex-col items-end gap-3 max-w-sm">
        <Card className="bg-gray-50 border-gray-200 p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">Wsparcie GP Group</p>
            <p className="text-xs text-gray-600">
              Aplikacja asystenta e‑mail jest dostarczana i wspierana przez GP Group.
            </p>
          </div>
        </Card>

        <Card className="bg-blue-50 border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Shield className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">Demo Aplikacji</p>
              <p className="text-xs text-blue-700">
                To jest demonstracyjna wersja aplikacji — niefunkcjonalna i przeznaczona wyłącznie do celów prezentacyjnych.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}
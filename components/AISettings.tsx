import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Settings, Brain, Database, MessageSquare, Save, Plus, X, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface AIConfig {
  confidenceThreshold: number;
  autoResponse: boolean;
  responseTemplate: string;
  companyName: string;
  contactEmail: string;
}

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  createdAt?: string;
}

interface LearningStats {
  approved: number;
  rejected: number;
  avgAccuracy: number;
  totalProcessed: number;
}

export function AISettings() {
  const [config, setConfig] = useState<AIConfig>({
    confidenceThreshold: 85,
    autoResponse: false,
    responseTemplate: '',
    companyName: '',
    contactEmail: ''
  });
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [stats, setStats] = useState<LearningStats>({
    approved: 0,
    rejected: 0,
    avgAccuracy: 0,
    totalProcessed: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKnowledgeItem, setNewKnowledgeItem] = useState({ title: '', content: '' });
  const [showNewItem, setShowNewItem] = useState(false);

  const apiCall = async (endpoint: string, options?: RequestInit) => {
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f77676c4${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load configuration
      const configResponse = await apiCall('/config');
      if (configResponse.success) {
        setConfig(configResponse.data);
      }
      
      // Load knowledge base
      const knowledgeResponse = await apiCall('/knowledge');
      if (knowledgeResponse.success) {
        setKnowledgeItems(knowledgeResponse.data);
      }
      
      // Load statistics
      const statsResponse = await apiCall('/stats');
      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Błąd podczas ładowania danych');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      const response = await apiCall('/config', {
        method: 'PUT',
        body: JSON.stringify(config)
      });
      
      if (response.success) {
        toast.success('Konfiguracja została zapisana');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Błąd podczas zapisywania konfiguracji');
    } finally {
      setSaving(false);
    }
  };

  const addKnowledgeItem = async () => {
    if (newKnowledgeItem.title && newKnowledgeItem.content) {
      try {
        const response = await apiCall('/knowledge', {
          method: 'POST',
          body: JSON.stringify(newKnowledgeItem)
        });
        
        if (response.success) {
          setKnowledgeItems(prev => [...prev, response.data]);
          setNewKnowledgeItem({ title: '', content: '' });
          setShowNewItem(false);
          toast.success('Element dodany do bazy wiedzy');
        }
      } catch (error) {
        console.error('Error adding knowledge item:', error);
        toast.error('Błąd podczas dodawania elementu');
      }
    }
  };

  const removeKnowledgeItem = async (id: string) => {
    try {
      const response = await apiCall(`/knowledge/${id}`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        setKnowledgeItems(prev => prev.filter(item => item.id !== id));
        toast.success('Element usunięty z bazy wiedzy');
      }
    } catch (error) {
      console.error('Error removing knowledge item:', error);
      toast.error('Błąd podczas usuwania elementu');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Ładowanie konfiguracji...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="mb-2">Ustawienia AI Assistant</h1>
          <p className="text-gray-600">Konfiguracja systemu automatycznych odpowiedzi</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Ogólne
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Baza wiedzy
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Uczenie
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Podstawowe ustawienia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Minimalny poziom pewności AI (%)</Label>
                    <div className="px-3">
                      <Slider
                        value={[config.confidenceThreshold]}
                        onValueChange={(value) => setConfig({...config, confidenceThreshold: value[0]})}
                        max={100}
                        min={50}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-gray-500 mt-1">
                        <span>50%</span>
                        <span className="font-medium">{config.confidenceThreshold}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      Sugestie z niższym poziomem pewności będą wymagały ręcznej weryfikacji
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Automatyczne odpowiedzi</Label>
                      <p className="text-sm text-gray-500">
                        Wysyłanie odpowiedzi z wysokim poziomem pewności bez weryfikacji
                      </p>
                    </div>
                    <Switch
                      checked={config.autoResponse}
                      onCheckedChange={(checked) => setConfig({...config, autoResponse: checked})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="response-template">Szablon odpowiedzi</Label>
                    <Textarea
                      id="response-template"
                      placeholder="Wprowadź podstawowy szablon odpowiedzi..."
                      value={config.responseTemplate}
                      onChange={(e) => setConfig({...config, responseTemplate: e.target.value})}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Nazwa firmy</Label>
                      <Input
                        id="company-name"
                        value={config.companyName}
                        onChange={(e) => setConfig({...config, companyName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">Email kontaktowy</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={config.contactEmail}
                        onChange={(e) => setConfig({...config, contactEmail: e.target.value})}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status systemu</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Status AI</span>
                      </div>
                      <p className="font-medium">Aktywny</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Model</span>
                      </div>
                      <p className="font-medium">GPT-4 Turbo</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="knowledge">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Baza wiedzy o firmie</CardTitle>
                  <Button
                    size="sm"
                    onClick={() => setShowNewItem(true)}
                    disabled={showNewItem}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Dodaj element
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {showNewItem && (
                        <Card className="border-blue-200 bg-blue-50">
                          <CardContent className="p-4 space-y-4">
                            <div className="space-y-2">
                              <Label>Tytuł</Label>
                              <Input
                                value={newKnowledgeItem.title}
                                onChange={(e) => setNewKnowledgeItem({
                                  ...newKnowledgeItem,
                                  title: e.target.value
                                })}
                                placeholder="np. Cennik usług..."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Treść</Label>
                              <Textarea
                                value={newKnowledgeItem.content}
                                onChange={(e) => setNewKnowledgeItem({
                                  ...newKnowledgeItem,
                                  content: e.target.value
                                })}
                                placeholder="Wprowadź szczegółowe informacje..."
                                rows={4}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={addKnowledgeItem}>
                                <Save className="h-4 w-4 mr-1" />
                                Zapisz
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setShowNewItem(false)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Anuluj
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {knowledgeItems.map((item) => (
                        <Card key={item.id}>
                          <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <h4 className="font-medium">{item.title}</h4>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => removeKnowledgeItem(item.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </CardHeader>
                          <CardContent>
                            <div className="rounded bg-gray-50 p-3">
                              <pre className="text-sm whitespace-pre-wrap">{item.content}</pre>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="training">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Statystyki uczenia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-green-600">{stats.approved}</p>
                      <p className="text-sm text-gray-600">Zaakceptowane odpowiedzi</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-red-600">{stats.rejected}</p>
                      <p className="text-sm text-gray-600">Odrzucone odpowiedzi</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-blue-600">{stats.avgAccuracy}%</p>
                      <p className="text-sm text-gray-600">Średnia trafność</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ostatnie poprawki modelu</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { date: '2024-12-15', change: 'Aktualizacja cennika usług brandingowych', impact: '+5% trafność' },
                      { date: '2024-12-14', change: 'Dodano informacje o nowych usługach SEO', impact: '+3% trafność' },
                      { date: '2024-12-13', change: 'Poprawiono odpowiedzi dotyczące czasów realizacji', impact: '+4% trafność' }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{item.change}</p>
                          <p className="text-xs text-gray-500">{item.date}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          {item.impact}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ustawienia uczenia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Automatyczne uczenie</Label>
                      <p className="text-sm text-gray-500">
                        Model uczy się automatycznie z zaakceptowanych odpowiedzi
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Powiadomienia o poprawkach</Label>
                      <p className="text-sm text-gray-500">
                        Otrzymuj informacje o aktualizacjach modelu
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end gap-4">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Resetuj ustawienia
          </Button>
          <Button onClick={saveConfig} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Zapisywanie...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Zapisz zmiany
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
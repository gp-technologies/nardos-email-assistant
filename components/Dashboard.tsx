import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { CheckCircle, XCircle, MessageSquare, Clock, TrendingUp, Settings, Plus, Loader2, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey, functionName } from '../utils/supabase/info';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';

interface Inquiry {
  id: string;
  customerName: string;
  email: string;
  subject: string;
  message: string;
  aiSuggestion: string;
  finalResponse?: string;
  confidence: number;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  category: 'pricing' | 'timeline' | 'product' | 'general';
}

export function Dashboard() {
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isNewInquiryOpen, setIsNewInquiryOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editedResponse, setEditedResponse] = useState('');
  const [newInquiry, setNewInquiry] = useState({
    customerName: '',
    email: '',
    subject: '',
    message: '',
    category: 'general' as const
  });

  const apiCall = async (endpoint: string, options?: RequestInit) => {
    const base = `https://${projectId}.supabase.co/functions/v1/${functionName}`;
    const url = `${base}${endpoint}`;
    const response = await fetch(url, {
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

  const loadInquiries = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/inquiries');
      if (response.success) {
        setInquiries(response.data);
      }
    } catch (error) {
      console.error('Error loading inquiries:', error);
      toast.error('Błąd podczas ładowania zapytań');
    } finally {
      setLoading(false);
    }
  };

  const refreshInquiries = async () => {
    try {
      setRefreshing(true);
      const response = await apiCall('/inquiries');
      if (response.success) {
        setInquiries(response.data);
        toast.success('Lista zapytań została odświeżona');
      }
    } catch (error) {
      console.error('Error refreshing inquiries:', error);
      toast.error('Błąd podczas odświeżania');
    } finally {
      setRefreshing(false);
    }
  };

  const handleApprove = async (inquiryId: string) => {
    try {
      const response = await apiCall(`/inquiries/${inquiryId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'approved' })
      });
      
      if (response.success) {
        setInquiries(prev => prev.map(inquiry => 
          inquiry.id === inquiryId ? { ...inquiry, status: 'approved' } : inquiry
        ));
        toast.success('Odpowiedź została zaakceptowana');
      }
    } catch (error) {
      console.error('Error approving inquiry:', error);
      toast.error('Błąd podczas akceptacji');
    }
  };

  const handleReject = async (inquiryId: string) => {
    try {
      const response = await apiCall(`/inquiries/${inquiryId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'rejected' })
      });
      
      if (response.success) {
        setInquiries(prev => prev.map(inquiry => 
          inquiry.id === inquiryId ? { ...inquiry, status: 'rejected' } : inquiry
        ));
        toast.success('Odpowiedź została odrzucona');
      }
    } catch (error) {
      console.error('Error rejecting inquiry:', error);
      toast.error('Błąd podczas odrzucenia');
    }
  };

  const openEditDialog = () => {
    if (!selectedInquiry) return;
    setEditedResponse(selectedInquiry.finalResponse || selectedInquiry.aiSuggestion || '');
    setIsEditOpen(true);
  };

  const handleEditAndSend = async () => {
    if (!selectedInquiry) return;
    try {
      const response = await apiCall(`/inquiries/${selectedInquiry.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'approved', finalResponse: editedResponse })
      });

      if (response.success) {
        setInquiries(prev => prev.map(inquiry => 
          inquiry.id === selectedInquiry.id ? { ...inquiry, status: 'approved', finalResponse: editedResponse } : inquiry
        ));
        setSelectedInquiry(prev => prev ? { ...prev, status: 'approved', finalResponse: editedResponse } as Inquiry : prev);
        setIsEditOpen(false);
        toast.success('Odpowiedź została wysłana');
      }
    } catch (error) {
      console.error('Error sending edited response:', error);
      toast.error('Błąd podczas wysyłania odpowiedzi');
    }
  };

  const handleCreateInquiry = async () => {
    try {
      const response = await apiCall('/inquiries', {
        method: 'POST',
        body: JSON.stringify(newInquiry)
      });
      
      if (response.success) {
        setInquiries(prev => [response.data, ...prev]);
        setNewInquiry({
          customerName: '',
          email: '',
          subject: '',
          message: '',
          category: 'general'
        });
        setIsNewInquiryOpen(false);
        toast.success('Zapytanie zostało dodane');
      }
    } catch (error) {
      console.error('Error creating inquiry:', error);
      toast.error('Błąd podczas tworzenia zapytania');
    }
  };

  useEffect(() => {
    // Initialize data and load inquiries
    const initialize = async () => {
      try {
        await apiCall('/init');
        await loadInquiries();
      } catch (error) {
        console.error('Error initializing:', error);
        toast.error('Błąd podczas inicjalizacji');
      }
    };
    
    initialize();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'pricing': return 'bg-blue-100 text-blue-800';
      case 'timeline': return 'bg-purple-100 text-purple-800';
      case 'product': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = {
    pending: inquiries.filter(i => i.status === 'pending').length,
    approved: inquiries.filter(i => i.status === 'approved').length,
    avgConfidence: inquiries.length > 0 ? Math.round(inquiries.reduce((acc, i) => acc + i.confidence, 0) / inquiries.length) : 0
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Ładowanie danych...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2">Nardos House - AI Response Assistant</h1>
            <p className="text-gray-600">Automatyczne sugestie odpowiedzi na zapytania klientów</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshInquiries}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Odśwież
            </Button>
            
            <Dialog open={isNewInquiryOpen} onOpenChange={setIsNewInquiryOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj zapytanie
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Nowe zapytanie klienta</DialogTitle>
                  <DialogDescription>
                    Dodaj nowe zapytanie klienta, aby wygenerować automatyczną sugestię odpowiedzi AI.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerName">Imię i nazwisko</Label>
                      <Input
                        id="customerName"
                        value={newInquiry.customerName}
                        onChange={(e) => setNewInquiry({...newInquiry, customerName: e.target.value})}
                        placeholder="Jan Kowalski"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newInquiry.email}
                        onChange={(e) => setNewInquiry({...newInquiry, email: e.target.value})}
                        placeholder="jan@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Temat</Label>
                    <Input
                      id="subject"
                      value={newInquiry.subject}
                      onChange={(e) => setNewInquiry({...newInquiry, subject: e.target.value})}
                      placeholder="Zapytanie o usługi..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategoria</Label>
                    <Select value={newInquiry.category} onValueChange={(value) => setNewInquiry({...newInquiry, category: value as any})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pricing">Wycena</SelectItem>
                        <SelectItem value="timeline">Czas realizacji</SelectItem>
                        <SelectItem value="product">Produkt</SelectItem>
                        <SelectItem value="general">Ogólne</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Wiadomość</Label>
                    <Textarea
                      id="message"
                      value={newInquiry.message}
                      onChange={(e) => setNewInquiry({...newInquiry, message: e.target.value})}
                      placeholder="Treść zapytania klienta..."
                      rows={4}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsNewInquiryOpen(false)}>
                    Anuluj
                  </Button>
                  <Button onClick={handleCreateInquiry}>
                    Utwórz zapytanie
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Oczekujące</p>
                  <p className="text-2xl font-semibold">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Zaakceptowane</p>
                  <p className="text-2xl font-semibold">{stats.approved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Średnia pewność AI</p>
                  <p className="text-2xl font-semibold">{stats.avgConfidence}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Wszystkie zapytania</p>
                  <p className="text-2xl font-semibold">{inquiries.length}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Inquiries List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Zapytania klientów
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  {inquiries.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Brak zapytań do wyświetlenia</p>
                      <p className="text-sm">Dodaj nowe zapytanie, aby rozpocząć</p>
                    </div>
                  ) : (
                    inquiries.map((inquiry) => (
                      <div
                        key={inquiry.id}
                        className={`cursor-pointer border-b p-4 transition-colors hover:bg-gray-50 ${
                          selectedInquiry?.id === inquiry.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => setSelectedInquiry(inquiry)}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <p className="font-medium">{inquiry.customerName}</p>
                          <Badge className={`text-xs ${getStatusColor(inquiry.status)}`}>
                            {inquiry.status === 'pending' ? 'Oczekuje' : 
                             inquiry.status === 'approved' ? 'Zaakceptowane' : 'Odrzucone'}
                          </Badge>
                        </div>
                        <p className="mb-2 text-sm font-medium text-gray-900 line-clamp-2">{inquiry.subject}</p>
                        <div className="flex items-center justify-between">
                          <Badge className={`text-xs ${getCategoryColor(inquiry.category)}`}>
                            {inquiry.category === 'pricing' ? 'Wycena' :
                             inquiry.category === 'timeline' ? 'Czas realizacji' :
                             inquiry.category === 'product' ? 'Produkt' : 'Ogólne'}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(inquiry.timestamp).toLocaleString('pl-PL', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Selected Inquiry Detail */}
          <div className="lg:col-span-3">
            {selectedInquiry ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Szczegóły zapytania</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:bg-green-50"
                        onClick={() => handleApprove(selectedInquiry.id)}
                        disabled={selectedInquiry.status !== 'pending'}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Akceptuj
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleReject(selectedInquiry.id)}
                        disabled={selectedInquiry.status !== 'pending'}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Odrzuć
                      </Button>
                      <Button
                        size="sm"
                        onClick={openEditDialog}
                        disabled={selectedInquiry.status !== 'pending'}
                      >
                        Modyfikuj i wyślij
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="inquiry" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="inquiry">Zapytanie klienta</TabsTrigger>
                      <TabsTrigger value="suggestion">Sugestia AI</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="inquiry" className="mt-4">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-gray-600">Klient:</label>
                          <p>{selectedInquiry.customerName} ({selectedInquiry.email})</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Temat:</label>
                          <p>{selectedInquiry.subject}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Kategoria:</label>
                          <Badge className={`${getCategoryColor(selectedInquiry.category)} ml-2`}>
                            {selectedInquiry.category === 'pricing' ? 'Wycena' :
                             selectedInquiry.category === 'timeline' ? 'Czas realizacji' :
                             selectedInquiry.category === 'product' ? 'Produkt' : 'Ogólne'}
                          </Badge>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Wiadomość:</label>
                          <div className="mt-1 rounded-lg bg-gray-50 p-4">
                            <p className="whitespace-pre-wrap">{selectedInquiry.message}</p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="suggestion" className="mt-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-gray-600">Sugestia AI:</label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Pewność:</span>
                            <Badge className="bg-blue-100 text-blue-800">
                              {selectedInquiry.confidence}%
                            </Badge>
                          </div>
                        </div>
                        {selectedInquiry.finalResponse ? (
                          <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                            <p className="text-sm text-gray-600 mb-2">Ostateczna odpowiedź</p>
                            <p className="whitespace-pre-wrap">{selectedInquiry.finalResponse}</p>
                          </div>
                        ) : (
                          <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                            <p className="text-sm text-gray-600 mb-2">Sugestia AI</p>
                            <p className="whitespace-pre-wrap">{selectedInquiry.aiSuggestion}</p>
                          </div>
                        )}
                        <div className="text-sm text-gray-500">
                          <p>Sugestia wygenerowana na podstawie:</p>
                          <ul className="ml-4 mt-1 list-disc space-y-1">
                            <li>Bazy wiedzy o firmie Nardos House</li>
                            <li>Historii podobnych zapytań</li>
                            <li>Aktualnego cennika i dostępności</li>
                            <li>Kategorii zapytania: {selectedInquiry.category}</li>
                          </ul>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                  <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Edytuj odpowiedź przed wysłaniem</DialogTitle>
                        <DialogDescription>
                          Zmodyfikuj treść sugerowanej odpowiedzi przed zatwierdzeniem i wysyłką.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2">
                        <Label>Treść odpowiedzi</Label>
                        <Textarea
                          value={editedResponse}
                          onChange={(e) => setEditedResponse(e.target.value)}
                          rows={6}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Anuluj</Button>
                        <Button onClick={handleEditAndSend}>Wyślij</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-[600px]">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Wybierz zapytanie z listy, aby zobaczyć szczegóły</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {inquiries.length === 0 ? 'Dodaj pierwsze zapytanie, aby rozpocząć pracę' : 'Kliknij na dowolne zapytanie po lewej stronie'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
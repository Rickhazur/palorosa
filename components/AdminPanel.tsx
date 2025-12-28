
import React, { useRef, useState } from 'react';
import { Product, Offer } from '../types';
import { Plus, Camera, Lock, RefreshCw, Flower2, Sprout, Gift, Star, Gem, Trash2, Wand2, Sparkles, Image as ImageIcon, Upload, Check, X, MessageSquarePlus, Send } from 'lucide-react';
import { generateFloralInspiration, analyzeFloralImage, refineFloralPrompt } from '../services/geminiService';

interface AdminPanelProps {
  products: Product[];
  offers: Offer[];
  onUpdateProduct: (product: Product) => void;
  onAddProduct: (product: Product) => void;
  onResetProducts: () => void;
  onAddOffer: (offer: Offer) => void;
  onDeleteOffer: (id: string) => void;
  adminPassword: string;
  onUpdatePassword: (newPass: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  products,
  onUpdateProduct,
  onAddProduct,
  onResetProducts,
  adminPassword,
  onUpdatePassword
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'studio' | 'settings'>('inventory');

  // States for Image Handling
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<Product>>({});

  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', description: '', price: 0, category: 'flowers', image: ''
  });

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // New Camera Logic
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [refinementText, setRefinementText] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      // DEBUG: Verify API Key existence
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        alert("⚠️ CRÍTICO: No se detectó la API Key en VITE_GEMINI_API_KEY. La Inteligencia Artificial no funcionará.");
      }

      setIsCameraOpen(true);
      setAnalysisResult(null); // Reset previous analysis
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Prefer back camera on mobile
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("No se pudo acceder a la cámara. Asegúrate de dar permisos.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Match canvas dimensions to video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.85);

        // TRIGGER AI ANALYSIS
        setIsAnalyzing(true);
        analyzeFloralImage(base64)
          .then(result => {
            setAnalysisResult(result);
            setIsAnalyzing(false);
          })
          .catch(err => {
            console.error("AI Analysis failed", err);
            setAnalysisResult("No se pudo conectar con el Arquitecto Floral.");
            setIsAnalyzing(false);
          });

        if (editingId) {
          setEditFields(prev => ({ ...prev, image: base64 }));
        } else {
          setNewProduct(prev => ({ ...prev, image: base64 }));
        }
        // Don't stop camera yet, let user see result or capture again
        // stopCamera();
      }
    }
  };

  const categories = [
    { id: 'flowers', label: 'Ramos', icon: <Flower2 size={16} /> },
    { id: 'plants', label: 'Plantas', icon: <Sprout size={16} /> },
    { id: 'orchids', label: 'Orquídeas', icon: <Star size={16} /> },
    { id: 'gifts', label: 'Regalos', icon: <Gift size={16} /> },
    { id: 'preserved', label: 'Eternas', icon: <Gem size={16} /> },
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassword === adminPassword) setIsAuthenticated(true);
    else alert("Contraseña incorrecta");
  };

  const processFile = async (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1200; // Un poco más de calidad para el estudio
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.85);

          if (editingId) {
            setEditFields(prev => ({ ...prev, image: base64 }));
          } else {
            setNewProduct(prev => ({ ...prev, image: base64 }));
          }
        }
      };
    };
    reader.readAsDataURL(file);

    // Resetear los inputs para permitir subir la misma foto si se desea
    if (uploadInputRef.current) uploadInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleAiInspiration = async () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    const result = await generateFloralInspiration(aiPrompt);
    if (result) {
      setNewProduct(prev => ({ ...prev, image: result }));
      setActiveTab('inventory');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      alert("No se pudo generar la imagen. Verifica tu conexión o API Key.");
    }
    setIsGenerating(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 bg-gray-50">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-rose-100 max-w-md w-full text-center">
          <div className="inline-flex p-4 bg-rose-50 rounded-full text-rose-600 mb-6">
            <Lock size={32} />
          </div>
          <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">Panel de Control</h2>
          <p className="text-gray-500 mb-8 font-light italic">"Solo manos autorizadas para este jardín"</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Contraseña Maestra"
              className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-rose-300 outline-none transition-all text-center text-lg"
              value={inputPassword}
              onChange={e => setInputPassword(e.target.value)}
              autoFocus
            />
            <button className="w-full bg-rose-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-rose-700 transition-all shadow-lg shadow-rose-200">
              Entrar al Estudio
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 pt-10">
      {/* Header Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-gray-900">Estudio Palo Rosa</h1>
          <p className="text-gray-500 mt-1 italic font-light">Crea, captura y florece tu inventario</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-rose-100">
          {[
            { id: 'inventory', label: 'Inventario', icon: <ImageIcon size={16} /> },
            { id: 'settings', label: 'Seguridad', icon: <Lock size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-rose-600 text-white shadow-md' : 'text-gray-400 hover:text-rose-600'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'inventory' && (
        <div className="space-y-12">
          {/* New Product Form */}
          <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-rose-100 shadow-xl shadow-rose-900/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Flower2 size={120} className="text-rose-900" />
            </div>

            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-8 flex items-center gap-3">
              <Plus className="text-rose-600" /> Nuevo Producto
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Media Capture Section */}
              <div className="lg:col-span-4 space-y-4">
                <div
                  onClick={async () => {
                    if (newProduct.image) {
                      try {
                        // 1. Prepare Image for Clipboard
                        const response = await fetch(newProduct.image);
                        const blob = await response.blob();

                        await navigator.clipboard.write([
                          new ClipboardItem({
                            [blob.type]: blob
                          })
                        ]);

                        // 2. Open Gemini with Prompt in URL
                        // Note: We use the system prompt defined in prompts.ts
                        // Better: Use the imported constant if available, or just the text the user wants. 
                        // Since I can't easily see the import in this chunk, I will copy the prompt text here for reliability 
                        // OR rely on the import I see at the top of the file in previous views. 
                        // Analysis showed `import { ... } from '../services/geminiService';` but prompts might not be imported.
                        // I will add the import or hardcode the prompt string here to ensure it works properly without import errors.

                        const fullPrompt = `### System Role & Persona
You are **"FloraVision,"** an elite Floral Designer, Master Botanist, and AI Art Director specializing in high-end commercial floristry and photorealistic digital art.

### Context & Objective
Your goal is to take this input image and transform it into a **spectacular, high-fidelity text-to-image prompt**.

### Step-by-Step Instructions
1.  **Analyze the Input Image**: Flowers, color palette, style, lighting.
2.  **Enhance & Elevate**: Add luxury adjectives (dew-kissed, velvety, etc.).
3.  **Generate the Output**: Create **three (3)** distinct variations.

### Output Constraints
- Language: English for prompts, Spanish for analysis.
- Format:
**Analysis (Spanish)**
**Option 1: Commercial**
**Option 2: Cinematic**
**Option 3: Macro**`;

                        const url = `https://gemini.google.com/app?text=${encodeURIComponent(fullPrompt)}`;
                        window.open(url, '_blank');

                        alert("✅ Imagen copiada al portapapeles.\n1. Pega la imagen en Gemini (Ctrl+V).\n2. El prompt ya está escrito.\n3. ¡Genera!");

                        // Also show the "Upload Result" overlay so they can put it back
                        // We can trigger the modal state without camera just for the "Upload" button visibility?
                        // Or we just rely on the Gallery button? 
                        // The user said: "yo escojo la foto y eso es la que reemplaza la original". 
                        // So we should probably keep the "Upload Result" UI accessible. 
                        // Let's show a special 'Waiting for AI' mode or just keep it simple.

                      } catch (err) {
                        console.error("Clipboard Error:", err);
                        alert("No se pudo copiar la imagen automáticamente. Intenta descargarla o subirla manualmente.");
                        window.open('https://gemini.google.com/app', '_blank');
                      }
                    } else {
                      startCamera();
                    }
                  }}
                  className="aspect-square bg-rose-50 rounded-[2.5rem] border-2 border-dashed border-rose-200 overflow-hidden relative group cursor-pointer"
                >
                  {newProduct.image ? (
                    <img src={newProduct.image} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                      <ImageIcon size={48} className="text-rose-200 mb-4" />
                      <p className="text-xs font-bold text-rose-300 uppercase tracking-widest">Toca para Tomar Foto</p>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-rose-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4 text-white">
                    <p className="font-bold text-xs uppercase tracking-widest">Click para Gemini</p>
                    <div className="p-4 bg-white text-rose-600 rounded-full shadow-xl">
                      <Sparkles size={24} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={startCamera}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
                  >
                    <Camera size={14} /> Tomar Foto
                  </button>
                  <button
                    onClick={() => uploadInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors"
                  >
                    <Upload size={14} /> Galería / Resultado
                  </button>
                </div>
                {/* Dedicated Return Button */}
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        processFile(e.target.files[0]);
                        alert("¡Imagen actualizada! ✨");
                      }
                    }}
                  />
                  <button className="w-full py-3 bg-gradient-to-r from-gray-900 to-black text-rose-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all flex items-center justify-center gap-2 border border-rose-900/30">
                    <Wand2 size={14} /> Reemplazar con Imagen IA
                  </button>
                </div>

                {/* LINK DIRECTO GEMINI (SOLICITUD USUARIO) */}
                <div className="text-center pt-2">
                  <button
                    onClick={async () => {
                      if (!newProduct.image) {
                        alert("Primero sube una foto de referencia.");
                        return;
                      }
                      try {
                        const response = await fetch(newProduct.image);
                        const blob = await response.blob();
                        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);

                        const geminiPrompt = "You are an elite floral photographer. Look at this reference image. Generate 4 SPECTACULAR, high-fidelity, photorealistic variations of this arrangement for a sales catalog. Styles: 1. Luxury Commercial (Clean background), 2. Dramatic/Moody (Cinematic lighting), 3. Lifestyle (In a beautiful home), 4. Macro Detail. Quality: 8k, Ultra-realistic.";
                        const url = `https://gemini.google.com/app?text=${encodeURIComponent(geminiPrompt)}`;
                        window.open(url, '_blank');
                        alert("✅ Imagen copiada. ¡Pégala en Gemini (Ctrl+V) y dale Enter!");
                      } catch (e) {
                        alert("No se pudo copiar la imagen. Descárgala primero.");
                        window.open("https://gemini.google.com/app", "_blank");
                      }
                    }}
                    className="text-rose-500 hover:text-rose-700 text-xs font-bold underline cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Sparkles size={12} /> Link: Generar 4 Variaciones en Gemini
                  </button>
                </div>

                <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">Resonancia floral en cada captura</p>
              </div>

              {/* Info Section */}
              <div className="lg:col-span-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nombre Comercial</label>
                    <input
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                      placeholder="Ej. Ramo Amanecer Rosa"
                      value={newProduct.name}
                      onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Precio sugerido (COP)</label>
                    <input
                      type="number"
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                      placeholder="0.00"
                      value={newProduct.price || ''}
                      onChange={e => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Descripción del Arreglo</label>
                  <textarea
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-rose-200 outline-none transition-all h-24 resize-none"
                    placeholder="Cuenta la historia detrás de estas flores..."
                    value={newProduct.description}
                    onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Categoría</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setNewProduct({ ...newProduct, category: cat.id as any })}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${newProduct.category === cat.id ? 'border-rose-600 bg-rose-50 text-rose-600' : 'border-transparent bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                      >
                        {cat.icon}
                        <span className="text-[9px] font-black uppercase tracking-tighter text-center">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (newProduct.name && newProduct.price && newProduct.image) {
                      onAddProduct({
                        id: Date.now().toString(),
                        ...newProduct as Product
                      });
                      setNewProduct({ name: '', description: '', price: 0, category: 'flowers', image: '' });
                    } else {
                      alert("Completa todos los datos y la imagen antes de publicar.");
                    }
                  }}
                  className="w-full bg-rose-950 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-rose-950/20 hover:bg-rose-900 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <Check size={20} /> Publicar en la Web
                </button>
              </div>
            </div>
          </div>

          {/* Catalog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <div key={product.id} className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all group flex flex-col">
                <div className="h-48 relative overflow-hidden">
                  <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={product.name} />
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={() => confirm('¿Eliminar del catálogo?') && onUpdateProduct({ ...product, id: 'DELETE_ME' } as any)}
                      className="p-2 bg-white/20 backdrop-blur-md text-white hover:bg-rose-600 rounded-full transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-serif font-bold text-gray-900 mb-1 line-clamp-1">{product.name}</h3>
                  <p className="text-rose-600 font-bold text-sm mb-4">${product.price.toLocaleString()}</p>
                  <div className="mt-auto flex gap-2">
                    <span className="flex-1 px-3 py-1.5 bg-gray-50 rounded-lg text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center justify-center gap-2">
                      {categories.find(c => c.id === product.category)?.icon}
                      {categories.find(c => c.id === product.category)?.label}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center pt-8">
            <button
              onClick={() => confirm('¿Restaurar inventario?') && onResetProducts()}
              className="text-gray-300 hover:text-rose-400 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <RefreshCw size={12} /> Restaurar catálogo inicial
            </button>
          </div>
        </div>
      )}



      {activeTab === 'settings' && (
        <div className="max-w-md mx-auto py-12">
          <div className="bg-white p-10 rounded-[3rem] border border-rose-100 shadow-xl space-y-8">
            <div className="text-center">
              <div className="inline-flex p-4 bg-gray-50 text-gray-400 rounded-3xl mb-4">
                <Lock size={32} />
              </div>
              <h2 className="text-2xl font-serif font-bold text-gray-900">Seguridad</h2>
              <p className="text-gray-500 text-sm font-light">Control de acceso al jardín</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nueva Contraseña Maestra</label>
                <input
                  type="password"
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:bg-white focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                  placeholder="••••••••"
                  onChange={e => setInputPassword(e.target.value)}
                />
              </div>
              <button
                onClick={() => {
                  if (inputPassword) {
                    onUpdatePassword(inputPassword);
                    alert("Contraseña actualizada con éxito");
                  }
                }}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
              >
                Actualizar Acceso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inputs Ocultos para Multimedia - Se usa display:none para mejor compatibilidad con triggers programáticos */}
      <input
        type="file"
        style={{ display: 'none' }}
        ref={uploadInputRef}
        accept="image/*"
        onChange={e => e.target.files?.[0] && processFile(e.target.files[0])}
      />
      <input
        type="file"
        style={{ display: 'none' }}
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={e => e.target.files?.[0] && processFile(e.target.files[0])}
      />

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-black rounded-3xl overflow-hidden shadow-2xl border border-gray-800">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-[60vh] object-cover bg-gray-900"
            />
            <canvas ref={canvasRef} className="hidden" />

            <button
              onClick={stopCamera}
              className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-red-900/50 transition-colors"
            >
              <X size={24} />
            </button>

            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/50 to-transparent flex flex-col items-center gap-4">

              {isAnalyzing && (
                <div className="bg-black/80 text-white px-6 py-4 rounded-xl flex items-center gap-3 backdrop-blur-md border border-rose-500/50 mb-4 animate-pulse shadow-2xl shadow-rose-900/50">
                  <Sparkles className="animate-spin text-rose-400" size={24} />
                  <div className="text-left">
                    <p className="text-sm font-bold uppercase tracking-widest text-rose-200">Analizando...</p>
                    <p className="text-[10px] text-gray-400">Conectando con el Arquitecto Floral</p>
                  </div>
                </div>
              )}

              <div className="flex gap-6 items-center">
                {/* Main Capture Button */}
                <button
                  onClick={capturePhoto}
                  className="p-1 rounded-full border-4 border-white/30 hover:scale-105 transition-transform"
                >
                  <div className="w-16 h-16 bg-white rounded-full border-4 border-black shadow-lg" />
                </button>

                {/* Manual Re-Analyze Trigger (Only if image exists but no result yet) */}
                {!isAnalyzing && !analysisResult && (
                  <button
                    onClick={() => {
                      if (canvasRef.current) {
                        const base64 = canvasRef.current.toDataURL('image/jpeg', 0.85);
                        setIsAnalyzing(true);
                        analyzeFloralImage(base64)
                          .then(result => {
                            setAnalysisResult(result);
                            setIsAnalyzing(false);
                          })
                          .catch(err => {
                            alert(`Error manual: ${err}`);
                            setAnalysisResult(`Error: ${err}`);
                            setIsAnalyzing(false);
                          });
                      } else {
                        alert("Primero captura una foto.");
                      }
                    }}
                    className="p-3 rounded-full bg-white/10 hover:bg-rose-600 transition-colors border border-white/20 text-white"
                    title="Forzar Análisis"
                  >
                    <Wand2 size={24} />
                  </button>
                )}
              </div>
            </div>

            {/* Analysis Result Overlay */}
            {analysisResult && (
              <div className="absolute inset-x-4 bottom-24 top-20 bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 p-6 overflow-y-auto animate-fade-in-up flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-serif font-bold text-rose-300 flex items-center gap-2">
                    <Sparkles size={20} /> Visión del Arquitecto
                  </h3>
                  <button
                    onClick={() => setAnalysisResult(null)}
                    className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <X size={16} className="text-white" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 mb-4 pr-2">
                  {(() => {
                    // Simple parser for the structured response
                    const sections = analysisResult.split(/\*\*(Option \d+|Analysis|Análisis).*?\*\*:/g).filter(s => s.trim());
                    // The split might keep the delimiters or not depending on browser regex implementation with capturing groups, 
                    // but since we didn't use capturing groups for the whole delimiter in a way that preserves it usually in simple splits, 
                    // let's try a robust approach: matching the headers.

                    // Actually, let's just parse manually for robustness
                    const parts = [];
                    const lines = analysisResult.split('\n');
                    let currentSection = { title: 'Intro', content: '' };

                    lines.forEach(line => {
                      if (line.includes('**Analysis') || line.includes('**Análisis')) {
                        if (currentSection.content.trim()) parts.push(currentSection);
                        currentSection = { title: 'Análisis Visual', content: '' };
                      } else if (line.includes('**Option 1') || line.includes('Option 1:')) {
                        if (currentSection.content.trim()) parts.push(currentSection);
                        currentSection = { title: 'Opción 1: Comercial Hiper-Realista', content: '' };
                      } else if (line.includes('**Option 2') || line.includes('Option 2:')) {
                        if (currentSection.content.trim()) parts.push(currentSection);
                        currentSection = { title: 'Opción 2: Cinemático/Moody', content: '' };
                      } else if (line.includes('**Option 3') || line.includes('Option 3:')) {
                        if (currentSection.content.trim()) parts.push(currentSection);
                        currentSection = { title: 'Opción 3: Macro/Detalle', content: '' };
                      } else {
                        currentSection.content += line + '\n';
                      }
                    });
                    if (currentSection.content.trim()) parts.push(currentSection);

                    return parts.map((part, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border ${part.title.includes('Opción') ? 'bg-white/5 border-rose-500/30' : 'bg-transparent border-transparent'}`}>
                        <h4 className="text-sm font-bold text-rose-200 uppercase tracking-widest mb-2">{part.title}</h4>
                        <p className="text-gray-300 text-sm font-light leading-relaxed whitespace-pre-wrap">{part.content.trim()}</p>

                        {part.title.includes('Opción') && (
                          <div className="flex flex-col gap-2 mt-3">
                            {/* BOTÓN MÁGICO INTERNO */}
                            <button
                              onClick={async () => {
                                const promptText = part.content.trim();
                                setIsAnalyzing(true); // Re-use analyzing loader
                                alert("🌸 Taller Mágico: Creando tu imagen... Esto tomará unos segundos.");
                                try {
                                  // Use the internal service
                                  const magicImage = await generateFloralInspiration(promptText);
                                  if (magicImage) {
                                    if (editingId) {
                                      setEditFields(prev => ({ ...prev, image: magicImage }));
                                    } else {
                                      setNewProduct(prev => ({ ...prev, image: magicImage }));
                                    }
                                    setAnalysisResult(null);
                                    setIsCameraOpen(false);
                                    alert("¡Imagen Creada Exitosamente! ✨");
                                  } else {
                                    alert("No se pudo generar. Verifica tu API Key o intenta con el enlace externo.");
                                  }
                                } catch (e) {
                                  console.error(e);
                                  alert("Error en la generación mágica.");
                                }
                                setIsAnalyzing(false);
                              }}
                              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-800 rounded-lg text-white text-xs font-bold uppercase tracking-widest hover:from-emerald-500 hover:to-teal-700 transition-all shadow-lg flex items-center justify-center gap-2 border border-emerald-400/30 animate-pulse"
                            >
                              <Wand2 size={16} /> ✨ Generar Aquí (Magic)
                            </button>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => {
                                  const promptText = part.content.trim();
                                  navigator.clipboard.writeText(promptText);
                                  const url = `https://gemini.google.com/app?text=${encodeURIComponent(promptText)}`;
                                  window.open(url, '_blank');
                                }}
                                className="w-full py-3 bg-white/5 border border-white/20 rounded-lg text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                              >
                                <Sparkles size={12} /> Gemini Externo
                              </button>

                              <div className="relative overflow-hidden group">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      const file = e.target.files[0];
                                      const reader = new FileReader();
                                      reader.onload = (ev) => {
                                        const result = ev.target?.result as string;
                                        if (editingId) setEditFields(prev => ({ ...prev, image: result }));
                                        else setNewProduct(prev => ({ ...prev, image: result }));
                                        setAnalysisResult(null);
                                        setIsCameraOpen(false);
                                        alert("¡Imagen reemplazada! ✨");
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                                <button className="w-full h-full bg-white/5 border border-white/20 rounded-lg text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                                  <Upload size={12} /> Subir Archivo
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>

                {/* Refinement Section */}
                <div className="mt-auto space-y-3 pt-4 border-t border-white/10">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ej. Hazlo más morado, quita el jarrón..."
                      className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-rose-500 transition-colors pr-12"
                      value={refinementText}
                      onChange={e => setRefinementText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && refinementText.trim() && !isAnalyzing) {
                          setIsAnalyzing(true);
                          refineFloralPrompt(newProduct.image || '', analysisResult, refinementText)
                            .then(result => {
                              setAnalysisResult(result);
                              setRefinementText('');
                              setIsAnalyzing(false);
                            });
                        }
                      }}
                    />
                    <button
                      disabled={!refinementText.trim() || isAnalyzing}
                      onClick={() => {
                        setIsAnalyzing(true);
                        refineFloralPrompt(newProduct.image || '', analysisResult, refinementText)
                          .then(result => {
                            setAnalysisResult(result);
                            setRefinementText('');
                            setIsAnalyzing(false);
                          });
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-rose-600 rounded-lg text-white hover:bg-rose-700 disabled:opacity-50 transition-all"
                    >
                      {isAnalyzing ? <RefreshCw className="animate-spin" size={14} /> : <Send size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <p className="text-gray-400 mt-4 text-xs font-bold uppercase tracking-widest">Ajusta tu encuadre y captura</p>
        </div>
      )}
    </div>
  );
};

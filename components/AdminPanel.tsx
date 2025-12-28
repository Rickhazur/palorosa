
import React, { useRef, useState } from 'react';
import { Product, Offer } from '../types';
import { Plus, Camera, Lock, RefreshCw, Flower2, Sprout, Gift, Star, Gem, Trash2, Wand2, Sparkles, Image as ImageIcon, Upload, Check } from 'lucide-react';
import { generateFloralInspiration } from '../services/geminiService';

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
            { id: 'studio', label: 'Estudio IA', icon: <Wand2 size={16} /> },
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
                    onClick={() => cameraInputRef.current?.click()}
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
                      
                      <div className="absolute inset-0 bg-rose-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                         <div className="p-4 bg-white text-rose-600 rounded-full hover:scale-110 transition-transform shadow-xl">
                            <Camera size={24} />
                         </div>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
                      >
                         <Camera size={14} /> Tomar Foto
                      </button>
                      <button 
                        onClick={() => uploadInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors"
                      >
                         <Upload size={14} /> Galería
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
                          onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Precio sugerido (COP)</label>
                        <input 
                          type="number"
                          className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                          placeholder="0.00"
                          value={newProduct.price || ''}
                          onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
                        />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Descripción del Arreglo</label>
                      <textarea 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-rose-200 outline-none transition-all h-24 resize-none"
                        placeholder="Cuenta la historia detrás de estas flores..."
                        value={newProduct.description}
                        onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                      />
                   </div>

                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Categoría</label>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setNewProduct({...newProduct, category: cat.id as any})}
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
                         onClick={() => confirm('¿Eliminar del catálogo?') && onUpdateProduct({...product, id: 'DELETE_ME'} as any)}
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

      {activeTab === 'studio' && (
        <div className="max-w-4xl mx-auto animate-fade-in-up">
           <div className="bg-rose-950 p-10 md:p-16 rounded-[4rem] text-center text-white relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                 <div className="absolute top-0 left-0 w-full h-full" style={{backgroundImage: 'radial-gradient(white 1px, transparent 0px)', backgroundSize: '40px 40px'}}></div>
              </div>
              
              <div className="relative z-10">
                 <div className="inline-flex p-4 bg-white/10 backdrop-blur-md rounded-full mb-8 text-rose-300 border border-white/20">
                    <Wand2 size={40} className="animate-pulse" />
                 </div>
                 <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">Estudio Creativo IA</h2>
                 <p className="text-rose-200 max-w-xl mx-auto mb-12 font-light italic text-lg leading-relaxed">
                   "Describe el arreglo de tus sueños y nuestra IA generará una imagen profesional para tu tienda."
                 </p>

                 <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 space-y-6">
                    <textarea 
                      className="w-full bg-transparent border-none text-white text-xl font-light placeholder:text-white/20 outline-none resize-none h-32"
                      placeholder="Ej. Un bouquet de rosas preservadas azules y plateadas en una caja de lujo negra con cintas de terciopelo..."
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                    />
                    
                    <button 
                      onClick={handleAiInspiration}
                      disabled={isGenerating || !aiPrompt}
                      className="w-full py-5 bg-white text-rose-900 rounded-[2rem] font-black uppercase tracking-[0.3em] hover:bg-rose-100 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
                    >
                      {isGenerating ? (
                        <>
                          <Sparkles className="animate-spin" size={24} /> Visualizando...
                        </>
                      ) : (
                        <>
                          <Sparkles size={24} /> Crear Imagen Mágica
                        </>
                      )}
                    </button>
                 </div>
                 
                 <div className="mt-8 flex items-center justify-center gap-3 text-rose-300/50 text-[10px] font-black uppercase tracking-widest">
                    <ImageIcon size={14} /> La imagen se añadirá a la edición de tu producto
                 </div>
              </div>
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
                  if(inputPassword) {
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
    </div>
  );
};

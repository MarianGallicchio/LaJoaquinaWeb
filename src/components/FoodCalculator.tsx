import React, { useState } from 'react';
import { Calculator, Sparkles, ShoppingBag, ArrowRight } from 'lucide-react';
import { Product } from '../types';

interface FoodCalculatorProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export const FoodCalculator: React.FC<FoodCalculatorProps> = ({
  products,
  onSelectProduct,
}) => {
  const [species, setSpecies] = useState<'perro' | 'gato'>('perro');
  const [weight, setWeight] = useState<number>(species === 'perro' ? 12 : 4);
  const [lifeStage, setLifeStage] = useState<'cachorro' | 'adulto' | 'senior'>('adulto');
  const [activity, setActivity] = useState<'baja' | 'moderada' | 'alta'>('moderada');

  // Daily grams calculation based on standard veterinary estimates
  const calculateDailyGrams = () => {
    let baseGrams = 0;
    if (species === 'perro') {
      if (weight <= 5) baseGrams = weight * 25;
      else if (weight <= 15) baseGrams = weight * 20;
      else if (weight <= 30) baseGrams = weight * 16;
      else baseGrams = weight * 13;

      if (lifeStage === 'cachorro') baseGrams *= 1.4;
      if (lifeStage === 'senior') baseGrams *= 0.85;

      if (activity === 'baja') baseGrams *= 0.85;
      if (activity === 'alta') baseGrams *= 1.25;
    } else {
      // Gatos
      if (weight <= 3) baseGrams = 45;
      else if (weight <= 5) baseGrams = 60;
      else baseGrams = 75;

      if (lifeStage === 'cachorro') baseGrams *= 1.3;
      if (lifeStage === 'senior') baseGrams *= 0.9;
      if (activity === 'baja') baseGrams *= 0.85;
      if (activity === 'alta') baseGrams *= 1.15;
    }

    return Math.round(baseGrams);
  };

  const dailyGrams = Math.max(1, calculateDailyGrams());
  const days15kg = Math.max(1, Math.round(15000 / dailyGrams));
  const days3kg = Math.max(1, Math.round(3000 / dailyGrams));

  // Find best matching product safely
  const recommendedProduct = (products && products.length > 0) ? (
    products.find((p) => {
      if (species === 'perro') {
        if (lifeStage === 'cachorro') return p.id === 'perro-dogui-cachorros';
        return p.id === 'perro-sabrosito-mix';
      } else {
        if (lifeStage === 'adulto' && activity === 'baja') return p.id === 'gato-raza-castrados';
        return p.id === 'gato-cat-chow-esterilizados' || p.id === 'gato-sabrosito-pescado';
      }
    }) || products[0]
  ) : null;


  return (
    <section id="calculadora" className="py-12 sm:py-16 bg-[#F6EFE2] border-y border-[#E8DFC9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 bg-[#E8F3EF] text-[#1B4E43] text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
            <Calculator className="w-3.5 h-3.5 text-[#256B5C]" />
            <span>Herramienta Nutricional</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1B4E43] font-display">
            Calculadora de Ración y Rendimiento
          </h2>
          <p className="text-xs sm:text-sm text-[#6A5949] mt-2">
            Ingresá los datos de tu mascota para saber exactamente cuántos gramos diarios necesita y cuántos días te durará la bolsa.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
          
          {/* Controls column */}
          <div className="lg:col-span-7 bg-[#FFFDF9] p-6 sm:p-8 rounded-3xl border border-[#E5D7BF] shadow-md space-y-6">
            
            {/* Species toggle */}
            <div>
              <label className="block text-xs font-bold text-[#7A6958] uppercase tracking-wider mb-2">
                1. ¿Qué mascota tenés?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSpecies('perro');
                    setWeight(12);
                  }}
                  className={`p-3 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    species === 'perro'
                      ? 'bg-[#1B4E43] text-white border-[#1B4E43] shadow-xs'
                      : 'bg-[#FAF5EC] text-[#4A3C2F] border-[#E3D6BE] hover:bg-[#F2ECE0]'
                  }`}
                >
                  <span className="text-xl">🐶</span>
                  <span>Perro</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSpecies('gato');
                    setWeight(4);
                  }}
                  className={`p-3 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    species === 'gato'
                      ? 'bg-[#1B4E43] text-white border-[#1B4E43] shadow-xs'
                      : 'bg-[#FAF5EC] text-[#4A3C2F] border-[#E3D6BE] hover:bg-[#F2ECE0]'
                  }`}
                >
                  <span className="text-xl">🐱</span>
                  <span>Gato</span>
                </button>
              </div>
            </div>

            {/* Weight Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-[#7A6958] uppercase tracking-wider">
                  2. Peso estimado:
                </label>
                <span className="text-base font-extrabold text-[#1B4E43] bg-[#E8F3EF] px-3 py-0.5 rounded-full font-display">
                  {weight} kg
                </span>
              </div>
              <input
                type="range"
                min={species === 'perro' ? 1 : 1}
                max={species === 'perro' ? 65 : 12}
                step={0.5}
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value))}
                className="w-full h-2 bg-[#E5D7BF] rounded-lg appearance-none cursor-pointer accent-[#EFA332]"
              />
              <div className="flex justify-between text-[10px] text-[#8A7969] mt-1">
                <span>{species === 'perro' ? '1 kg (Chihuahua)' : '1 kg (Cachorrito)'}</span>
                <span>{species === 'perro' ? '65 kg (Gran Danés)' : '12 kg (Maine Coon)'}</span>
              </div>
            </div>

            {/* Life stage & Activity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#7A6958] uppercase tracking-wider mb-2">
                  3. Etapa de Vida:
                </label>
                <div className="space-y-1.5">
                  {(['cachorro', 'adulto', 'senior'] as const).map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => setLifeStage(stage)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                        lifeStage === stage
                          ? 'bg-[#1B4E43] text-white'
                          : 'bg-[#FAF5EC] text-[#5A4D3F] border border-[#E3D6BE] hover:bg-[#F2ECE0]'
                      }`}
                    >
                      {stage === 'cachorro' && '🍼 Cachorro / Puppy'}
                      {stage === 'adulto' && '🐕 Adulto activo'}
                      {stage === 'senior' && '💤 Senior (Mayor 7 años)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7A6958] uppercase tracking-wider mb-2">
                  4. Nivel de Actividad:
                </label>
                <div className="space-y-1.5">
                  {(['baja', 'moderada', 'alta'] as const).map((act) => (
                    <button
                      key={act}
                      type="button"
                      onClick={() => setActivity(act)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                        activity === act
                          ? 'bg-[#1B4E43] text-white'
                          : 'bg-[#FAF5EC] text-[#5A4D3F] border border-[#E3D6BE] hover:bg-[#F2ECE0]'
                      }`}
                    >
                      {act === 'baja' && '🛋️ Baja (Vida en dpto)'}
                      {act === 'moderada' && '🎾 Moderada (Paseos diarios)'}
                      {act === 'alta' && '⚡ Alta (Mucha energía / Parque)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Results card column */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#1B4E43] to-[#256B5C] text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col justify-between">
            
            <div>
              <div className="flex items-center gap-2 text-[#FFE194] text-xs font-bold uppercase tracking-wider mb-3">
                <Sparkles className="w-4 h-4 text-[#EFA332]" />
                <span>Resultado Nutricional Sugerido</span>
              </div>

              <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/15 mb-5">
                <span className="text-xs text-[#D5EBE4] block">Porción Diaria Recomendada:</span>
                <span className="text-3xl sm:text-4xl font-extrabold text-[#FFE194] font-display">
                  ~{dailyGrams} g <span className="text-sm font-normal text-white">/ día</span>
                </span>
                <span className="text-[11px] text-[#D5EBE4] block mt-1">
                  (Dividir idealmente en 2 o 3 tomas diarias)
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <span className="text-[#D5EBE4]">Bolsa de 3 kg dura:</span>
                  <strong className="text-sm font-bold text-white">{days3kg} días aprox.</strong>
                </div>
                {species === 'perro' && (
                  <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-xl border border-white/10">
                    <span className="text-[#D5EBE4]">Bolsa de 15 kg dura:</span>
                    <strong className="text-sm font-bold text-[#FFE194]">{days15kg} días aprox.</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Recommended Product CTA */}
            {recommendedProduct && (
              <div className="mt-6 pt-5 border-t border-white/15">
                <span className="text-[11px] text-[#D5EBE4] block uppercase font-bold tracking-wider mb-2">
                  Alimento ideal recomendado:
                </span>
                <div className="bg-[#FFFDF9] text-[#2B231D] p-3 rounded-2xl flex items-center gap-3">
                  <img
                    src={recommendedProduct.image}
                    alt={recommendedProduct.name}
                    className="w-12 h-12 rounded-xl object-cover bg-[#F6EFE2]"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold truncate">
                      {recommendedProduct.name}
                    </h4>
                    <span className="text-xs font-extrabold text-[#1B4E43]">
                      ${recommendedProduct.variants[0].price.toLocaleString('es-AR')}
                    </span>
                  </div>
                  <button
                    onClick={() => onSelectProduct(recommendedProduct)}
                    className="bg-[#EFA332] hover:bg-[#E39420] text-[#1E170E] p-2 rounded-xl text-xs font-bold transition-transform active:scale-95"
                    title="Ver este alimento"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </section>
  );
};

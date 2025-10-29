// RegionSelector - 2단계 지역 선택 컴포넌트
// Province (광역자치단체) → City (시/군/구) 계층 구조

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { fetchAllProvinces, fetchCitiesByProvince } from '@/lib/supabase/regions';
import type { Region } from '@/types';

interface RegionSelectorProps {
  provinceCode: string | null;
  cityCode: string | null;
  onProvinceChange: (code: string | null) => void;
  onCityChange: (code: string | null) => void;
  disabled?: boolean;
  required?: boolean;
}

export default function RegionSelector({
  provinceCode,
  cityCode,
  onProvinceChange,
  onCityChange,
  disabled = false,
  required = false,
}: RegionSelectorProps) {
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [cities, setCities] = useState<Region[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 광역자치단체 목록 로드
  useEffect(() => {
    async function loadProvinces() {
      try {
        setLoadingProvinces(true);
        const data = await fetchAllProvinces();
        setProvinces(data);
      } catch (err) {
        console.error('Failed to load provinces:', err);
        setError('광역자치단체 목록을 불러오는데 실패했습니다');
      } finally {
        setLoadingProvinces(false);
      }
    }

    loadProvinces();
  }, []);

  // 선택된 광역자치단체의 시/군/구 목록 로드
  useEffect(() => {
    async function loadCities() {
      if (!provinceCode) {
        setCities([]);
        return;
      }

      try {
        setLoadingCities(true);
        const data = await fetchCitiesByProvince(provinceCode);
        setCities(data);

        // 이전에 선택한 city가 새로운 province에 속하지 않으면 초기화
        if (cityCode) {
          const cityExists = data.some((c) => c.code === cityCode);
          if (!cityExists) {
            onCityChange(null);
          }
        }
      } catch (err) {
        console.error('Failed to load cities:', err);
        setError('시/군/구 목록을 불러오는데 실패했습니다');
      } finally {
        setLoadingCities(false);
      }
    }

    loadCities();
  }, [provinceCode]);

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || null;
    onProvinceChange(value);
    onCityChange(null); // 광역자치단체 변경 시 시/군/구 초기화
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || null;
    onCityChange(value);
  };

  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 광역자치단체 선택 */}
      <div>
        <label
          htmlFor="province"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          광역자치단체 {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <select
            id="province"
            value={provinceCode ?? ''}
            onChange={handleProvinceChange}
            disabled={disabled || loadingProvinces}
            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a8c5e0] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none bg-white"
            required={required}
          >
            <option value="">-- 광역자치단체 선택 --</option>
            {provinces.map((province) => (
              <option key={province.code} value={province.code}>
                {province.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* 시/군/구 선택 (광역자치단체 선택 시에만 표시) */}
      {provinceCode && cities.length > 0 && (
        <div>
          <label
            htmlFor="city"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            시/군/구 (선택)
          </label>
          <div className="relative">
            <select
              id="city"
              value={cityCode ?? ''}
              onChange={handleCityChange}
              disabled={disabled || loadingCities}
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a8c5e0] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none bg-white"
            >
              <option value="">-- 전체 (시/군/구 선택 안함) --</option>
              {cities.map((city) => (
                <option key={city.code} value={city.code}>
                  {city.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            💡 시/군/구를 선택하지 않으면 광역자치단체 전체로 등록됩니다
          </p>
        </div>
      )}

      {/* 로딩 중 메시지 */}
      {loadingProvinces && (
        <div className="text-sm text-gray-500">광역자치단체 목록 로딩 중...</div>
      )}
      {loadingCities && (
        <div className="text-sm text-gray-500">시/군/구 목록 로딩 중...</div>
      )}
    </div>
  );
}

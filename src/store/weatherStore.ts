// @ts-nocheck
import { create } from 'zustand';

interface WeatherState {
  temp: number | null;
  condition: string | null;
  icon: string | null;
  loading: boolean;
  error: string | null;
  lastFetched: number;
  fetchWeather: (force?: boolean) => Promise<void>;
}

export const useWeatherStore = create<WeatherState>((set, get) => ({
  temp: null,
  condition: null,
  icon: null,
  loading: false,
  error: null,
  lastFetched: 0,
  fetchWeather: async (force = false) => {
    const { lastFetched, loading, temp } = get();
    // Cache for 15 minutes unless forced
    if (!force && temp !== null && Date.now() - lastFetched < 15 * 60 * 1000) {
      return;
    }
    if (loading) return;

    set({ loading: true, error: null });
    try {
      // Simraungadh, Bara, Nepal Coordinates
      const lat = 26.8821;
      const lon = 85.1143;
      
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=Asia%2FKathmandu`);
      const data = await res.json();

      if (!data.current) {
        throw new Error('Invalid weather data');
      }

      const tempVal = Math.round(data.current.temperature_2m);
      const code = data.current.weather_code;

      // Map WMO Code to standard condition strings
      let condition = 'Clear';
      if (code === 0) {
        condition = 'Clear';
      } else if (code >= 1 && code <= 3) {
        condition = 'Cloudy';
      } else if (code === 45 || code === 48) {
        condition = 'Fog';
      } else if (code >= 51 && code <= 82) {
        condition = 'Rain';
      } else if (code >= 95) {
        condition = 'Thunderstorm';
      }

      set({
        temp: tempVal,
        condition,
        icon: condition === 'Clear' ? '01d' : condition === 'Rain' ? '10d' : '02d',
        loading: false,
        lastFetched: Date.now(),
      });
    } catch (e: unknown) {
      // Fallback if network offline
      set({ 
        temp: 30,
        condition: 'Cloudy',
        error: e instanceof Error ? e.message : String(e),
        loading: false,
        lastFetched: Date.now(),
      });
    }
  }
}));


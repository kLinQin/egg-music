import { useEffect, useState } from 'react';
import { getEq } from '../lib/eq';

export function useEqualizer() {
   const [ready, setReady] = useState(false);

   useEffect(() => {
      // Cek sampai runtime siap (dipanggil setelah audio element mount)
      const check = () => {
         const setup = getEq();
         if (setup) {
            setReady(true);
            return true;
         }
         return false;
      };

      if (check()) return;

      const interval = setInterval(() => {
         if (check()) clearInterval(interval);
      }, 100);

      return () => clearInterval(interval);
   }, []);

   const runtime = ready ? getEq()?.runtime ?? null : null;

   return { runtime, ready };
}
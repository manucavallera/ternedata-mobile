import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

// Recarga los datos de una pantalla cada vez que recibe el foco, no solo al montarse.
// Las pantallas de las pestañas quedan montadas: sin esto, lo que se crea en un formulario
// o en otra pestaña no aparece al volver hasta que alguien tira para refrescar.
// `recargar` se lee de una ref, así los filtros vigentes se respetan sin disparar el efecto.
export const useRecargarAlEnfocar = (recargar, deps = []) => {
    const ultima = useRef(recargar);
    ultima.current = recargar;
    useFocusEffect(useCallback(() => { ultima.current(); }, deps));
};

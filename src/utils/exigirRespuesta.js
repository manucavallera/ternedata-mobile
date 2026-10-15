// Los hooks de la API devuelven el status (número) o el error cuando el pedido falla, sin lanzarlo.
// Un listado que lee `res?.data?.data || []` mostraría "Sin madres" con la red caída, y el productor
// creería que perdió sus animales. Esto convierte esa respuesta en una excepción para que la
// pantalla avise y conserve lo que ya tenía cargado.
export const exigirRespuesta = (res) => {
    if (!res || typeof res !== 'object' || res instanceof Error || !('data' in res)) {
        throw new Error('La carga falló');
    }
    return res;
};

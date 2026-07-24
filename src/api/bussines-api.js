import axios from 'axios';
import { getEnvVariables } from '../helpers/getEnvVariables';
import { getToken } from '../utils/storage';

const { ENTORNO, MS_BUSINESS_API_URL_DESARROLLO, MS_BUSINESS_API_URL_PRODUCCION } = getEnvVariables();

const businessApi = axios.create({
    baseURL: ENTORNO === 'desarrollo' ? MS_BUSINESS_API_URL_DESARROLLO : MS_BUSINESS_API_URL_PRODUCCION,
});

businessApi.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
        config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    }

    // Adjuntar el establecimiento seleccionado por el admin. Sin esto el backend
    // cae al establecimiento principal del JWT y las mutaciones (borrar/editar)
    // sobre OTRO campo fallan con "no encontrado". Solo se agrega si el caller no
    // lo puso ya en la URL o en params.
    try {
        // Import diferido: el store importa hooks que a su vez importan esta api.
        const { store } = require('../store/store');
        const idEstab = store.getState()?.auth?.establecimientoActual;
        const yaTiene =
            (config.url || '').includes('id_establecimiento') ||
            (config.params && 'id_establecimiento' in config.params);
        if (idEstab != null && idEstab !== '' && !yaTiene) {
            config.params = { ...(config.params || {}), id_establecimiento: idEstab };
        }
    } catch (e) {
        // Store no disponible todavía: seguir sin romper la request.
    }

    return config;
}, error => Promise.reject(error));

export default businessApi;

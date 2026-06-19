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
    return config;
}, error => Promise.reject(error));

export default businessApi;

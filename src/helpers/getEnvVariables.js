import Constants from 'expo-constants';

export const getEnvVariables = () => {
    const extra = Constants.expoConfig?.extra || {};
    return {
        ENTORNO: extra.ENTORNO || 'produccion',
        MS_BUSINESS_API_URL_DESARROLLO: extra.MS_BUSINESS_API_URL_DESARROLLO,
        MS_SECURITY_API_URL_DESARROLLO: extra.MS_SECURITY_API_URL_DESARROLLO,
        MS_BUSINESS_API_URL_PRODUCCION: extra.MS_BUSINESS_API_URL_PRODUCCION,
        MS_SECURITY_API_URL_PRODUCCION: extra.MS_SECURITY_API_URL_PRODUCCION,
    };
};

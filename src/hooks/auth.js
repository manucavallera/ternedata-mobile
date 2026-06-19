import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import securityApi from '../api/security-api';
import businessApi from '../api/bussines-api';
import { setAuthPayload, setStatus, setUserData } from '../store/auth/authSlice';
import { setToken, removeToken } from '../utils/storage';

export const useAuthSession = () => {
    const dispatch = useDispatch();

    const loginHooks = async (credentials) => {
        try {
            const { data, config, headers, status, statusText, request } = await securityApi.post('/auth/login', credentials);

            if (data) {
                await AsyncStorage.clear();
                await setToken(data.token);
                await AsyncStorage.setItem('userSelected', JSON.stringify(data.user));
            }

            dispatch(setAuthPayload(data));
            dispatch(setStatus('authenticated'));
            dispatch(setUserData(data?.user));

            return { data, config, headers, status, statusText, request };
        } catch (error) {
            await AsyncStorage.clear();
            dispatch(setAuthPayload({}));
            dispatch(setStatus('not-authenticated'));
            return error.response?.status ?? 0;
        }
    };

    const registroHooks = async (objectUsuario) => {
        try {
            const { data, config, headers, status, statusText, request } = await securityApi.post('/auth/register', objectUsuario);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            return error?.response?.status ?? 0;
        }
    };

    const getProfileHook = async () => {
        try {
            const { data } = await securityApi.get('/users/profile/me');
            return { success: true, data };
        } catch (error) {
            return { success: false, status: error.response?.status };
        }
    };

    const updateProfileHook = async (userId, updateData) => {
        try {
            const { data } = await securityApi.put(`/users/${userId}`, updateData);
            dispatch(setUserData(data));
            return { success: true, data };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Error al actualizar' };
        }
    };

    const forgotPasswordHook = async (email) => {
        try {
            const { data } = await securityApi.post('/auth/forgot-password', { email });
            return { success: true, data };
        } catch (error) {
            return { success: false, status: error.response?.status };
        }
    };

    const resetPasswordHook = async (token, newPassword) => {
        try {
            const { data } = await securityApi.post('/auth/reset-password', { token, newPassword });
            return { success: true, data };
        } catch (error) {
            return { success: false, status: error.response?.status, message: error.response?.data?.message };
        }
    };

    const verifyEmailHook = async (token) => {
        try {
            const { data } = await securityApi.post('/auth/verify-email', { token });
            return { success: true, data };
        } catch (error) {
            return { success: false, status: error.response?.status, message: error.response?.data?.message };
        }
    };

    const resendVerificationHook = async (email) => {
        try {
            const { data } = await securityApi.post('/auth/resend-verification', { email });
            return { success: true, data };
        } catch (error) {
            return { success: false, status: error.response?.status };
        }
    };

    const logoutHook = async () => {
        await AsyncStorage.clear();
        dispatch(setAuthPayload({}));
        dispatch(setStatus('not-authenticated'));
        dispatch(setUserData({}));
    };

    const aceptarInvitacionesAutomatico = async () => {
        try {
            const result = await businessApi.post('/invitaciones/aceptar-automatico');
            if (result?.data?.aceptadas > 0) {
                const { data } = await securityApi.post('/auth/refresh');
                if (data?.token) {
                    await setToken(data.token);
                    await AsyncStorage.setItem('userSelected', JSON.stringify(data.user));
                    dispatch(setUserData(data.user));
                }
            }
        } catch {
            // sin invitaciones o error, continuar normalmente
        }
    };

    return {
        loginHooks,
        registroHooks,
        forgotPasswordHook,
        resetPasswordHook,
        getProfileHook,
        updateProfileHook,
        verifyEmailHook,
        resendVerificationHook,
        logoutHook,
        aceptarInvitacionesAutomatico,
    };
};

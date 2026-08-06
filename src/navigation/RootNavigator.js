import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { removeToken, getToken } from '../utils/storage';
import securityApi from '../api/security-api';
import { setAuthPayload, setStatus, setUserData } from '../store/auth/authSlice';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import SetupEstablecimientoScreen from '../screens/auth/SetupEstablecimientoScreen';

export default function RootNavigator() {
    const { status, userPayload } = useSelector(state => state.auth);
    const dispatch = useDispatch();

    useEffect(() => {
        let activo = true;
        const restaurarSesion = async () => {
            const token = await getToken();
            if (!token) {
                if (activo) dispatch(setStatus('not-authenticated'));
                return;
            }
            try {
                const { data } = await securityApi.get('/users/profile/me');
                if (!activo) return;
                dispatch(setUserData(data));
                dispatch(setAuthPayload({ token, user: data }));
                dispatch(setStatus('authenticated'));
            } catch {
                await removeToken();
                if (activo) {
                    dispatch(setAuthPayload({}));
                    dispatch(setUserData({}));
                    dispatch(setStatus('not-authenticated'));
                }
            }
        };
        restaurarSesion();
        return () => { activo = false; };
    }, [dispatch]);

    if (status === 'authenticated') {
        if (userPayload?.rol === 'admin' && !userPayload?.id_establecimiento) {
            return <SetupEstablecimientoScreen />;
        }
        return <AppNavigator />;
    }
    return <AuthNavigator />;
}

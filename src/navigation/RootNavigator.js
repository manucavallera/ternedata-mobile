import { useSelector } from 'react-redux';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import SetupEstablecimientoScreen from '../screens/auth/SetupEstablecimientoScreen';

export default function RootNavigator() {
    const { status, userPayload } = useSelector(state => state.auth);

    if (status === 'authenticated') {
        if (userPayload?.rol === 'admin' && !userPayload?.id_establecimiento) {
            return <SetupEstablecimientoScreen />;
        }
        return <AppNavigator />;
    }
    return <AuthNavigator />;
}

import { useSelector } from 'react-redux';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';

export default function RootNavigator() {
    const { status } = useSelector(state => state.auth);

    if (status === 'authenticated') return <AppNavigator />;
    return <AuthNavigator />;
}

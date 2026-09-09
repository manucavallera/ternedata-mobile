import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import RootNavigator from './src/navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';

const linking = {
    prefixes: [
        'https://manu-ternedatamobile.gygo4l.easypanel.host',
        'ternedata://',
    ],
    config: {
        screens: {
            VerifyEmail: 'auth/verify-email',
            ResetPassword: 'auth/reset-password',
        },
    },
};

export default function App() {
    return (
        <Provider store={store}>
            <SafeAreaProvider>
                <NavigationContainer linking={linking}>
                    <RootNavigator />
                    <StatusBar style="auto" />
                </NavigationContainer>
            </SafeAreaProvider>
        </Provider>
    );
}

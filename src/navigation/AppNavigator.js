import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TerneroListadoScreen from '../screens/ternero/TerneroListadoScreen';
import MadreListadoScreen from '../screens/madre/MadreListadoScreen';
import TratamientoListadoScreen from '../screens/tratamiento/TratamientoListadoScreen';
import EventoListadoScreen from '../screens/evento/EventoListadoScreen';
import PerfilScreen from '../screens/auth/PerfilScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
    return (
        <Tab.Navigator screenOptions={{ headerShown: false }}>
            <Tab.Screen name="Terneros" component={TerneroListadoScreen} />
            <Tab.Screen name="Madres" component={MadreListadoScreen} />
            <Tab.Screen name="Tratamientos" component={TratamientoListadoScreen} />
            <Tab.Screen name="Eventos" component={EventoListadoScreen} />
            <Tab.Screen name="Perfil" component={PerfilScreen} />
        </Tab.Navigator>
    );
}

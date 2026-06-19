import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TerneroListadoScreen from '../screens/ternero/TerneroListadoScreen';
import TerneroFormScreen from '../screens/ternero/TerneroFormScreen';
import MadreListadoScreen from '../screens/madre/MadreListadoScreen';
import TratamientoListadoScreen from '../screens/tratamiento/TratamientoListadoScreen';
import EventoListadoScreen from '../screens/evento/EventoListadoScreen';
import PerfilScreen from '../screens/auth/PerfilScreen';

const Tab = createBottomTabNavigator();
const TerneroStack = createNativeStackNavigator();
const MadreStack = createNativeStackNavigator();
const TratamientoStack = createNativeStackNavigator();
const EventoStack = createNativeStackNavigator();

function TerneroNavigator() {
    return (
        <TerneroStack.Navigator screenOptions={{ headerShown: false }}>
            <TerneroStack.Screen name="TerneroListado" component={TerneroListadoScreen} />
            <TerneroStack.Screen name="TerneroForm" component={TerneroFormScreen} />
        </TerneroStack.Navigator>
    );
}

function MadreNavigator() {
    return (
        <MadreStack.Navigator screenOptions={{ headerShown: false }}>
            <MadreStack.Screen name="MadreListado" component={MadreListadoScreen} />
        </MadreStack.Navigator>
    );
}

function TratamientoNavigator() {
    return (
        <TratamientoStack.Navigator screenOptions={{ headerShown: false }}>
            <TratamientoStack.Screen name="TratamientoListado" component={TratamientoListadoScreen} />
        </TratamientoStack.Navigator>
    );
}

function EventoNavigator() {
    return (
        <EventoStack.Navigator screenOptions={{ headerShown: false }}>
            <EventoStack.Screen name="EventoListado" component={EventoListadoScreen} />
        </EventoStack.Navigator>
    );
}

export default function AppNavigator() {
    return (
        <Tab.Navigator screenOptions={{ headerShown: false }}>
            <Tab.Screen name="Terneros" component={TerneroNavigator} />
            <Tab.Screen name="Madres" component={MadreNavigator} />
            <Tab.Screen name="Tratamientos" component={TratamientoNavigator} />
            <Tab.Screen name="Eventos" component={EventoNavigator} />
            <Tab.Screen name="Perfil" component={PerfilScreen} />
        </Tab.Navigator>
    );
}

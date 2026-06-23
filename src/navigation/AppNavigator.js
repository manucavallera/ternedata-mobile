import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TerneroListadoScreen from '../screens/ternero/TerneroListadoScreen';
import TerneroFormScreen from '../screens/ternero/TerneroFormScreen';
import MadreListadoScreen from '../screens/madre/MadreListadoScreen';
import MadreFormScreen from '../screens/madre/MadreFormScreen';
import TratamientoListadoScreen from '../screens/tratamiento/TratamientoListadoScreen';
import TratamientoFormScreen from '../screens/tratamiento/TratamientoFormScreen';
import EventoListadoScreen from '../screens/evento/EventoListadoScreen';
import EventoFormScreen from '../screens/evento/EventoFormScreen';
import DiarreaListadoScreen from '../screens/diarrea/DiarreaListadoScreen';
import DiarreaFormScreen from '../screens/diarrea/DiarreaFormScreen';
import RodeoListadoScreen from '../screens/rodeo/RodeoListadoScreen';
import RodeoAsignarScreen from '../screens/rodeo/RodeoAsignarScreen';
import ResumenSaludScreen from '../screens/resumen/ResumenSaludScreen';
import EquipoScreen from '../screens/equipo/EquipoScreen';
import MasScreen from '../screens/mas/MasScreen';
import PerfilScreen from '../screens/auth/PerfilScreen';

const Tab = createBottomTabNavigator();
const TerneroStack = createNativeStackNavigator();
const MadreStack = createNativeStackNavigator();
const TratamientoStack = createNativeStackNavigator();
const EventoStack = createNativeStackNavigator();
const RodeoStack = createNativeStackNavigator();
const MasStack = createNativeStackNavigator();

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
            <MadreStack.Screen name="MadreForm" component={MadreFormScreen} />
        </MadreStack.Navigator>
    );
}

function TratamientoNavigator() {
    return (
        <TratamientoStack.Navigator screenOptions={{ headerShown: false }}>
            <TratamientoStack.Screen name="TratamientoListado" component={TratamientoListadoScreen} />
            <TratamientoStack.Screen name="TratamientoForm" component={TratamientoFormScreen} />
        </TratamientoStack.Navigator>
    );
}

function EventoNavigator() {
    return (
        <EventoStack.Navigator screenOptions={{ headerShown: false }}>
            <EventoStack.Screen name="EventoListado" component={EventoListadoScreen} />
            <EventoStack.Screen name="EventoForm" component={EventoFormScreen} />
        </EventoStack.Navigator>
    );
}

function RodeoNavigator() {
    return (
        <RodeoStack.Navigator screenOptions={{ headerShown: false }}>
            <RodeoStack.Screen name="RodeoListado" component={RodeoListadoScreen} />
            <RodeoStack.Screen name="RodeoAsignar" component={RodeoAsignarScreen} />
        </RodeoStack.Navigator>
    );
}

function MasNavigator() {
    return (
        <MasStack.Navigator screenOptions={{ headerShown: false }}>
            <MasStack.Screen name="MasMenu" component={MasScreen} />
            <MasStack.Screen name="DiarreaListado" component={DiarreaListadoScreen} />
            <MasStack.Screen name="DiarreaForm" component={DiarreaFormScreen} />
            <MasStack.Screen name="ResumenSalud" component={ResumenSaludScreen} />
            <MasStack.Screen name="Equipo" component={EquipoScreen} />
            <MasStack.Screen name="Perfil" component={PerfilScreen} />
        </MasStack.Navigator>
    );
}

export default function AppNavigator() {
    return (
        <Tab.Navigator screenOptions={{ headerShown: false }}>
            <Tab.Screen name="Terneros" component={TerneroNavigator} />
            <Tab.Screen name="Madres" component={MadreNavigator} />
            <Tab.Screen name="Tratamientos" component={TratamientoNavigator} />
            <Tab.Screen name="Eventos" component={EventoNavigator} />
            <Tab.Screen name="Rodeos" component={RodeoNavigator} />
            <Tab.Screen name="Más" component={MasNavigator} />
        </Tab.Navigator>
    );
}

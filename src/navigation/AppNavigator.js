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
import PerfilScreen from '../screens/auth/PerfilScreen';

const Tab = createBottomTabNavigator();
const TerneroStack = createNativeStackNavigator();
const MadreStack = createNativeStackNavigator();
const TratamientoStack = createNativeStackNavigator();
const EventoStack = createNativeStackNavigator();
const DiarreaStack = createNativeStackNavigator();
const RodeoStack = createNativeStackNavigator();

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

function DiarreaNavigator() {
    return (
        <DiarreaStack.Navigator screenOptions={{ headerShown: false }}>
            <DiarreaStack.Screen name="DiarreaListado" component={DiarreaListadoScreen} />
            <DiarreaStack.Screen name="DiarreaForm" component={DiarreaFormScreen} />
        </DiarreaStack.Navigator>
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

export default function AppNavigator() {
    return (
        <Tab.Navigator screenOptions={{ headerShown: false }}>
            <Tab.Screen name="Terneros" component={TerneroNavigator} />
            <Tab.Screen name="Madres" component={MadreNavigator} />
            <Tab.Screen name="Tratamientos" component={TratamientoNavigator} />
            <Tab.Screen name="Eventos" component={EventoNavigator} />
            <Tab.Screen name="Diarrea" component={DiarreaNavigator} />
            <Tab.Screen name="Rodeos" component={RodeoNavigator} />
            <Tab.Screen name="Perfil" component={PerfilScreen} />
        </Tab.Navigator>
    );
}

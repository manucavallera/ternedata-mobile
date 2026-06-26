import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
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
import AdminScreen from '../screens/admin/AdminScreen';
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
            <MasStack.Screen name="Admin" component={AdminScreen} />
            <MasStack.Screen name="Perfil" component={PerfilScreen} />
        </MasStack.Navigator>
    );
}

const TABS = [
    { name: 'Terneros', label: 'Terneros', icon: '🐮', component: TerneroNavigator },
    { name: 'Madres', label: 'Madres', icon: '🐄', component: MadreNavigator },
    { name: 'Tratamientos', label: 'Tratam.', icon: '💉', component: TratamientoNavigator },
    { name: 'Eventos', label: 'Eventos', icon: '📅', component: EventoNavigator },
    { name: 'Rodeos', label: 'Rodeos', icon: '🐂', component: RodeoNavigator },
    { name: 'Más', label: 'Más', icon: '•••', component: MasNavigator },
];

const tabIcon = (icon) => ({ focused }) => (
    <Text style={{ fontSize: icon === '•••' ? 18 : 19, opacity: focused ? 1 : 0.55,
        color: colors.campo, marginTop: 2, fontWeight: '900' }}>
        {icon}
    </Text>
);

export default function AppNavigator() {
    const insets = useSafeAreaInsets();
    const bottom = Math.max(insets.bottom, 8); // respeta barra de nav / gestos del celu
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.campo,
                tabBarInactiveTintColor: colors.inkFaint,
                tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700', marginTop: -2 },
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.line,
                    borderTopWidth: 1,
                    height: 58 + bottom,
                    paddingTop: 6,
                    paddingBottom: bottom,
                },
            }}
        >
            {TABS.map(t => (
                <Tab.Screen
                    key={t.name}
                    name={t.name}
                    component={t.component}
                    options={{ tabBarLabel: t.label, tabBarIcon: tabIcon(t.icon) }}
                />
            ))}
        </Tab.Navigator>
    );
}

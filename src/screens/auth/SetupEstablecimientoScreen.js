import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import securityApi from '../../api/security-api';
import { setAuthPayload, setStatus, setUserData } from '../../store/auth/authSlice';
import { setToken } from '../../utils/storage';
import { colors, shadow, radius, space } from '../../theme';

export default function SetupEstablecimientoScreen() {
    const dispatch = useDispatch();
    const { crearEstablecimientoHook } = useBussinesMicroservicio();
    const [form, setForm] = useState({ nombre: '', ubicacion: '', responsable: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const actualizar = (campo, valor) => setForm(actual => ({ ...actual, [campo]: valor }));

    const crear = async () => {
        if (!form.nombre.trim()) {
            setError('El nombre del establecimiento es obligatorio.');
            return;
        }

        setLoading(true);
        setError('');
        const res = await crearEstablecimientoHook({
            nombre: form.nombre.trim(),
            ubicacion: form.ubicacion.trim(),
            responsable: form.responsable.trim(),
        });

        if (!res?.data?.id_establecimiento) {
            setError(res?.data?.message || 'No se pudo crear el establecimiento. Intentá de nuevo.');
            setLoading(false);
            return;
        }

        try {
            // El token del login no conoce el campo recién creado. Lo renovamos
            // antes de entrar para que todas las llamadas usen el campo correcto.
            const { data } = await securityApi.post('/auth/refresh');
            if (!data?.token || !data?.user) throw new Error('No se pudo renovar la sesión');

            await setToken(data.token);
            await AsyncStorage.setItem('userSelected', JSON.stringify(data.user));
            dispatch(setAuthPayload(data));
            dispatch(setUserData(data.user));
            dispatch(setStatus('authenticated'));
        } catch {
            setError('El establecimiento fue creado, pero no pudimos actualizar la sesión. Cerrá sesión e ingresá de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                    <Text style={styles.icon}>🏡</Text>
                    <Text style={styles.title}>Creá tu establecimiento</Text>
                    <Text style={styles.subtitle}>Antes de empezar, configurá los datos de tu campo.</Text>

                    <Text style={styles.label}>Nombre del campo *</Text>
                    <TextInput
                        style={styles.input}
                        value={form.nombre}
                        onChangeText={(valor) => actualizar('nombre', valor)}
                        placeholder="Ej: La Esperanza"
                    />

                    <Text style={styles.label}>Ubicación (opcional)</Text>
                    <TextInput
                        style={styles.input}
                        value={form.ubicacion}
                        onChangeText={(valor) => actualizar('ubicacion', valor)}
                        placeholder="Ej: Buenos Aires, Argentina"
                    />

                    <Text style={styles.label}>Responsable (opcional)</Text>
                    <TextInput
                        style={styles.input}
                        value={form.responsable}
                        onChangeText={(valor) => actualizar('responsable', valor)}
                        placeholder="Ej: Juan Pérez"
                    />

                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    <TouchableOpacity style={styles.button} onPress={crear} disabled={loading}>
                        {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Crear establecimiento</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    container: { flexGrow: 1, justifyContent: 'center', padding: space.xl },
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.xl, ...shadow.card },
    icon: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
    title: { color: colors.ink, fontSize: 24, fontWeight: '800', textAlign: 'center' },
    subtitle: { color: colors.inkSoft, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8, marginBottom: 24 },
    label: { color: colors.ink, fontSize: 14, fontWeight: '600', marginBottom: 5, marginTop: 10 },
    input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, color: colors.ink, fontSize: 15, padding: 11 },
    error: { backgroundColor: '#fef2f2', borderRadius: radius.sm, color: colors.muerto, fontSize: 13, lineHeight: 18, marginTop: 16, padding: 10 },
    button: { alignItems: 'center', backgroundColor: colors.campo, borderRadius: radius.sm, marginTop: 20, padding: 14 },
    buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});

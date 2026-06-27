import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, KeyboardAvoidingView,
    Platform, ScrollView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import { useAuthSession } from '../../hooks/auth';
import { colors, shadow, radius, space } from '../../theme';

export default function ForgotPasswordScreen() {
    const navigation = useNavigation();
    const { forgotPasswordHook } = useAuthSession();
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ status: false, message: '', success: false });

    const { control, handleSubmit, formState: { errors } } = useForm();

    const onSubmit = handleSubmit(async (data) => {
        setLoading(true);
        setAlert({ status: false, message: '', success: false });

        const res = await forgotPasswordHook(data.email);

        if (res.success) {
            setAlert({ status: true, message: 'Te enviamos un email para restablecer tu contraseña. Revisá tu casilla (y spam).', success: true });
        } else {
            setAlert({ status: true, message: 'No encontramos una cuenta con ese email.', success: false });
        }

        setLoading(false);
    });

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                    <Text style={styles.title}>🔑 Recuperar contraseña</Text>
                    <Text style={styles.subtitle}>Ingresá tu email y te mandamos un link para restablecer tu contraseña.</Text>

                    <Text style={styles.label}>Email</Text>
                    <Controller
                        control={control}
                        name="email"
                        rules={{
                            required: 'Email es requerido',
                            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' },
                        }}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                style={[styles.input, errors.email && styles.inputError]}
                                placeholder="email@gmail.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                onChangeText={onChange}
                                value={value}
                            />
                        )}
                    />
                    {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}

                    <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading}>
                        {loading
                            ? <ActivityIndicator color={colors.white} />
                            : <Text style={styles.buttonText}>Enviar link</Text>
                        }
                    </TouchableOpacity>

                    {alert.status && (
                        <View style={[styles.alertBox, alert.success ? styles.alertSuccess : styles.alertError]}>
                            <Text style={styles.alertText}>{alert.message}</Text>
                        </View>
                    )}

                    <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.backLink}>
                        <Text style={styles.backText}>← Volver al login</Text>
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
    title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 8 },
    subtitle: { fontSize: 13, color: colors.inkSoft, marginBottom: 20, lineHeight: 20 },
    label: { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 4 },
    input: {
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.sm,
        padding: 10,
        marginBottom: 4,
        fontSize: 15,
        color: colors.ink,
    },
    inputError: { borderColor: colors.muerto },
    errorText: { fontSize: 12, color: colors.muerto, marginBottom: 8 },
    button: {
        backgroundColor: colors.campo,
        borderRadius: radius.sm,
        padding: 14,
        alignItems: 'center',
        marginTop: 16,
    },
    buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
    alertBox: { borderRadius: radius.sm, padding: 10, marginTop: 12 },
    alertSuccess: { backgroundColor: colors.vivo },
    alertError: { backgroundColor: colors.muerto },
    alertText: { color: colors.white, fontWeight: '600', textAlign: 'center', fontSize: 13 },
    backLink: { marginTop: 16, alignItems: 'center' },
    backText: { fontSize: 13, color: colors.campo, fontWeight: '600' },
});

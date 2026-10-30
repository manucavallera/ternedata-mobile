// Piezas que comparten las pantallas de pedidos y clientes de forrajería.
import { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { esAdminDelCampo } from '../../utils/roles';
import { colors, shadow, radius, space } from '../../theme';

export const mensajeError = (res, porDefecto) => {
    const msg = res?.data?.message;
    return (Array.isArray(msg) ? msg.join('. ') : msg) || porDefecto;
};

export const ok = (res) => res?.status === 200 || res?.status === 201;

export const fechaCorta = (valor) =>
    new Date(valor).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });

// Aviso arriba de la pantalla que se borra solo a los 4 segundos.
export const useAviso = () => {
    const [aviso, setAviso] = useState(null);
    const timer = useRef(null);
    const avisar = useCallback((texto, exito = true) => {
        setAviso({ texto, exito });
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setAviso(null), 4000);
    }, []);
    return [aviso, avisar];
};

export const Aviso = ({ aviso }) => aviso ? (
    <View style={[estilos.aviso, { backgroundColor: aviso.exito ? colors.vivo : colors.muerto }]}>
        <Text style={estilos.avisoTexto}>{aviso.texto}</Text>
    </View>
) : null;

// Precios, cancelar pedidos, pagos y editar clientes: solo el dueño (el backend también lo exige).
export const useEsDueno = () => {
    const { establecimientoActual, userPayload } = useSelector(state => state.auth);
    const { obtenerEstablecimientosHook } = useBussinesMicroservicio();
    return useCallback(async () => {
        const res = await obtenerEstablecimientosHook();
        const campos = res?.status === 200 ? res.data : [];
        return esAdminDelCampo(userPayload, establecimientoActual ?? userPayload?.id_establecimiento, campos);
    }, [establecimientoActual, userPayload]);
};

export const Encabezado = ({ titulo, subtitulo }) => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    return (
        <View style={[estilos.header, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={estilos.backBtn}>← Volver</Text>
            </TouchableOpacity>
            <Text style={estilos.headerTitle}>{titulo}</Text>
            {subtitulo ? <Text style={estilos.headerSub}>{subtitulo}</Text> : null}
        </View>
    );
};

export const Chips = ({ opciones, valor, onCambio }) => (
    <View style={estilos.chipsWrap}>
        {opciones.map(([v, etiqueta]) => (
            <TouchableOpacity key={String(v)} style={[estilos.chip, valor === v && estilos.chipActive]} onPress={() => onCambio(v)}>
                <Text style={[estilos.chipText, valor === v && estilos.chipTextActive]}>{etiqueta}</Text>
            </TouchableOpacity>
        ))}
    </View>
);

export const estilos = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { backgroundColor: colors.campoDark, paddingBottom: 16, paddingHorizontal: 16 },
    backBtn: { color: colors.campoSoft, fontSize: 14, fontWeight: '600', marginBottom: 6 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.white },
    headerSub: { fontSize: 12, color: colors.campoSoft, marginTop: 4 },
    aviso: { margin: space.md, marginBottom: 0, borderRadius: radius.sm, padding: 10 },
    avisoTexto: { color: colors.white, fontWeight: '600', textAlign: 'center' },
    content: { padding: space.md, paddingBottom: 96 },
    card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 12, ...shadow.card },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: 6 },
    label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6, marginTop: 10 },
    input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 10, fontSize: 14, color: colors.ink, backgroundColor: colors.surface },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.surface },
    chipActive: { backgroundColor: colors.campo, borderColor: colors.campo },
    chipText: { fontSize: 12, color: colors.ink, fontWeight: '600' },
    chipTextActive: { color: colors.white, fontWeight: '800' },
    btnPrimario: { backgroundColor: colors.campo, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 11, alignItems: 'center' },
    btnPrimarioText: { color: colors.white, fontWeight: '700', fontSize: 14 },
    btnSecundario: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 9, alignItems: 'center' },
    btnSecundarioText: { color: colors.ink, fontWeight: '700', fontSize: 13 },
    link: { fontSize: 14, fontWeight: '700', color: colors.campo },
    texto: { fontSize: 14, color: colors.ink },
    sub: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
    fuerte: { fontSize: 15, fontWeight: '700', color: colors.ink },
    monto: { fontSize: 16, fontWeight: '800', color: colors.ink },
    vacio: { color: colors.inkFaint, fontSize: 13, paddingVertical: 10, textAlign: 'center' },
    fila: { borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 12 },
    debe: { color: colors.vendido },
    aFavor: { color: colors.vivo },
    advertencia: { color: colors.vendido, fontSize: 12, fontWeight: '700', marginTop: 8 },
});

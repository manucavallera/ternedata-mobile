import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput,
    TouchableOpacity, View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, radius, shadow, space, type } from '../../theme';
import { useBussinesMicroservicio } from '../../hooks/bussines';

const today = () => new Date().toISOString().slice(0, 10);
const dateKey = (value) => value ? String(value).slice(0, 10) : '';
const monthKey = (value) => String(value).slice(0, 7);

const calendarDays = (month) => {
    const [year, monthNumber] = month.split('-').map(Number);
    const first = new Date(Date.UTC(year, monthNumber - 1, 1));
    const total = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const offset = (first.getUTCDay() + 6) % 7;
    return [...Array(offset).fill(null), ...Array.from({ length: total }, (_, i) => (
        `${month}-${String(i + 1).padStart(2, '0')}`
    ))];
};

const shiftMonth = (month, delta) => {
    const [year, number] = month.split('-').map(Number);
    const date = new Date(Date.UTC(year, number - 1 + delta, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (month) => {
    const [year, number] = month.split('-').map(Number);
    return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(Date.UTC(year, number - 1, 1)));
};

const initialCalostro = (date) => ({
    fecha: date,
    hora: '08:00',
    metodo: 'mamadera',
    litros: '',
    grado_brix: '',
    observaciones: '',
});

export default function TerneroSeguimientoScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const ternero = route.params?.ternero || {};
    const {
        obtenerPesajesSeguimientoHook, crearPesajeSeguimientoHook,
        actualizarPesajeSeguimientoHook, eliminarPesajeSeguimientoHook,
        obtenerCalostradosSeguimientoHook, crearCalostradoSeguimientoHook,
        actualizarCalostradoSeguimientoHook, eliminarCalostradoSeguimientoHook,
    } = useBussinesMicroservicio();

    const [pesajes, setPesajes] = useState([]);
    const [calostrados, setCalostrados] = useState([]);
    const [hitos, setHitos] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', success: false });
    const [selectedDate, setSelectedDate] = useState(today());
    const [month, setMonth] = useState(monthKey(today()));
    const [filter, setFilter] = useState('Todos');
    const [formType, setFormType] = useState('peso');
    const [editing, setEditing] = useState(null);
    const [pesoForm, setPesoForm] = useState({ fecha: today(), peso: '', observaciones: '' });
    const [calostroForm, setCalostroForm] = useState(initialCalostro(today()));

    const showAlert = (message, success = false) => {
        setAlert({ show: true, message, success });
        setTimeout(() => setAlert({ show: false, message: '', success: false }), 4000);
    };

    const cargar = async () => {
        setLoading(true);
        const [weights, colostrum] = await Promise.all([
            obtenerPesajesSeguimientoHook(ternero.id_ternero),
            obtenerCalostradosSeguimientoHook(ternero.id_ternero),
        ]);
        if (weights?.status >= 200 && weights.status < 300) {
            setPesajes(weights.data?.pesajes || []);
            setHitos(weights.data?.hitos || {});
        } else {
            showAlert(weights?.message || 'No se pudo cargar el seguimiento');
        }
        if (colostrum?.status >= 200 && colostrum.status < 300) {
            setCalostrados(colostrum.data?.calostrados || []);
        }
        setLoading(false);
    };

    useEffect(() => { cargar(); }, [ternero.id_ternero]);

    const markers = useMemo(() => {
        const map = {};
        pesajes.forEach((item) => { map[dateKey(item.fecha)] = { ...map[dateKey(item.fecha)], peso: true }; });
        calostrados.forEach((item) => { map[dateKey(item.fecha_hora)] = { ...map[dateKey(item.fecha_hora)], calostro: true }; });
        return map;
    }, [pesajes, calostrados]);

    const selectedRecords = useMemo(() => [
        ...(filter !== 'Calostrado' ? pesajes.filter((item) => dateKey(item.fecha) === selectedDate).map((item) => ({ ...item, tipo: 'peso' })) : []),
        ...(filter !== 'Pesos' ? calostrados.filter((item) => dateKey(item.fecha_hora) === selectedDate).map((item) => ({ ...item, tipo: 'calostro' })) : []),
    ], [calostrados, filter, pesajes, selectedDate]);

    const resetForm = (date = selectedDate) => {
        setEditing(null);
        setPesoForm({ fecha: date, peso: '', observaciones: '' });
        setCalostroForm(initialCalostro(date));
    };

    const guardarPeso = async () => {
        if (!pesoForm.fecha || !pesoForm.peso || Number.isNaN(Number(pesoForm.peso)) || Number(pesoForm.peso) <= 0) {
            showAlert('Ingresá una fecha y un peso válido'); return;
        }
        setSaving(true);
        const payload = { fecha: pesoForm.fecha, peso: Number(pesoForm.peso), observaciones: pesoForm.observaciones.trim() || undefined };
        const res = editing?.tipo === 'peso'
            ? await actualizarPesajeSeguimientoHook(ternero.id_ternero, editing.id_pesaje, payload)
            : await crearPesajeSeguimientoHook(ternero.id_ternero, payload);
        setSaving(false);
        if (res?.status >= 200 && res.status < 300) {
            showAlert(editing ? 'Pesaje actualizado' : 'Pesaje guardado', true);
            setSelectedDate(pesoForm.fecha); setMonth(monthKey(pesoForm.fecha)); resetForm(pesoForm.fecha); await cargar();
        } else showAlert(res?.message || 'No se pudo guardar el pesaje');
    };

    const guardarCalostro = async () => {
        const litros = Number(calostroForm.litros);
        const brix = calostroForm.grado_brix === '' ? undefined : Number(calostroForm.grado_brix);
        if (!calostroForm.fecha || !calostroForm.metodo || !Number.isFinite(litros) || litros <= 0 || (brix !== undefined && (!Number.isFinite(brix) || brix < 0 || brix > 50))) {
            showAlert('Completá fecha, método, litros y Brix válido'); return;
        }
        setSaving(true);
        const payload = {
            fecha_hora: `${calostroForm.fecha}T${calostroForm.hora || '08:00'}:00`,
            metodo: calostroForm.metodo,
            litros,
            grado_brix: brix,
            observaciones: calostroForm.observaciones.trim() || undefined,
        };
        const res = editing?.tipo === 'calostro'
            ? await actualizarCalostradoSeguimientoHook(ternero.id_ternero, editing.id_calostrado, payload)
            : await crearCalostradoSeguimientoHook(ternero.id_ternero, payload);
        setSaving(false);
        if (res?.status >= 200 && res.status < 300) {
            showAlert(editing ? 'Calostrado actualizado' : 'Calostrado guardado', true);
            setSelectedDate(calostroForm.fecha); setMonth(monthKey(calostroForm.fecha)); resetForm(calostroForm.fecha); await cargar();
        } else showAlert(res?.message || 'No se pudo guardar el calostrado');
    };

    const editar = (item) => {
        setEditing(item);
        if (item.tipo === 'peso') setPesoForm({ fecha: dateKey(item.fecha), peso: String(item.peso), observaciones: item.observaciones || '' });
        else setCalostroForm({ fecha: dateKey(item.fecha_hora), hora: String(item.fecha_hora).slice(11, 16) || '08:00', metodo: item.metodo, litros: String(item.litros), grado_brix: item.grado_brix == null ? '' : String(item.grado_brix), observaciones: item.observaciones || '' });
        setFormType(item.tipo === 'peso' ? 'peso' : 'calostro');
    };

    const eliminar = (item) => Alert.alert('Eliminar registro', 'No se puede deshacer.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: async () => {
            const res = item.tipo === 'peso'
                ? await eliminarPesajeSeguimientoHook(ternero.id_ternero, item.id_pesaje)
                : await eliminarCalostradoSeguimientoHook(ternero.id_ternero, item.id_calostrado);
            if (res?.status >= 200 && res.status < 300) { showAlert('Registro eliminado', true); await cargar(); }
            else showAlert(res?.message || 'No se pudo eliminar');
        } },
    ]);

    const days = calendarDays(month);
    const renderDate = (date) => {
        const marker = markers[date];
        return (
            <TouchableOpacity key={date || `empty-${Math.random()}`} disabled={!date} onPress={() => { setSelectedDate(date); resetForm(date); }} style={[styles.day, date === selectedDate && styles.daySelected]}>
                {date ? <Text style={[styles.dayText, date === selectedDate && styles.dayTextSelected]}>{Number(date.slice(-2))}</Text> : null}
                {marker ? <View style={styles.markerRow}>{marker.peso ? <View style={[styles.marker, styles.markerPeso]} /> : null}{marker.calostro ? <View style={[styles.marker, styles.markerCalostro]} /> : null}</View> : null}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></TouchableOpacity>
                <View style={{ flex: 1 }}><Text style={styles.eyebrow}>SEGUIMIENTO</Text><Text style={styles.title}>RP {ternero.rp_ternero ?? '—'}</Text></View>
                <TouchableOpacity onPress={cargar}><Text style={styles.reload}>↻</Text></TouchableOpacity>
            </View>
            {alert.show ? <View style={[styles.alert, alert.success ? styles.alertOk : styles.alertError]}><Text style={styles.alertText}>{alert.message}</Text></View> : null}
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                    <View style={styles.monthHeader}><TouchableOpacity onPress={() => setMonth(shiftMonth(month, -1))}><Text style={styles.monthArrow}>‹</Text></TouchableOpacity><Text style={styles.monthTitle}>{monthLabel(month)}</Text><TouchableOpacity onPress={() => setMonth(shiftMonth(month, 1))}><Text style={styles.monthArrow}>›</Text></TouchableOpacity></View>
                    <View style={styles.weekRow}>{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => <Text key={day} style={styles.weekDay}>{day}</Text>)}</View>
                    <View style={styles.calendar}>{days.map(renderDate)}</View>
                    <View style={styles.legend}><Text style={styles.legendText}><View style={[styles.marker, styles.markerPeso]} /> Peso</Text><Text style={styles.legendText}><View style={[styles.marker, styles.markerCalostro]} /> Calostrado</Text></View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Hitos de crecimiento</Text>
                    <View style={styles.milestones}>{[['Nacer', ternero.peso_nacer], ['15d', hitos['15d']?.peso], ['30d', hitos['30d']?.peso], ['45d', hitos['45d']?.peso], ['Largado', ternero.peso_largado]].map(([label, value]) => <View key={label} style={styles.milestone}><Text style={styles.milestoneValue}>{value == null || value === 0 ? '—' : `${Number(value)} kg`}</Text><Text style={styles.milestoneLabel}>{label}</Text>{hitos[label]?.fecha ? <Text style={styles.milestoneDate}>{dateKey(hitos[label].fecha)}</Text> : null}</View>)}</View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Registrar seguimiento</Text>
                    <View style={styles.tabs}>{[['peso', '⚖️ Peso'], ['calostro', '🍼 Calostrado']].map(([key, label]) => <TouchableOpacity key={key} onPress={() => { setFormType(key); setEditing(null); }} style={[styles.tab, formType === key && styles.tabActive]}><Text style={[styles.tabText, formType === key && styles.tabTextActive]}>{label}</Text></TouchableOpacity>)}</View>
                    {formType === 'peso' ? <>
                        <Text style={styles.label}>Fecha (YYYY-MM-DD) *</Text><TextInput style={styles.input} value={pesoForm.fecha} onChangeText={(value) => setPesoForm({ ...pesoForm, fecha: value })} keyboardType="numbers-and-punctuation" placeholder="2026-09-09" />
                        <Text style={styles.label}>Peso (kg) *</Text><TextInput style={styles.input} value={pesoForm.peso} onChangeText={(value) => setPesoForm({ ...pesoForm, peso: value })} keyboardType="decimal-pad" placeholder="Ej: 48.5" />
                        <Text style={styles.label}>Observaciones</Text><TextInput style={styles.input} value={pesoForm.observaciones} onChangeText={(value) => setPesoForm({ ...pesoForm, observaciones: value })} placeholder="Opcional" />
                        <TouchableOpacity style={styles.save} onPress={guardarPeso} disabled={saving}>{saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>{editing ? 'Actualizar pesaje' : 'Guardar pesaje'}</Text>}</TouchableOpacity>
                    </> : <>
                        <Text style={styles.label}>Fecha (YYYY-MM-DD) *</Text><TextInput style={styles.input} value={calostroForm.fecha} onChangeText={(value) => setCalostroForm({ ...calostroForm, fecha: value })} keyboardType="numbers-and-punctuation" placeholder="2026-09-09" />
                        <Text style={styles.label}>Hora</Text><TextInput style={styles.input} value={calostroForm.hora} onChangeText={(value) => setCalostroForm({ ...calostroForm, hora: value })} keyboardType="numbers-and-punctuation" placeholder="08:00" />
                        <Text style={styles.label}>Método *</Text><View style={styles.options}>{[['mamadera', '🍼 Mamadera'], ['sonda', '🩺 Sonda']].map(([key, label]) => <TouchableOpacity key={key} onPress={() => setCalostroForm({ ...calostroForm, metodo: key })} style={[styles.option, calostroForm.metodo === key && styles.optionActive]}><Text style={[styles.optionText, calostroForm.metodo === key && styles.optionTextActive]}>{label}</Text></TouchableOpacity>)}</View>
                        <Text style={styles.label}>Litros *</Text><TextInput style={styles.input} value={calostroForm.litros} onChangeText={(value) => setCalostroForm({ ...calostroForm, litros: value })} keyboardType="decimal-pad" placeholder="Ej: 2.5" />
                        <Text style={styles.label}>Grado Brix</Text><TextInput style={styles.input} value={calostroForm.grado_brix} onChangeText={(value) => setCalostroForm({ ...calostroForm, grado_brix: value })} keyboardType="decimal-pad" placeholder="0 a 50" />
                        <Text style={styles.label}>Observaciones</Text><TextInput style={styles.input} value={calostroForm.observaciones} onChangeText={(value) => setCalostroForm({ ...calostroForm, observaciones: value })} placeholder="Opcional" />
                        <TouchableOpacity style={styles.save} onPress={guardarCalostro} disabled={saving}>{saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>{editing ? 'Actualizar calostrado' : 'Guardar calostrado'}</Text>}</TouchableOpacity>
                    </>}
                </View>

                <View style={styles.card}>
                    <View style={styles.recordsHeader}><Text style={styles.sectionTitle}>Registros del {selectedDate}</Text><TouchableOpacity onPress={() => resetForm(selectedDate)}><Text style={styles.clear}>Limpiar</Text></TouchableOpacity></View>
                    <View style={styles.filters}>{['Todos', 'Pesos', 'Calostrado'].map((item) => <TouchableOpacity key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text></TouchableOpacity>)}</View>
                    {loading ? <ActivityIndicator color={colors.campo} style={{ margin: 20 }} /> : selectedRecords.length === 0 ? <Text style={styles.empty}>No hay registros para esta fecha.</Text> : selectedRecords.map((item) => <View key={`${item.tipo}-${item.id_pesaje || item.id_calostrado}`} style={styles.record}><View style={{ flex: 1 }}><Text style={styles.recordTitle}>{item.tipo === 'peso' ? `⚖️ ${item.peso} kg` : `${item.metodo === 'mamadera' ? '🍼' : '🩺'} ${item.litros} L · ${String(item.fecha_hora).slice(11, 16)}`}</Text><Text style={styles.recordSub}>{item.tipo === 'peso' ? `Ganancia ${item.ganancia_desde_anterior ?? '—'} kg · ${item.aumento_diario_promedio ?? '—'} kg/día` : `Brix: ${item.grado_brix ?? '—'}`}</Text>{item.observaciones ? <Text style={styles.recordObs}>{item.observaciones}</Text> : null}</View><TouchableOpacity onPress={() => editar(item)}><Text style={styles.action}>✏️</Text></TouchableOpacity><TouchableOpacity onPress={() => eliminar(item)}><Text style={styles.action}>🗑️</Text></TouchableOpacity></View>)}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { paddingTop: 52, paddingBottom: 16, paddingHorizontal: space.lg, backgroundColor: colors.campoDark, flexDirection: 'row', alignItems: 'center', gap: space.md },
    back: { color: colors.white, fontSize: 38, lineHeight: 38 },
    reload: { color: colors.caravana, fontSize: 28 },
    eyebrow: { ...type.eyebrow, color: colors.caravana },
    title: { ...type.h1, color: colors.white, marginTop: 2 },
    content: { padding: space.md, paddingBottom: 48, gap: space.md },
    alert: { margin: space.md, marginBottom: 0, padding: 11, borderRadius: radius.sm },
    alertOk: { backgroundColor: colors.vivo }, alertError: { backgroundColor: colors.muerto },
    alertText: { color: colors.white, fontWeight: '800', textAlign: 'center' },
    card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, ...shadow.card },
    monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    monthTitle: { ...type.title, textTransform: 'capitalize', color: colors.ink }, monthArrow: { fontSize: 30, color: colors.campo, paddingHorizontal: 12 },
    weekRow: { flexDirection: 'row', marginTop: space.sm }, weekDay: { flex: 1, textAlign: 'center', color: colors.inkFaint, fontWeight: '800' },
    calendar: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.xs }, day: { width: '14.285%', height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm }, daySelected: { backgroundColor: colors.campo }, dayText: { color: colors.ink, fontWeight: '700' }, dayTextSelected: { color: colors.white },
    markerRow: { flexDirection: 'row', gap: 3, position: 'absolute', bottom: 4 }, marker: { width: 6, height: 6, borderRadius: 3 }, markerPeso: { backgroundColor: colors.campo }, markerCalostro: { backgroundColor: colors.caravana },
    legend: { flexDirection: 'row', gap: space.lg, marginTop: space.sm }, legendText: { color: colors.inkSoft, fontSize: 12, fontWeight: '700' },
    sectionTitle: { ...type.title, color: colors.ink, marginBottom: space.sm }, milestones: { flexDirection: 'row', justifyContent: 'space-between' }, milestone: { alignItems: 'center', flex: 1 }, milestoneValue: { color: colors.campo, fontWeight: '900', fontSize: 13 }, milestoneLabel: { color: colors.inkSoft, fontSize: 11, marginTop: 3 }, milestoneDate: { color: colors.inkFaint, fontSize: 9, marginTop: 2 },
    tabs: { flexDirection: 'row', gap: space.sm, marginBottom: space.md }, tab: { flex: 1, padding: 10, borderRadius: radius.sm, backgroundColor: colors.bg, alignItems: 'center' }, tabActive: { backgroundColor: colors.campo }, tabText: { color: colors.inkSoft, fontWeight: '800' }, tabTextActive: { color: colors.white },
    label: { ...type.label, color: colors.inkSoft, marginBottom: 5, marginTop: space.sm }, input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, backgroundColor: colors.surface }, options: { flexDirection: 'row', gap: space.sm }, option: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 10, alignItems: 'center' }, optionActive: { borderColor: colors.campo, backgroundColor: colors.campoSoft }, optionText: { color: colors.inkSoft, fontWeight: '700' }, optionTextActive: { color: colors.campo },
    save: { backgroundColor: colors.campo, borderRadius: radius.sm, padding: 13, alignItems: 'center', marginTop: space.md }, saveText: { color: colors.white, fontWeight: '900' },
    recordsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, clear: { color: colors.campo, fontWeight: '800' }, filters: { flexDirection: 'row', gap: space.sm, marginBottom: space.sm }, filter: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 6 }, filterActive: { backgroundColor: colors.campo, borderColor: colors.campo }, filterText: { color: colors.inkSoft, fontSize: 12, fontWeight: '700' }, filterTextActive: { color: colors.white }, empty: { color: colors.inkFaint, textAlign: 'center', padding: space.lg }, record: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 11, gap: space.sm }, recordTitle: { color: colors.ink, fontWeight: '900' }, recordSub: { color: colors.inkSoft, fontSize: 12, marginTop: 3 }, recordObs: { color: colors.inkFaint, fontSize: 12, marginTop: 3 }, action: { fontSize: 17, padding: 4 },
});

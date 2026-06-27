import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { colors, space, radius, shadow, type, estadoColor } from '../../theme';
import Caravana from '../../components/Caravana';

const ESTADOS = ['', 'Vivo', 'Muerto', 'Vendido'];

const formatFecha = (fecha) => {
    if (!fecha) return '-';
    try {
        return format(parseISO(fecha), 'dd/MM/yyyy', { locale: es });
    } catch {
        return fecha;
    }
};

// Peso ideal: el del backend o estimado (2× peso al nacer), igual que la web
const pesoIdeal = (t) => t.peso_ideal || (t.peso_nacer ? Number(t.peso_nacer) * 2 : null);

const rendimientoColor = (r) => {
    switch (r) {
        case 'Excelente': return colors.vivo;
        case 'Bueno': return '#2F73D1';
        case 'Regular': return colors.caravana;
        case 'Bajo': return colors.muerto;
        default: return colors.neutro;
    }
};

const calidadBrix = (brix) => {
    if (!brix) return { txt: 'Sin medición', color: colors.neutro };
    const b = parseFloat(brix);
    if (b >= 22) return { txt: 'Excelente', color: colors.vivo };
    if (b >= 18) return { txt: 'Bueno', color: '#2F73D1' };
    if (b >= 15) return { txt: 'Regular', color: colors.caravana };
    return { txt: 'Bajo', color: colors.muerto };
};

export default function TerneroListadoScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { userPayload, establecimientoActual } = useSelector(state => state.auth);
    const {
        obtenerTerneroHook, patchTerneroHook, agregarPesoDiarioHook,
        obtenerHistorialCompletoHook, actualizarCalostradoHook,
    } = useBussinesMicroservicio();

    const [terneros, setTerneros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [total, setTotal] = useState(0);

    const [searchInput, setSearchInput] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');

    const [modalEditar, setModalEditar] = useState({ isOpen: false, ternero: null });
    const [modalPeso, setModalPeso] = useState({ isOpen: false, ternero: null });
    const [modalOficial, setModalOficial] = useState({ isOpen: false, ternero: null });
    const [modalCalostrado, setModalCalostrado] = useState({ isOpen: false, ternero: null });
    const [modalHistorial, setModalHistorial] = useState({ isOpen: false, ternero: null, data: null, loading: false });

    const [formEditar, setFormEditar] = useState({ estado: '', sexo: '', semen: '', observaciones: '' });
    const [pesoDiario, setPesoDiario] = useState('');
    const [formOficial, setFormOficial] = useState({ tipo_peso: '15d', peso: '' });
    const [formCalostrado, setFormCalostrado] = useState({ metodo_calostrado: '', litros_calostrado: '', fecha_hora_calostrado: '', observaciones_calostrado: '', grado_brix: '' });

    const [alert, setAlert] = useState({ show: false, message: '', success: false });
    const [saving, setSaving] = useState(false);

    const showAlert = (message, success = true) => {
        setAlert({ show: true, message, success });
        setTimeout(() => setAlert({ show: false, message: '', success: false }), 4000);
    };

    const cargarTerneros = useCallback(async (search = '', estado = '') => {
        setLoading(true);
        try {
            let q = '';
            if (userPayload?.rol === 'admin' && establecimientoActual) {
                q = `id_establecimiento=${establecimientoActual}&`;
            }
            q += 'page=1&limit=500';
            if (search) q += `&search=${encodeURIComponent(search)}`;
            if (estado) q += `&estado=${encodeURIComponent(estado)}`;

            const res = await obtenerTerneroHook(q);
            setTerneros(res?.data?.data || []);
            setTotal(res?.data?.total || 0);
        } catch {
            showAlert('Error al cargar terneros', false);
        } finally {
            setLoading(false);
        }
    }, [establecimientoActual, userPayload]);

    useEffect(() => { cargarTerneros(); }, [establecimientoActual]);

    const onRefresh = async () => {
        setRefreshing(true);
        await cargarTerneros(searchInput, filtroEstado);
        setRefreshing(false);
    };

    const handleBuscar = () => cargarTerneros(searchInput, filtroEstado);

    const handleEstado = (estado) => {
        setFiltroEstado(estado);
        cargarTerneros(searchInput, estado);
    };

    const abrirEditar = (ternero) => {
        setFormEditar({
            estado: ternero.estado || 'Vivo',
            sexo: ternero.sexo || 'Macho',
            semen: ternero.semen || '',
            observaciones: ternero.observaciones || '',
        });
        setModalEditar({ isOpen: true, ternero });
    };

    const guardarEdicion = async () => {
        setSaving(true);
        const res = await patchTerneroHook(modalEditar.ternero.id_ternero, formEditar);
        if (res?.status === 200) {
            showAlert('Ternero actualizado');
            setModalEditar({ isOpen: false, ternero: null });
            await cargarTerneros(searchInput, filtroEstado);
        } else {
            showAlert('Error al actualizar', false);
        }
        setSaving(false);
    };

    const guardarPeso = async () => {
        if (!pesoDiario) return;
        setSaving(true);
        const res = await agregarPesoDiarioHook(modalPeso.ternero.id_ternero, { peso_actual: parseFloat(pesoDiario) });
        if (res?.status === 201 || res?.status === 200) {
            showAlert(`Peso registrado: ${pesoDiario}kg`);
            setModalPeso({ isOpen: false, ternero: null });
            setPesoDiario('');
            await cargarTerneros(searchInput, filtroEstado);
        } else {
            showAlert('Error al registrar peso', false);
        }
        setSaving(false);
    };

    const abrirOficial = (ternero) => {
        setFormOficial({ tipo_peso: '15d', peso: '' });
        setModalOficial({ isOpen: true, ternero });
    };

    const guardarOficial = async () => {
        if (!formOficial.peso) { showAlert('Ingresá el peso', false); return; }
        setSaving(true);
        const campo = { '15d': 'peso_15d', '30d': 'peso_30d', '45d': 'peso_45d' }[formOficial.tipo_peso];
        const res = await patchTerneroHook(modalOficial.ternero.id_ternero, { [campo]: parseFloat(formOficial.peso) });
        if (res?.status === 200) {
            showAlert(`Peso ${formOficial.tipo_peso} actualizado`);
            setModalOficial({ isOpen: false, ternero: null });
            await cargarTerneros(searchInput, filtroEstado);
        } else {
            showAlert('Error al actualizar peso oficial', false);
        }
        setSaving(false);
    };

    const abrirCalostrado = (ternero) => {
        setFormCalostrado({
            metodo_calostrado: ternero.metodo_calostrado || '',
            litros_calostrado: ternero.litros_calostrado ? String(ternero.litros_calostrado) : '',
            fecha_hora_calostrado: ternero.fecha_hora_calostrado ? String(ternero.fecha_hora_calostrado).slice(0, 10) : '',
            observaciones_calostrado: ternero.observaciones_calostrado || '',
            grado_brix: ternero.grado_brix ? String(ternero.grado_brix) : '',
        });
        setModalCalostrado({ isOpen: true, ternero });
    };

    const guardarCalostrado = async () => {
        if (!formCalostrado.metodo_calostrado || !formCalostrado.litros_calostrado) {
            showAlert('Completá método y litros', false); return;
        }
        setSaving(true);
        const data = {
            metodo_calostrado: formCalostrado.metodo_calostrado,
            litros_calostrado: parseFloat(formCalostrado.litros_calostrado),
        };
        if (formCalostrado.fecha_hora_calostrado) data.fecha_hora_calostrado = formCalostrado.fecha_hora_calostrado;
        if (formCalostrado.observaciones_calostrado?.trim()) data.observaciones_calostrado = formCalostrado.observaciones_calostrado.trim();
        if (formCalostrado.grado_brix) data.grado_brix = parseFloat(formCalostrado.grado_brix);
        const res = await actualizarCalostradoHook(modalCalostrado.ternero.id_ternero, data);
        if (res?.status === 200) {
            showAlert('Calostrado actualizado');
            setModalCalostrado({ isOpen: false, ternero: null });
            await cargarTerneros(searchInput, filtroEstado);
        } else {
            showAlert('Error al actualizar calostrado', false);
        }
        setSaving(false);
    };

    const abrirHistorial = async (ternero) => {
        setModalHistorial({ isOpen: true, ternero, data: null, loading: true });
        try {
            const res = await obtenerHistorialCompletoHook(ternero.id_ternero);
            if (res?.status === 200) {
                setModalHistorial(prev => ({ ...prev, data: res.data, loading: false }));
            } else {
                showAlert('Error al cargar historial', false);
                setModalHistorial(prev => ({ ...prev, loading: false }));
            }
        } catch {
            showAlert('Error de conexión', false);
            setModalHistorial(prev => ({ ...prev, loading: false }));
        }
    };

    const renderTernero = ({ item }) => {
        const sexo = item.sexo === 'Hembra' ? '♀' : item.sexo === 'Macho' ? '♂' : '';
        const ideal = pesoIdeal(item);
        const tieneCalostro = !!item.metodo_calostrado;
        const brix = calidadBrix(item.grado_brix);
        return (
            <View style={styles.card}>
                <View style={styles.cardTop}>
                    <Caravana rp={item.rp_ternero ?? item.id_ternero} />
                    <View style={styles.cardInfo}>
                        <Text style={styles.cardName} numberOfLines={1}>{item.nombre || 'Sin nombre'}</Text>
                        <Text style={styles.cardSub} numberOfLines={1}>
                            {sexo ? `${sexo} ${item.sexo}` : 'Sexo —'}
                            {item.dias_desde_nacimiento != null ? ` · ${item.dias_desde_nacimiento}d de vida` : ''}
                            {` · ${formatFecha(item.fecha_nacimiento)}`}
                        </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: estadoColor(item.estado) }]}>
                        <Text style={styles.badgeText}>{item.estado || '—'}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Métricas clave */}
                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>ÚLTIMO PESO</Text>
                        <Text style={styles.metaValue}>{item.ultimo_peso ?? item.peso_nacer ?? '—'} kg</Text>
                    </View>
                    <View style={styles.metaSep} />
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>P. IDEAL</Text>
                        <Text style={[styles.metaValue, { color: colors.vendido }]}>{ideal ? `${ideal} kg` : '—'}</Text>
                    </View>
                    <View style={styles.metaSep} />
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>GAN./DÍA</Text>
                        <Text style={styles.metaValue}>{item.aumento_diario_promedio != null ? `${Number(item.aumento_diario_promedio).toFixed(2)}` : '—'}</Text>
                    </View>
                </View>

                {/* Pesos oficiales por etapa */}
                <View style={styles.pesosRow}>
                    {[['Nacer', 'peso_nacer'], ['15d', 'peso_15d'], ['30d', 'peso_30d'], ['45d', 'peso_45d'], ['Largado', 'peso_largado']].map(([lbl, key]) => (
                        <View key={key} style={styles.pesoCell}>
                            <Text style={styles.pesoVal}>{item[key] ? Number(item[key]) : '—'}</Text>
                            <Text style={styles.pesoLbl}>{lbl}</Text>
                        </View>
                    ))}
                </View>

                {/* Rendimiento + Semen */}
                {(item.rendimiento_15d || item.rendimiento_30d || item.semen) ? (
                    <View style={styles.chipRow}>
                        {item.rendimiento_15d ? (
                            <View style={[styles.chip, { backgroundColor: rendimientoColor(item.rendimiento_15d) }]}>
                                <Text style={styles.chipText}>15d: {item.rendimiento_15d}</Text>
                            </View>
                        ) : null}
                        {item.rendimiento_30d ? (
                            <View style={[styles.chip, { backgroundColor: rendimientoColor(item.rendimiento_30d) }]}>
                                <Text style={styles.chipText}>30d: {item.rendimiento_30d}</Text>
                            </View>
                        ) : null}
                        {item.semen ? (
                            <View style={[styles.chip, styles.chipNeutro]}>
                                <Text style={styles.chipTextDark}>🧬 {item.semen}</Text>
                            </View>
                        ) : null}
                    </View>
                ) : null}

                {/* Madre */}
                <View style={styles.lineRow}>
                    <Text style={styles.lineLabel}>Madre:</Text>
                    {item.madre ? (
                        <Text style={styles.lineValue}>
                            {item.madre.nombre ? `${item.madre.nombre} · ` : ''}RP {item.madre.rp_madre}
                        </Text>
                    ) : (
                        <Text style={styles.lineMuted}>Sin madre asignada</Text>
                    )}
                </View>

                {/* Calostrado */}
                <View style={styles.lineRow}>
                    <Text style={styles.lineLabel}>Calostrado:</Text>
                    {tieneCalostro ? (
                        <Text style={styles.lineValue}>
                            {item.metodo_calostrado === 'mamadera' ? '🍼' : '🩺'} {item.metodo_calostrado}
                            {item.litros_calostrado ? ` · ${item.litros_calostrado}L` : ''}
                            {item.grado_brix && parseFloat(item.grado_brix) > 0 ? ` · ${item.grado_brix}° Brix (${brix.txt})` : ''}
                        </Text>
                    ) : (
                        <Text style={styles.lineMuted}>Sin registrar</Text>
                    )}
                </View>

                {item.observaciones ? (
                    <Text style={styles.observaciones} numberOfLines={2}>“{item.observaciones}”</Text>
                ) : null}

                {/* Acciones */}
                <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actBtn} onPress={() => { setPesoDiario(''); setModalPeso({ isOpen: true, ternero: item }); }}>
                        <Text style={styles.actBtnText}>⚖️ Peso</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actBtn} onPress={() => abrirHistorial(item)}>
                        <Text style={styles.actBtnText}>📊 Historial</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actBtn} onPress={() => abrirCalostrado(item)}>
                        <Text style={styles.actBtnText}>🍼 {tieneCalostro ? 'Calostrado' : '+ Calostro'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actBtn} onPress={() => abrirOficial(item)}>
                        <Text style={styles.actBtnText}>📋 P. Oficial</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actBtn, styles.actBtnPrimary]} onPress={() => abrirEditar(item)}>
                        <Text style={[styles.actBtnText, styles.actBtnTextPrimary]}>✏️ Editar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <View>
                    <Text style={styles.headerEyebrow}>TERNEDATA · HACIENDA</Text>
                    <Text style={styles.headerTitle}>🐮 Terneros</Text>
                </View>
                <View style={styles.countChip}>
                    <Text style={styles.countNum}>{total}</Text>
                    <Text style={styles.countLabel}>en el campo</Text>
                </View>
            </View>

            {/* Alerta */}
            {alert.show && (
                <View style={[styles.alert, alert.success ? styles.alertSuccess : styles.alertError]}>
                    <Text style={styles.alertText}>{alert.message}</Text>
                </View>
            )}

            {/* Búsqueda */}
            <View style={styles.searchRow}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por RP ternero o madre..."
                    value={searchInput}
                    onChangeText={setSearchInput}
                    onSubmitEditing={handleBuscar}
                    returnKeyType="search"
                />
                <TouchableOpacity style={styles.searchBtn} onPress={handleBuscar}>
                    <Text style={styles.searchBtnText}>Buscar</Text>
                </TouchableOpacity>
            </View>

            {/* Filtro estado */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtroRow} contentContainerStyle={styles.filtroContent}>
                {ESTADOS.map(e => (
                    <TouchableOpacity
                        key={e || 'todos'}
                        style={[styles.filtroBtn, filtroEstado === e && styles.filtroBtnActive]}
                        onPress={() => handleEstado(e)}
                    >
                        <Text style={[styles.filtroBtnText, filtroEstado === e && styles.filtroBtnTextActive]}>
                            {e || 'Todos'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Lista */}
            {loading ? (
                <ActivityIndicator size="large" color={colors.campo} style={styles.loader} />
            ) : (
                <FlatList
                    data={terneros}
                    keyExtractor={item => String(item.id_ternero)}
                    renderItem={renderTernero}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={<Text style={styles.empty}>Sin terneros</Text>}
                    contentContainerStyle={styles.list}
                />
            )}

            {/* FAB nuevo ternero */}
            <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('TerneroForm')}>
                <Text style={styles.fabText}>+ Nuevo</Text>
            </TouchableOpacity>

            {/* Modal Editar */}
            <Modal visible={modalEditar.isOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
                        <View style={styles.modalCard}>
                            <Text style={styles.modalTitle}>Editar — RP {modalEditar.ternero?.rp_ternero}</Text>

                            <Text style={styles.label}>Estado</Text>
                            <View style={styles.optionRow}>
                                {['Vivo', 'Muerto', 'Vendido'].map(e => (
                                    <TouchableOpacity
                                        key={e}
                                        style={[styles.optionBtn, formEditar.estado === e && styles.optionBtnActive]}
                                        onPress={() => setFormEditar(f => ({ ...f, estado: e }))}
                                    >
                                        <Text style={[styles.optionBtnText, formEditar.estado === e && styles.optionBtnTextActive]}>{e}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Sexo</Text>
                            <View style={styles.optionRow}>
                                {['Macho', 'Hembra'].map(s => (
                                    <TouchableOpacity
                                        key={s}
                                        style={[styles.optionBtn, formEditar.sexo === s && styles.optionBtnActive]}
                                        onPress={() => setFormEditar(f => ({ ...f, sexo: s }))}
                                    >
                                        <Text style={[styles.optionBtnText, formEditar.sexo === s && styles.optionBtnTextActive]}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Semen</Text>
                            <TextInput
                                style={styles.input}
                                value={formEditar.semen}
                                onChangeText={v => setFormEditar(f => ({ ...f, semen: v }))}
                                placeholder="Semen"
                            />

                            <Text style={styles.label}>Observaciones</Text>
                            <TextInput
                                style={[styles.input, styles.inputMulti]}
                                value={formEditar.observaciones}
                                onChangeText={v => setFormEditar(f => ({ ...f, observaciones: v }))}
                                placeholder="Observaciones"
                                multiline
                                numberOfLines={3}
                            />

                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalEditar({ isOpen: false, ternero: null })}>
                                    <Text style={styles.btnCancelarText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.btnGuardar} onPress={guardarEdicion} disabled={saving}>
                                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnGuardarText}>Guardar</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* Modal Peso Diario */}
            <Modal visible={modalPeso.isOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>⚖️ Peso diario — RP {modalPeso.ternero?.rp_ternero}</Text>
                        <Text style={styles.modalSub}>
                            Días de vida: {modalPeso.ternero?.dias_desde_nacimiento ?? 0} · Último: {modalPeso.ternero?.ultimo_peso ?? modalPeso.ternero?.peso_nacer ?? '—'}kg
                        </Text>
                        <Text style={styles.label}>Peso actual (kg)</Text>
                        <TextInput
                            style={styles.input}
                            value={pesoDiario}
                            onChangeText={setPesoDiario}
                            placeholder="Ej: 45.5"
                            keyboardType="decimal-pad"
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalPeso({ isOpen: false, ternero: null })}>
                                <Text style={styles.btnCancelarText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnGuardar} onPress={guardarPeso} disabled={saving}>
                                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnGuardarText}>Guardar</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal Peso Oficial */}
            <Modal visible={modalOficial.isOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>📋 Peso oficial — RP {modalOficial.ternero?.rp_ternero}</Text>
                        <Text style={styles.label}>Etapa</Text>
                        <View style={styles.optionRow}>
                            {['15d', '30d', '45d'].map(t => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.optionBtn, formOficial.tipo_peso === t && styles.optionBtnActive]}
                                    onPress={() => setFormOficial(f => ({ ...f, tipo_peso: t }))}
                                >
                                    <Text style={[styles.optionBtnText, formOficial.tipo_peso === t && styles.optionBtnTextActive]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.label}>Peso (kg)</Text>
                        <TextInput
                            style={styles.input}
                            value={formOficial.peso}
                            onChangeText={v => setFormOficial(f => ({ ...f, peso: v }))}
                            placeholder="Ej: 60"
                            keyboardType="decimal-pad"
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalOficial({ isOpen: false, ternero: null })}>
                                <Text style={styles.btnCancelarText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnGuardar} onPress={guardarOficial} disabled={saving}>
                                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnGuardarText}>Guardar</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal Calostrado */}
            <Modal visible={modalCalostrado.isOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
                        <View style={styles.modalCard}>
                            <Text style={styles.modalTitle}>🍼 Calostrado — RP {modalCalostrado.ternero?.rp_ternero}</Text>

                            <Text style={styles.label}>Método *</Text>
                            <View style={styles.optionRow}>
                                {[['mamadera', '🍼 Mamadera'], ['sonda', '🩺 Sonda']].map(([v, lbl]) => (
                                    <TouchableOpacity
                                        key={v}
                                        style={[styles.optionBtn, formCalostrado.metodo_calostrado === v && styles.optionBtnActive]}
                                        onPress={() => setFormCalostrado(f => ({ ...f, metodo_calostrado: v }))}
                                    >
                                        <Text style={[styles.optionBtnText, formCalostrado.metodo_calostrado === v && styles.optionBtnTextActive]}>{lbl}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Litros *</Text>
                            <TextInput
                                style={styles.input}
                                value={formCalostrado.litros_calostrado}
                                onChangeText={v => setFormCalostrado(f => ({ ...f, litros_calostrado: v }))}
                                placeholder="Ej: 2.5"
                                keyboardType="decimal-pad"
                            />

                            <Text style={styles.label}>Fecha (YYYY-MM-DD)</Text>
                            <TextInput
                                style={styles.input}
                                value={formCalostrado.fecha_hora_calostrado}
                                onChangeText={v => setFormCalostrado(f => ({ ...f, fecha_hora_calostrado: v }))}
                                placeholder="2026-06-26"
                            />

                            <Text style={styles.label}>Grado Brix (°)</Text>
                            <TextInput
                                style={styles.input}
                                value={formCalostrado.grado_brix}
                                onChangeText={v => setFormCalostrado(f => ({ ...f, grado_brix: v }))}
                                placeholder="Ej: 22.5"
                                keyboardType="decimal-pad"
                            />
                            <Text style={styles.hint}>Excelente ≥22° · Bueno 18-21° · Regular 15-17° · Bajo &lt;15°</Text>

                            <Text style={styles.label}>Observaciones</Text>
                            <TextInput
                                style={[styles.input, styles.inputMulti]}
                                value={formCalostrado.observaciones_calostrado}
                                onChangeText={v => setFormCalostrado(f => ({ ...f, observaciones_calostrado: v }))}
                                placeholder="Observaciones"
                                multiline
                                numberOfLines={2}
                            />

                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalCalostrado({ isOpen: false, ternero: null })}>
                                    <Text style={styles.btnCancelarText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.btnGuardar} onPress={guardarCalostrado} disabled={saving}>
                                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnGuardarText}>Guardar</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* Modal Historial */}
            <Modal visible={modalHistorial.isOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { maxHeight: '88%' }]}>
                        <View style={styles.histHeader}>
                            <Text style={styles.modalTitle}>📊 Historial — RP {modalHistorial.ternero?.rp_ternero}</Text>
                            <TouchableOpacity onPress={() => setModalHistorial({ isOpen: false, ternero: null, data: null, loading: false })}>
                                <Text style={styles.histClose}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {modalHistorial.loading ? (
                            <ActivityIndicator size="large" color={colors.campo} style={{ marginVertical: 30 }} />
                        ) : modalHistorial.data ? (
                            <ScrollView>
                                <View style={styles.histStats}>
                                    <View style={styles.histStat}>
                                        <Text style={styles.histStatLabel}>Nacer</Text>
                                        <Text style={[styles.histStatVal, { color: colors.vivo }]}>{modalHistorial.data.peso_nacer}kg</Text>
                                    </View>
                                    <View style={styles.histStat}>
                                        <Text style={styles.histStatLabel}>Actual</Text>
                                        <Text style={[styles.histStatVal, { color: '#2F73D1' }]}>{modalHistorial.data.ultimo_peso}kg</Text>
                                    </View>
                                    <View style={styles.histStat}>
                                        <Text style={styles.histStatLabel}>Ganancia</Text>
                                        <Text style={[styles.histStatVal, { color: colors.vendido }]}>+{modalHistorial.data.ganancia_total ?? 0}kg</Text>
                                    </View>
                                    <View style={styles.histStat}>
                                        <Text style={styles.histStatLabel}>Gan./día</Text>
                                        <Text style={[styles.histStatVal, { color: colors.campo }]}>{modalHistorial.data.aumento_diario_promedio ?? 0}</Text>
                                    </View>
                                </View>

                                <Text style={styles.histSubtitle}>
                                    Pesajes ({modalHistorial.data.historial_pesos?.length || 0})
                                </Text>

                                <View style={styles.histRowHead}>
                                    <Text style={[styles.histCell, styles.histCellHead, { flex: 0.5 }]}>#</Text>
                                    <Text style={[styles.histCell, styles.histCellHead, { flex: 1.2 }]}>Fecha</Text>
                                    <Text style={[styles.histCell, styles.histCellHead, { flex: 1 }]}>Peso</Text>
                                    <Text style={[styles.histCell, styles.histCellHead, { flex: 1 }]}>Gan.</Text>
                                </View>
                                <View style={styles.histRow}>
                                    <Text style={[styles.histCell, { flex: 0.5 }]}>🍼</Text>
                                    <Text style={[styles.histCell, { flex: 1.2 }]}>Nacimiento</Text>
                                    <Text style={[styles.histCell, { flex: 1, fontWeight: '800' }]}>{modalHistorial.data.peso_nacer}kg</Text>
                                    <Text style={[styles.histCell, { flex: 1 }]}>—</Text>
                                </View>
                                {(modalHistorial.data.historial_pesos || []).map((p, i, arr) => {
                                    const prev = i === 0 ? modalHistorial.data.peso_nacer : arr[i - 1].peso;
                                    const gan = (p.peso - prev).toFixed(1);
                                    return (
                                        <View key={i} style={[styles.histRow, i % 2 === 0 && styles.histRowAlt]}>
                                            <Text style={[styles.histCell, { flex: 0.5 }]}>{i + 1}</Text>
                                            <Text style={[styles.histCell, { flex: 1.2 }]}>{p.fecha}</Text>
                                            <Text style={[styles.histCell, { flex: 1, fontWeight: '800' }]}>{p.peso}kg</Text>
                                            <Text style={[styles.histCell, { flex: 1, color: gan > 0 ? colors.vivo : gan < 0 ? colors.muerto : colors.inkSoft }]}>
                                                {gan > 0 ? '+' : ''}{gan}kg
                                            </Text>
                                        </View>
                                    );
                                })}
                                {(!modalHistorial.data.historial_pesos || modalHistorial.data.historial_pesos.length === 0) ? (
                                    <Text style={styles.histEmpty}>Sin pesajes registrados. Usá ⚖️ Peso para agregar el primero.</Text>
                                ) : null}
                            </ScrollView>
                        ) : (
                            <Text style={styles.histEmpty}>Sin datos</Text>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
        backgroundColor: colors.campoDark, paddingTop: 52, paddingBottom: 18, paddingHorizontal: space.lg,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
        borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg,
    },
    headerEyebrow: { ...type.eyebrow, color: colors.caravana, marginBottom: 3 },
    headerTitle: { ...type.h1, color: colors.white },
    countChip: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
    countNum: { ...type.h2, ...type.num, color: colors.caravana },
    countLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, color: '#CFE3D4', textTransform: 'uppercase' },

    alert: { marginHorizontal: space.md, marginTop: space.md, borderRadius: radius.sm, padding: 11 },
    alertSuccess: { backgroundColor: colors.vivo },
    alertError: { backgroundColor: colors.muerto },
    alertText: { color: colors.white, fontWeight: '700', textAlign: 'center' },

    searchRow: { flexDirection: 'row', marginHorizontal: space.md, marginTop: space.md, gap: space.sm },
    searchInput: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.ink },
    searchBtn: { backgroundColor: colors.campo, borderRadius: radius.sm, paddingHorizontal: 16, justifyContent: 'center' },
    searchBtnText: { color: colors.white, fontWeight: '800', fontSize: 13 },

    filtroRow: { paddingVertical: space.md, flexGrow: 0 },
    filtroContent: { paddingHorizontal: space.md, alignItems: 'center', gap: space.sm },
    filtroBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 7, backgroundColor: colors.surface },
    filtroBtnActive: { backgroundColor: colors.campo, borderColor: colors.campo },
    filtroBtnText: { fontSize: 13, color: colors.inkSoft, fontWeight: '600' },
    filtroBtnTextActive: { color: colors.white, fontWeight: '800' },

    loader: { marginTop: 48 },
    list: { paddingHorizontal: space.md, paddingBottom: 96 },
    empty: { textAlign: 'center', color: colors.inkFaint, marginTop: 48, fontSize: 15 },

    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginBottom: space.md, ...shadow.card },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardInfo: { flex: 1, minWidth: 0 },
    cardName: { ...type.title, color: colors.ink },
    cardSub: { fontSize: 12, color: colors.inkSoft, fontWeight: '600', marginTop: 2 },
    badge: { borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 4 },
    badgeText: { color: colors.white, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

    divider: { height: 1, backgroundColor: colors.line, marginVertical: 12 },
    metaRow: { flexDirection: 'row', alignItems: 'center' },
    metaItem: { flex: 1 },
    metaSep: { width: 1, height: 26, backgroundColor: colors.line, marginHorizontal: 10 },
    metaLabel: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1, color: colors.inkFaint },
    metaValue: { ...type.title, ...type.num, color: colors.ink, marginTop: 1 },
    pesosRow: { flexDirection: 'row', gap: 5, marginTop: 12 },
    pesoCell: { flex: 1, backgroundColor: colors.campoSoft, borderRadius: radius.sm, paddingVertical: 7, alignItems: 'center' },
    pesoVal: { ...type.num, fontSize: 14, fontWeight: '900', color: colors.campoDark },
    pesoLbl: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.3, color: colors.inkSoft, marginTop: 1, textTransform: 'uppercase' },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
    chip: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
    chipText: { color: colors.white, fontSize: 11, fontWeight: '800' },
    chipNeutro: { backgroundColor: colors.campoSoft },
    chipTextDark: { color: colors.campoDark, fontSize: 11, fontWeight: '800' },

    lineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
    lineLabel: { fontSize: 12, fontWeight: '800', color: colors.inkFaint, marginRight: 6 },
    lineValue: { fontSize: 12.5, fontWeight: '700', color: colors.ink, flexShrink: 1 },
    lineMuted: { fontSize: 12.5, color: colors.inkFaint, fontStyle: 'italic' },

    observaciones: { fontSize: 12, color: colors.inkSoft, marginTop: 10, fontStyle: 'italic' },

    cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: 14 },
    actBtn: { backgroundColor: colors.campoSoft, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 9, flexGrow: 1, alignItems: 'center', minWidth: '30%' },
    actBtnText: { color: colors.campoDark, fontWeight: '800', fontSize: 12 },
    actBtnPrimary: { backgroundColor: colors.campo },
    actBtnTextPrimary: { color: colors.white },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,30,20,0.55)', justifyContent: 'flex-end' },
    modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
    modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.xl, maxHeight: '85%' },
    modalTitle: { ...type.h2, color: colors.ink, marginBottom: 4, flexShrink: 1 },
    modalSub: { fontSize: 12.5, color: colors.inkSoft, fontWeight: '600', marginBottom: 10 },
    label: { ...type.label, color: colors.inkSoft, marginBottom: 6, marginTop: 12 },
    hint: { fontSize: 10.5, color: colors.inkFaint, marginTop: 4 },
    input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 11, fontSize: 14, color: colors.ink, backgroundColor: colors.surface },
    inputMulti: { height: 70, textAlignVertical: 'top' },
    optionRow: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
    optionBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: colors.surface },
    optionBtnActive: { backgroundColor: colors.campo, borderColor: colors.campo },
    optionBtnText: { fontSize: 13, color: colors.inkSoft, fontWeight: '600' },
    optionBtnTextActive: { color: colors.white, fontWeight: '800' },
    modalActions: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
    btnCancelar: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 13, alignItems: 'center' },
    btnCancelarText: { color: colors.inkSoft, fontWeight: '700' },
    btnGuardar: { flex: 1, backgroundColor: colors.campo, borderRadius: radius.md, padding: 13, alignItems: 'center' },
    btnGuardarText: { color: colors.white, fontWeight: '800' },

    histHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    histClose: { fontSize: 20, color: colors.inkSoft, fontWeight: '800', paddingHorizontal: 6 },
    histStats: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 16 },
    histStat: { flex: 1, backgroundColor: colors.campoSoft, borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center' },
    histStatLabel: { fontSize: 9.5, fontWeight: '800', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.3 },
    histStatVal: { ...type.num, fontSize: 16, fontWeight: '900', marginTop: 2 },
    histSubtitle: { ...type.title, color: colors.ink, marginBottom: 8 },
    histRowHead: { flexDirection: 'row', backgroundColor: colors.campoSoft, borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm },
    histRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line },
    histRowAlt: { backgroundColor: '#F6F8F5' },
    histCell: { flex: 1, fontSize: 12, color: colors.ink, paddingVertical: 8, paddingHorizontal: 6 },
    histCellHead: { fontWeight: '800', color: colors.campoDark, fontSize: 11 },
    histEmpty: { textAlign: 'center', color: colors.inkFaint, paddingVertical: 16, fontSize: 13 },

    fab: { position: 'absolute', bottom: 22, right: 18, backgroundColor: colors.campo, borderRadius: radius.pill, paddingHorizontal: 22, paddingVertical: 14, ...shadow.float },
    fabText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});

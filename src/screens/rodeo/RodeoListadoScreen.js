import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator, RefreshControl, Modal, TextInput, ScrollView, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { colors, shadow, radius, space } from '../../theme';

const TIPOS = [
    { value: 'cria', label: '🍼 Cría', color: '#22c55e' },
    { value: 'destete', label: '🐄 Destete', color: '#3b82f6' },
    { value: 'engorde', label: '🥩 Engorde', color: '#f97316' },
    { value: 'reproduccion', label: '💕 Reproducción', color: '#a855f7' },
    // El backend crea rodeos tipo 'tambo' solo al mover una vaca que parió.
    { value: 'tambo', label: '🥛 Tambo', color: '#0E7490' },
    { value: 'otro', label: '📋 Otro', color: colors.neutro },
];

const tipoInfo = (t) => TIPOS.find(x => x.value === t) || TIPOS[TIPOS.length - 1];

export default function RodeoListadoScreen() {
    const navigation = useNavigation();
    const { userPayload, establecimientoActual } = useSelector(state => state.auth);
    const {
        obtenerRodeosHook, crearRodeoHook, actualizarRodeoHook, toggleEstadoRodeoHook,
        obtenerEstadisticasRodeoHook, obtenerTerneroHook, obtenerMadreHook,
        crearDietaHook, obtenerDietasRodeoHook, eliminarDietaHook,
    } = useBussinesMicroservicio();

    const [rodeos, setRodeos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modal, setModal] = useState({ open: false, mode: 'crear', rodeo: null });
    const [formData, setFormData] = useState({ nombre: '', descripcion: '', tipo: 'cria' });
    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', success: false });

    // Detalle del rodeo (resumen + animales que están hoy adentro)
    const [detalle, setDetalle] = useState({ open: false, rodeo: null });
    const [stats, setStats] = useState(null);
    const [detalleTerneros, setDetalleTerneros] = useState([]);
    const [detalleMadres, setDetalleMadres] = useState([]);
    const [tabDetalle, setTabDetalle] = useState('terneros');
    const [loadingDetalle, setLoadingDetalle] = useState(false);

    // Dietas del rodeo
    const [dietasModal, setDietasModal] = useState({ open: false, rodeo: null });
    const [dietas, setDietas] = useState([]);
    const [loadingDietas, setLoadingDietas] = useState(false);
    const [guardandoDieta, setGuardandoDieta] = useState(false);
    const [dietaForm, setDietaForm] = useState({
        modo: 'nota', nombre: '', nota: '', kg_por_animal: '',
        ingredientes: [{ nombre: '', kg: '' }],
    });

    const showAlert = (message, success = true) => {
        setAlert({ show: true, message, success });
        setTimeout(() => setAlert({ show: false, message: '', success: false }), 4000);
    };

    const idEst = userPayload?.id_establecimiento || establecimientoActual;

    const cargarRodeos = useCallback(async () => {
        setLoading(true);
        try {
            let q = '';
            if (userPayload?.rol === 'admin' && establecimientoActual) q = `id_establecimiento=${establecimientoActual}`;
            const res = await obtenerRodeosHook(q);
            let lista = res?.data || [];
            if (!Array.isArray(lista)) lista = lista?.data || [];
            setRodeos(lista);
        } catch {
            showAlert('Error al cargar rodeos', false);
        } finally {
            setLoading(false);
        }
    }, [establecimientoActual, userPayload]);

    useEffect(() => { cargarRodeos(); }, [establecimientoActual]);

    const onRefresh = async () => { setRefreshing(true); await cargarRodeos(); setRefreshing(false); };

    const abrirCrear = () => {
        setFormData({ nombre: '', descripcion: '', tipo: 'cria' });
        setModal({ open: true, mode: 'crear', rodeo: null });
    };

    const abrirEditar = (rodeo) => {
        setFormData({ nombre: rodeo.nombre || '', descripcion: rodeo.descripcion || '', tipo: rodeo.tipo || 'cria' });
        setModal({ open: true, mode: 'editar', rodeo });
    };

    const guardar = async () => {
        if (!formData.nombre.trim()) { showAlert('Ingresá un nombre', false); return; }
        setSaving(true);
        const payload = { ...formData, estado: 'activo' };
        if (idEst) payload.id_establecimiento = parseInt(idEst);
        let res;
        if (modal.mode === 'crear') res = await crearRodeoHook(payload);
        else res = await actualizarRodeoHook(modal.rodeo.id_rodeo, payload);
        if (res?.status === 200 || res?.status === 201) {
            showAlert(modal.mode === 'crear' ? 'Rodeo creado' : 'Rodeo actualizado');
            setModal({ open: false, mode: 'crear', rodeo: null });
            await cargarRodeos();
        } else {
            showAlert('Error al guardar', false);
        }
        setSaving(false);
    };

    const toggleEstado = async (rodeo) => {
        const res = await toggleEstadoRodeoHook(rodeo.id_rodeo);
        if (res?.status === 200 || res?.status === 201) {
            await cargarRodeos();
        } else {
            showAlert('Error al cambiar estado', false);
        }
    };

    // ===== DETALLE: resumen + animales del rodeo =====
    const qpBase = () => (userPayload?.rol === 'admin' && establecimientoActual ? `id_establecimiento=${establecimientoActual}&` : '');

    const abrirDetalle = async (rodeo) => {
        setDetalle({ open: true, rodeo });
        setTabDetalle('terneros');
        setStats(null);
        setDetalleTerneros([]);
        setDetalleMadres([]);
        setLoadingDetalle(true);
        try {
            const [resStats, resT, resM] = await Promise.all([
                obtenerEstadisticasRodeoHook(rodeo.id_rodeo),
                obtenerTerneroHook(`${qpBase()}id_rodeo=${rodeo.id_rodeo}&limit=500`),
                obtenerMadreHook(`${qpBase()}id_rodeo=${rodeo.id_rodeo}&limit=500`),
            ]);
            if (resStats?.status === 200) setStats(resStats.data);
            setDetalleTerneros(resT?.data?.data || []);
            setDetalleMadres(resM?.data?.data || []);
        } catch {
            showAlert('Error al cargar el detalle del rodeo', false);
        } finally {
            setLoadingDetalle(false);
        }
    };

    // ===== DIETAS =====
    const abrirDietas = async (rodeo) => {
        setDietasModal({ open: true, rodeo });
        setDietaForm({ modo: 'nota', nombre: '', nota: '', kg_por_animal: '', ingredientes: [{ nombre: '', kg: '' }] });
        await cargarDietas(rodeo.id_rodeo);
    };

    const cargarDietas = async (idRodeo) => {
        setLoadingDietas(true);
        const res = await obtenerDietasRodeoHook(idRodeo);
        setDietas(res?.status === 200 ? (res.data || []) : []);
        setLoadingDietas(false);
    };

    const totalMezcla = (dietaForm.ingredientes || []).reduce((acc, i) => acc + (parseFloat(i.kg) || 0), 0);

    const agregarIngrediente = () => setDietaForm(f => ({ ...f, ingredientes: [...(f.ingredientes || []), { nombre: '', kg: '' }] }));

    const quitarIngrediente = (idx) => setDietaForm(f => {
        const next = (f.ingredientes || []).filter((_, i) => i !== idx);
        return { ...f, ingredientes: next.length ? next : [{ nombre: '', kg: '' }] };
    });

    const cambiarIngrediente = (idx, campo, valor) => setDietaForm(f => {
        const next = [...(f.ingredientes || [])];
        next[idx] = { ...next[idx], [campo]: valor };
        return { ...f, ingredientes: next };
    });

    const guardarDieta = async () => {
        const rodeo = dietasModal.rodeo;
        if (!rodeo) return;
        const payload = {
            id_rodeo: rodeo.id_rodeo,
            modo: dietaForm.modo,
            nombre: dietaForm.nombre || undefined,
        };
        if (dietaForm.modo === 'nota') {
            if (!dietaForm.nota.trim()) { showAlert('Escribí la dieta', false); return; }
            payload.nota = dietaForm.nota;
        } else if (dietaForm.modo === 'formula') {
            const kg = parseFloat(dietaForm.kg_por_animal) || 0;
            if (kg <= 0) { showAlert('Poné los kg por animal', false); return; }
            payload.kg_por_animal = kg;
        } else {
            const ingredientes = (dietaForm.ingredientes || [])
                .filter(i => i.nombre.trim() && parseFloat(i.kg) > 0)
                .map(i => ({ nombre: i.nombre.trim(), kg: parseFloat(i.kg) }));
            if (ingredientes.length === 0) { showAlert('Agregá al menos un ingrediente con kg', false); return; }
            payload.ingredientes = ingredientes;
        }

        setGuardandoDieta(true);
        const res = await crearDietaHook(payload);
        if (res?.status === 200 || res?.status === 201) {
            setDietaForm(f => ({ modo: f.modo, nombre: '', nota: '', kg_por_animal: '', ingredientes: [{ nombre: '', kg: '' }] }));
            showAlert('Dieta guardada');
            await cargarDietas(rodeo.id_rodeo);
        } else {
            showAlert(res?.data?.message || 'No se pudo guardar la dieta', false);
        }
        setGuardandoDieta(false);
    };

    const borrarDieta = (dieta) => {
        Alert.alert('Eliminar dieta', dieta.nombre || 'Se borra esta dieta del rodeo.', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar', style: 'destructive', onPress: async () => {
                    const res = await eliminarDietaHook(dieta.id_dieta);
                    if (res?.status === 200) await cargarDietas(dietasModal.rodeo.id_rodeo);
                    else showAlert('No se pudo eliminar la dieta', false);
                },
            },
        ]);
    };

    const renderRodeo = ({ item }) => {
        const ti = tipoInfo(item.tipo);
        const activo = item.estado === 'activo';
        return (
            <View style={[styles.card, !activo && styles.cardInactivo]}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.nombre}</Text>
                    <View style={[styles.badge, { backgroundColor: ti.color }]}>
                        <Text style={styles.badgeText}>{ti.label}</Text>
                    </View>
                </View>
                {item.descripcion ? <Text style={styles.descripcion} numberOfLines={2}>{item.descripcion}</Text> : null}
                <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Terneros:</Text>
                    <Text style={styles.cardValue}>{item.cantidad_terneros ?? 0}</Text>
                    <Text style={styles.cardLabel}>  Estado:</Text>
                    <Text style={[styles.cardValue, { color: activo ? colors.vivo : colors.muerto, fontWeight: '700' }]}>{activo ? 'Activo' : 'Inactivo'}</Text>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.btnAccion} onPress={() => abrirDetalle(item)}>
                        <Text style={styles.btnAccionText}>👁️ Ver</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnAccion} onPress={() => navigation.navigate('RodeoAsignar', { rodeo: item })}>
                        <Text style={styles.btnAccionText}>🐄 Animales</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnAccion} onPress={() => abrirDietas(item)}>
                        <Text style={styles.btnAccionText}>🍽️ Dietas</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnAccion} onPress={() => abrirEditar(item)}>
                        <Text style={styles.btnAccionText}>✏️ Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btnAccion, activo ? styles.btnDanger : styles.btnSuccess]} onPress={() => toggleEstado(item)}>
                        <Text style={[styles.btnAccionText, { color: '#fff' }]}>{activo ? 'Desactivar' : 'Activar'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🌾 Rodeos</Text>
                <Text style={styles.headerSub}>{rodeos.length} rodeos</Text>
            </View>

            {alert.show && (
                <View style={[styles.alert, alert.success ? styles.alertSuccess : styles.alertError]}>
                    <Text style={styles.alertText}>{alert.message}</Text>
                </View>
            )}

            {loading ? <ActivityIndicator size="large" color={colors.campo} style={styles.loader} /> : (
                <FlatList
                    data={rodeos}
                    keyExtractor={item => String(item.id_rodeo)}
                    renderItem={renderRodeo}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={<Text style={styles.empty}>Sin rodeos</Text>}
                    contentContainerStyle={styles.list}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={abrirCrear}>
                <Text style={styles.fabText}>+ Nuevo</Text>
            </TouchableOpacity>

            <Modal visible={modal.open} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>{modal.mode === 'crear' ? 'Nuevo rodeo' : 'Editar rodeo'}</Text>

                        <Text style={styles.label}>Nombre</Text>
                        <TextInput style={styles.input} value={formData.nombre} onChangeText={v => setFormData(f => ({ ...f, nombre: v }))} placeholder="Nombre del rodeo" />

                        <Text style={styles.label}>Descripción</Text>
                        <TextInput style={[styles.input, styles.inputMulti]} value={formData.descripcion} onChangeText={v => setFormData(f => ({ ...f, descripcion: v }))} placeholder="Descripción" multiline numberOfLines={2} />

                        <Text style={styles.label}>Tipo</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                            {TIPOS.map(t => (
                                <TouchableOpacity key={t.value} style={[styles.tipoBtn, formData.tipo === t.value && { backgroundColor: t.color, borderColor: t.color }]} onPress={() => setFormData(f => ({ ...f, tipo: t.value }))}>
                                    <Text style={[styles.tipoBtnText, formData.tipo === t.value && { color: '#fff', fontWeight: '700' }]}>{t.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.btnCancelar} onPress={() => setModal({ open: false, mode: 'crear', rodeo: null })}>
                                <Text style={styles.btnCancelarText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnGuardar} onPress={guardar} disabled={saving}>
                                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnGuardarText}>Guardar</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* DETALLE: resumen + animales del rodeo */}
            <Modal visible={detalle.open} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>🌾 {detalle.rodeo?.nombre}</Text>

                        {loadingDetalle ? <ActivityIndicator color={colors.campo} style={{ marginVertical: 20 }} /> : (
                            <ScrollView>
                                {stats?.estadisticas && (
                                    <View style={styles.statsRow}>
                                        <StatTile label="Terneros" valor={stats.estadisticas.totalTerneros} />
                                        <StatTile label="Vivos" valor={stats.estadisticas.ternerosVivos} color={colors.vivo} />
                                        <StatTile label="Muertos" valor={stats.estadisticas.ternerosMuertos} color={colors.muerto} />
                                        <StatTile label="Mortalidad" valor={`${stats.estadisticas.porcentajeMortalidad}%`} />
                                        <StatTile label="Peso prom." valor={`${stats.estadisticas.pesoPromedio} kg`} />
                                        <StatTile label="DEL prom." valor={stats.estadisticas.promedioDiasEnLeche ?? '—'} />
                                    </View>
                                )}

                                <View style={styles.tabs}>
                                    <TouchableOpacity
                                        style={[styles.tab, tabDetalle === 'terneros' && styles.tabActive]}
                                        onPress={() => setTabDetalle('terneros')}
                                    >
                                        <Text style={[styles.tabText, tabDetalle === 'terneros' && styles.tabTextActive]}>🐮 Terneros ({detalleTerneros.length})</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.tab, tabDetalle === 'madres' && styles.tabActive]}
                                        onPress={() => setTabDetalle('madres')}
                                    >
                                        <Text style={[styles.tabText, tabDetalle === 'madres' && styles.tabTextActive]}>🐄 Madres ({detalleMadres.length})</Text>
                                    </TouchableOpacity>
                                </View>

                                {tabDetalle === 'terneros' ? (
                                    detalleTerneros.length === 0 ? <Text style={styles.emptyModal}>No hay terneros en este rodeo</Text> : (
                                        <View style={styles.chipsWrap}>
                                            {detalleTerneros.map(t => (
                                                <View key={t.id_ternero} style={styles.animalChip}>
                                                    <Text style={styles.animalRp}>RP {t.rp_ternero ?? t.id_ternero}</Text>
                                                    <Text style={styles.animalMeta}>{t.sexo || '—'} · {t.estado || '—'}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )
                                ) : (
                                    detalleMadres.length === 0 ? <Text style={styles.emptyModal}>No hay madres en este rodeo</Text> : (
                                        <View style={styles.chipsWrap}>
                                            {detalleMadres.map(m => (
                                                <View key={m.id_madre} style={styles.animalChip}>
                                                    <Text style={styles.animalRp}>RP {m.rp_madre ?? m.id_madre}</Text>
                                                    <Text style={styles.animalMeta}>
                                                        {m.estado || '—'}{m.dias_en_leche != null ? ` · ${m.dias_en_leche} DEL` : ''}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    )
                                )}
                            </ScrollView>
                        )}

                        <TouchableOpacity style={styles.btnCerrar} onPress={() => setDetalle({ open: false, rodeo: null })}>
                            <Text style={styles.btnCerrarText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* DIETAS del rodeo */}
            <Modal visible={dietasModal.open} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>🍽️ Dietas — {dietasModal.rodeo?.nombre}</Text>

                        <ScrollView keyboardShouldPersistTaps="handled">
                            <Text style={styles.label}>Modo</Text>
                            <View style={styles.modoRow}>
                                {[
                                    { v: 'nota', l: '📝 Nota' },
                                    { v: 'formula', l: '📐 Fórmula' },
                                    { v: 'mezcla', l: '🧪 Mezcla' },
                                ].map(m => (
                                    <TouchableOpacity
                                        key={m.v}
                                        style={[styles.modoBtn, dietaForm.modo === m.v && styles.modoBtnActive]}
                                        onPress={() => setDietaForm(f => ({ ...f, modo: m.v }))}
                                    >
                                        <Text style={[styles.modoBtnText, dietaForm.modo === m.v && styles.modoBtnTextActive]}>{m.l}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Nombre (opcional)</Text>
                            <TextInput style={styles.input} value={dietaForm.nombre} onChangeText={v => setDietaForm(f => ({ ...f, nombre: v }))} placeholder="Ej: Ración de la mañana" />

                            {dietaForm.modo === 'nota' && (
                                <>
                                    <Text style={styles.label}>Dieta</Text>
                                    <TextInput
                                        style={[styles.input, styles.inputMulti]}
                                        value={dietaForm.nota}
                                        onChangeText={v => setDietaForm(f => ({ ...f, nota: v }))}
                                        placeholder="Ej: 3kg de balanceado + heno a voluntad"
                                        multiline
                                    />
                                </>
                            )}

                            {dietaForm.modo === 'formula' && (
                                <>
                                    <Text style={styles.label}>Kg por animal</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={dietaForm.kg_por_animal}
                                        onChangeText={v => setDietaForm(f => ({ ...f, kg_por_animal: v }))}
                                        placeholder="Ej: 3.5"
                                        keyboardType="decimal-pad"
                                    />
                                    <Text style={styles.hint}>El total del rodeo se calcula automático según la cantidad de animales.</Text>
                                </>
                            )}

                            {dietaForm.modo === 'mezcla' && (
                                <>
                                    <Text style={styles.label}>Ingredientes (kg totales de la mezcla)</Text>
                                    {(dietaForm.ingredientes || []).map((ing, idx) => (
                                        <View key={idx} style={styles.ingRow}>
                                            <TextInput
                                                style={[styles.input, { flex: 1 }]}
                                                value={ing.nombre}
                                                onChangeText={v => cambiarIngrediente(idx, 'nombre', v)}
                                                placeholder="Ej: Silo de maíz"
                                            />
                                            <TextInput
                                                style={[styles.input, { width: 76 }]}
                                                value={ing.kg}
                                                onChangeText={v => cambiarIngrediente(idx, 'kg', v)}
                                                placeholder="kg"
                                                keyboardType="decimal-pad"
                                            />
                                            <TouchableOpacity onPress={() => quitarIngrediente(idx)} style={styles.ingQuitar}>
                                                <Text style={styles.ingQuitarText}>×</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    <TouchableOpacity onPress={agregarIngrediente}>
                                        <Text style={styles.addIng}>➕ Agregar ingrediente</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.totalMezcla}>Total mezcla: {Math.round(totalMezcla * 100) / 100} kg</Text>
                                </>
                            )}

                            <TouchableOpacity style={styles.btnGuardarFull} onPress={guardarDieta} disabled={guardandoDieta}>
                                {guardandoDieta ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnGuardarText}>➕ Agregar dieta</Text>}
                            </TouchableOpacity>

                            <View style={styles.divider} />

                            {loadingDietas ? (
                                <ActivityIndicator color={colors.campo} style={{ marginVertical: 16 }} />
                            ) : dietas.length === 0 ? (
                                <Text style={styles.emptyModal}>Sin dietas cargadas para este rodeo.</Text>
                            ) : dietas.map(d => (
                                <View key={d.id_dieta} style={styles.dietaCard}>
                                    <View style={{ flex: 1 }}>
                                        {d.nombre ? <Text style={styles.dietaNombre}>{d.nombre}</Text> : null}
                                        {d.modo === 'nota' ? <Text style={styles.dietaDetalle}>{d.nota}</Text> : null}
                                        {d.modo === 'formula' ? (
                                            <Text style={styles.dietaDetalle}>
                                                {d.kg_por_animal} kg/animal × {d.cantidad_animales} animales = <Text style={styles.dietaFuerte}>{d.total_rodeo} kg</Text>
                                            </Text>
                                        ) : null}
                                        {d.modo === 'mezcla' ? (
                                            <>
                                                {(d.ingredientes || []).map((ing, i) => (
                                                    <Text key={i} style={styles.dietaDetalle}>• {ing.nombre}: {ing.kg} kg</Text>
                                                ))}
                                                <Text style={styles.dietaDetalle}>
                                                    Total: <Text style={styles.dietaFuerte}>{d.total_rodeo} kg</Text>
                                                    {d.kg_por_animal != null ? ` (≈ ${d.kg_por_animal} kg/animal · ${d.cantidad_animales} animales)` : ''}
                                                </Text>
                                            </>
                                        ) : null}
                                    </View>
                                    <TouchableOpacity onPress={() => borrarDieta(d)}>
                                        <Text style={styles.btnBorrarText}>🗑️</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>

                        <TouchableOpacity style={styles.btnCerrar} onPress={() => setDietasModal({ open: false, rodeo: null })}>
                            <Text style={styles.btnCerrarText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const StatTile = ({ label, valor, color }) => (
    <View style={styles.statTile}>
        <Text style={[styles.statValor, color && { color }]}>{valor}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { backgroundColor: colors.campoDark, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.white },
    headerSub: { fontSize: 13, color: colors.campoSoft },
    alert: { margin: space.md, borderRadius: radius.sm, padding: 10 },
    alertSuccess: { backgroundColor: colors.vivo },
    alertError: { backgroundColor: colors.muerto },
    alertText: { color: colors.white, fontWeight: '600', textAlign: 'center' },
    loader: { marginTop: 40 },
    list: { paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: 96 },
    empty: { textAlign: 'center', color: colors.inkFaint, marginTop: 40, fontSize: 15 },
    card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 10, ...shadow.card },
    cardInactivo: { opacity: 0.5 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, flex: 1 },
    badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
    badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
    descripcion: { fontSize: 12, color: colors.inkSoft, marginBottom: 6, fontStyle: 'italic' },
    cardRow: { flexDirection: 'row', marginBottom: 8, flexWrap: 'wrap' },
    cardLabel: { fontSize: 12, color: colors.inkSoft, fontWeight: '600' },
    cardValue: { fontSize: 12, color: colors.ink, marginLeft: 4 },
    actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    btnAccion: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.bg },
    btnAccionText: { fontSize: 12, color: colors.ink, fontWeight: '600' },
    btnDanger: { backgroundColor: colors.muerto, borderColor: colors.muerto },
    btnSuccess: { backgroundColor: colors.vivo, borderColor: colors.vivo },
    fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: colors.campo, borderRadius: 30, paddingHorizontal: 20, paddingVertical: 12, ...shadow.float },
    fabText: { color: colors.white, fontWeight: '700', fontSize: 15 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.xl, maxHeight: '85%' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6, marginTop: 10 },
    input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 10, fontSize: 14, color: colors.ink },
    inputMulti: { height: 60, textAlignVertical: 'top' },
    tipoBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: colors.surface },
    tipoBtnText: { fontSize: 13, color: colors.ink },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    btnCancelar: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
    btnCancelarText: { color: colors.ink, fontWeight: '600' },
    btnGuardar: { flex: 1, backgroundColor: colors.campo, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
    btnGuardarText: { color: colors.white, fontWeight: '700' },
    btnGuardarFull: { backgroundColor: colors.campo, borderRadius: radius.sm, padding: 13, alignItems: 'center', marginTop: 16 },
    btnCerrar: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 12, alignItems: 'center', marginTop: 14 },
    btnCerrarText: { color: colors.ink, fontWeight: '600' },
    hint: { fontSize: 11, color: colors.inkFaint, marginTop: 4 },
    divider: { height: 1, backgroundColor: colors.line, marginVertical: 16 },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    statTile: { flexGrow: 1, minWidth: '30%', backgroundColor: colors.bg, borderRadius: radius.sm, padding: 10, alignItems: 'center' },
    statValor: { fontSize: 17, fontWeight: '800', color: colors.ink },
    statLabel: { fontSize: 10, color: colors.inkSoft, marginTop: 2 },
    tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    tab: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 8, alignItems: 'center' },
    tabActive: { backgroundColor: colors.campo, borderColor: colors.campo },
    tabText: { fontSize: 12, color: colors.ink, fontWeight: '600' },
    tabTextActive: { color: colors.white, fontWeight: '800' },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    animalChip: { backgroundColor: colors.bg, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
    animalRp: { fontSize: 13, fontWeight: '800', color: colors.ink },
    animalMeta: { fontSize: 10, color: colors.inkSoft },
    emptyModal: { textAlign: 'center', color: colors.inkFaint, fontSize: 13, paddingVertical: 14 },
    modoRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
    modoBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
    modoBtnActive: { backgroundColor: colors.caravana, borderColor: colors.caravana },
    modoBtnText: { fontSize: 13, color: colors.ink },
    modoBtnTextActive: { color: colors.caravanaInk, fontWeight: '800' },
    ingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    ingQuitar: { paddingHorizontal: 6 },
    ingQuitarText: { fontSize: 22, color: colors.muerto, lineHeight: 24 },
    addIng: { color: colors.campo, fontWeight: '700', fontSize: 13, marginTop: 10 },
    totalMezcla: { fontSize: 13, fontWeight: '800', color: colors.ink, marginTop: 10 },
    dietaCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 10, marginBottom: 8 },
    dietaNombre: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 2 },
    dietaDetalle: { fontSize: 12, color: colors.inkSoft },
    dietaFuerte: { fontWeight: '800', color: colors.campo },
    btnBorrarText: { fontSize: 16 },
});

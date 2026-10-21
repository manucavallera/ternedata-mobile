import { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { colors, shadow, radius, space } from '../../theme';
import { esAdminDelCampo } from '../../utils/roles';
import { confirmar } from '../../utils/confirmar';

const UNIDADES = ['kg', 'bolsa', 'fardo', 'rollo', 'tonelada', 'unidad'];
const FORM_INICIAL = { nombre: '', unidad_venta: 'kg', precio: '', costo: '', stock_minimo: '' };

// El backend devuelve cantidades como texto con 3 decimales ("5.000"): en es-AR se leería cinco mil
const cantidad = (n) => (Number(n) || 0).toLocaleString('es-AR', { maximumFractionDigits: 3 });
const money = (n) => '$ ' + (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Mismo contrato que crearMovimientoStock de la web
const crearMovimientoStock = (tipo, cantidad, motivo) => ({
    tipo,
    cantidad: Number(cantidad),
    ...(motivo?.trim() ? { motivo: motivo.trim() } : {}),
});

export default function ForrajeriaScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { establecimientoActual, userPayload } = useSelector(state => state.auth);
    const {
        obtenerProductosForrajeriaHook, crearProductoForrajeriaHook,
        obtenerBajoStockForrajeriaHook, registrarMovimientoStockHook,
        actualizarProductoForrajeriaHook, cargarCatalogoBaseForrajeriaHook,
        obtenerEstablecimientosHook,
    } = useBussinesMicroservicio();

    const [productos, setProductos] = useState([]);
    const [bajoStock, setBajoStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [form, setForm] = useState(FORM_INICIAL);
    const [saving, setSaving] = useState(false);
    const [movimiento, setMovimiento] = useState({});
    const [alert, setAlert] = useState({ show: false, message: '', success: false });
    // Precios, altas, bajas y salidas de stock: solo el dueño (el backend también lo exige).
    const [esDueno, setEsDueno] = useState(false);
    const [edicion, setEdicion] = useState(null); // { id, precio, costo, stock_minimo }
    const [verInactivos, setVerInactivos] = useState(false);

    const alertTimer = useRef(null);
    const showAlert = (message, success = true) => {
        setAlert({ show: true, message, success });
        // Un aviso nuevo reinicia el contador: si no, el timer del anterior lo borra antes de tiempo
        clearTimeout(alertTimer.current);
        alertTimer.current = setTimeout(() => setAlert({ show: false, message: '', success: false }), 4000);
    };

    const cargar = useCallback(async () => {
        const [resProductos, resStock, resCampos] = await Promise.all([
            obtenerProductosForrajeriaHook(),
            obtenerBajoStockForrajeriaHook(),
            obtenerEstablecimientosHook(),
        ]);
        if (resProductos?.status === 200) setProductos(resProductos.data || []);
        else showAlert(resProductos?.data?.message || 'No se pudo cargar la forrajería', false);
        if (resStock?.status === 200) setBajoStock(resStock.data || []);
        const campos = resCampos?.status === 200 ? resCampos.data : [];
        setEsDueno(esAdminDelCampo(userPayload, establecimientoActual ?? userPayload?.id_establecimiento, campos));
        setLoading(false);
    }, [establecimientoActual, userPayload]);

    const mensajeError = (res, porDefecto) => {
        const msg = res?.data?.message;
        return (Array.isArray(msg) ? msg.join(', ') : msg) || porDefecto;
    };

    const cargarCatalogoBase = () => {
        confirmar(
            'Cargar catálogo base',
            'Se agregan los productos típicos de una forrajería (fardos, granos, balanceados, etc.) con precio y stock en 0. No se duplica lo que ya tenés.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Cargar',
                    onPress: async () => {
                        const res = await cargarCatalogoBaseForrajeriaHook();
                        if (res?.status === 200 || res?.status === 201) {
                            showAlert(res.data?.productos ? `Se agregaron ${res.data.productos} productos. Completá los precios.` : 'Ya tenías todo el catálogo base.');
                            await cargar();
                        } else showAlert(mensajeError(res, 'No se pudo cargar el catálogo base'), false);
                    },
                },
            ],
        );
    };

    const guardarEdicion = async () => {
        const valores = ['precio', 'costo', 'stock_minimo'].map(k => Number(edicion[k]));
        if (valores.some(v => Number.isNaN(v) || v < 0)) { showAlert('Revisá los números: no pueden ser negativos', false); return; }
        const res = await actualizarProductoForrajeriaHook(edicion.id, {
            precio: valores[0], costo: valores[1], stock_minimo: valores[2],
        });
        if (res?.status === 200) {
            showAlert('Producto actualizado');
            setEdicion(null);
            await cargar();
        } else showAlert(mensajeError(res, 'No se pudo actualizar el producto'), false);
    };

    // Dar de baja no borra: los pedidos viejos lo siguen mostrando y se puede reactivar.
    const cambiarEstado = (producto) => {
        const nuevo = producto.estado === 'inactivo' ? 'activo' : 'inactivo';
        const aplicar = async () => {
            const res = await actualizarProductoForrajeriaHook(producto.id_producto, { estado: nuevo });
            if (res?.status === 200) {
                showAlert(nuevo === 'inactivo' ? `${producto.nombre} dado de baja` : `${producto.nombre} reactivado`);
                await cargar();
            } else showAlert(mensajeError(res, 'No se pudo cambiar el estado'), false);
        };
        if (nuevo === 'activo') { aplicar(); return; }
        confirmar('Dar de baja', `¿Dar de baja "${producto.nombre}"? No se podrá vender hasta reactivarlo.`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Dar de baja', style: 'destructive', onPress: aplicar },
        ]);
    };

    useEffect(() => { setLoading(true); cargar(); }, [cargar]);

    const onRefresh = async () => { setRefreshing(true); await cargar(); setRefreshing(false); };

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const guardarProducto = async () => {
        if (!form.nombre.trim()) { showAlert('Ingresá el nombre del producto', false); return; }
        if (form.precio === '' || Number(form.precio) < 0) { showAlert('Ingresá un precio válido', false); return; }
        setSaving(true);
        const res = await crearProductoForrajeriaHook({
            ...form,
            nombre: form.nombre.trim(),
            precio: Number(form.precio),
            costo: form.costo === '' ? undefined : Number(form.costo),
            stock_minimo: form.stock_minimo === '' ? undefined : Number(form.stock_minimo),
        });
        if (res?.status === 200 || res?.status === 201) {
            showAlert('Producto guardado');
            setForm(FORM_INICIAL);
            setMostrarForm(false);
            await cargar();
        } else {
            const msg = res?.data?.message;
            showAlert((Array.isArray(msg) ? msg.join(', ') : msg) || 'No se pudo guardar el producto', false);
        }
        setSaving(false);
    };

    const setMov = (id, cambios) => setMovimiento(m => ({ ...m, [id]: { ...(m[id] || {}), ...cambios } }));

    const registrarMovimiento = async (producto) => {
        const datos = movimiento[producto.id_producto] || {};
        if (!datos.cantidad || Number(datos.cantidad) <= 0) { showAlert('Indicá una cantidad mayor a cero', false); return; }
        const res = await registrarMovimientoStockHook(
            producto.id_producto,
            crearMovimientoStock(datos.tipo || 'entrada', datos.cantidad, datos.motivo),
        );
        if (res?.status === 200 || res?.status === 201) {
            showAlert(`Stock actualizado: ${producto.nombre}`);
            setMovimiento(m => ({ ...m, [producto.id_producto]: {} }));
            await cargar();
        } else {
            showAlert(res?.data?.message || 'No se pudo actualizar el stock', false);
        }
    };

    const renderProducto = (producto) => {
        const datos = movimiento[producto.id_producto] || {};
        const tipo = datos.tipo || 'entrada';
        // Sin mínimo cargado no hay aviso (igual que el backend).
        const bajo = Number(producto.stock_minimo) > 0 && Number(producto.stock_actual) <= Number(producto.stock_minimo);
        const inactivo = producto.estado === 'inactivo';
        const editando = edicion?.id === producto.id_producto;
        const campoEdicion = (clave, etiqueta) => (
            <View style={styles.col}>
                <Text style={styles.label}>{etiqueta}</Text>
                <TextInput
                    style={styles.input}
                    value={String(edicion[clave] ?? '')}
                    onChangeText={v => setEdicion(e => ({ ...e, [clave]: v }))}
                    placeholder={etiqueta}
                    keyboardType="decimal-pad"
                />
            </View>
        );
        return (
            <View key={producto.id_producto} style={[styles.producto, inactivo && { opacity: 0.5 }]}>
                <View style={styles.productoTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.productoNombre}>{producto.nombre}{inactivo ? '  · de baja' : ''}</Text>
                        <Text style={styles.productoSub}>
                            {money(producto.precio)} / {producto.unidad_venta}
                            {Number(producto.precio) === 0 && <Text style={styles.sinPrecio}>  sin precio</Text>}
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.stock, bajo && { color: colors.vendido }]}>{cantidad(producto.stock_actual)} {producto.unidad_venta}</Text>
                        <Text style={styles.productoSub}>mínimo {cantidad(producto.stock_minimo)}</Text>
                    </View>
                </View>
                {editando && (
                    <View>
                        <View style={styles.row}>
                            {campoEdicion('precio', 'Precio')}
                            {campoEdicion('costo', 'Costo')}
                            {campoEdicion('stock_minimo', 'Stock mín.')}
                        </View>
                        <View style={styles.accionesRow}>
                            <TouchableOpacity style={styles.btnAplicar} onPress={guardarEdicion}>
                                <Text style={styles.btnAplicarText}>Guardar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnSecundario} onPress={() => setEdicion(null)}>
                                <Text style={styles.btnSecundarioText}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                {esDueno && !editando && (
                    <View style={styles.accionesRow}>
                        <TouchableOpacity
                            style={styles.btnSecundario}
                            onPress={() => setEdicion({ id: producto.id_producto, precio: producto.precio, costo: producto.costo ?? 0, stock_minimo: producto.stock_minimo })}
                        >
                            <Text style={styles.btnSecundarioText}>Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnSecundario} onPress={() => cambiarEstado(producto)}>
                            <Text style={styles.btnSecundarioText}>{inactivo ? 'Reactivar' : 'Dar de baja'}</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {!inactivo && <View style={styles.movRow}>
                    {/* Sacar stock es del dueño; el equipo solo registra la mercadería que entra. */}
                    {(esDueno ? [['entrada', 'Entrada'], ['salida', 'Salida']] : [['entrada', 'Entrada']]).map(([val, lbl]) => (
                        <TouchableOpacity key={val} style={[styles.chip, tipo === val && styles.chipActive]} onPress={() => setMov(producto.id_producto, { tipo: val })}>
                            <Text style={[styles.chipText, tipo === val && styles.chipTextActive]}>{lbl}</Text>
                        </TouchableOpacity>
                    ))}
                    <TextInput
                        style={[styles.input, styles.inputCantidad]}
                        value={datos.cantidad || ''}
                        onChangeText={v => setMov(producto.id_producto, { cantidad: v })}
                        placeholder="Cantidad"
                        keyboardType="decimal-pad"
                    />
                    <TouchableOpacity style={styles.btnAplicar} onPress={() => registrarMovimiento(producto)}>
                        <Text style={styles.btnAplicarText}>Aplicar</Text>
                    </TouchableOpacity>
                </View>}
            </View>
        );
    };

    const activos = productos.filter(p => p.estado !== 'inactivo');
    const visibles = verInactivos ? productos : activos;
    const cantidadInactivos = productos.length - activos.length;

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>🌾 Forrajería</Text>
                <Text style={styles.headerSub}>Catálogo y control de stock</Text>
            </View>

            {alert.show && (
                <View style={[styles.alert, alert.success ? styles.alertSuccess : styles.alertError]}>
                    <Text style={styles.alertText}>{alert.message}</Text>
                </View>
            )}

            {loading ? <ActivityIndicator size="large" color={colors.campo} style={{ marginTop: 40 }} /> : (
                <ScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    <View style={styles.tiles}>
                        <View style={styles.tile}>
                            <Text style={styles.tileValue}>{activos.length}</Text>
                            <Text style={styles.tileLabel}>Productos</Text>
                        </View>
                        <View style={styles.tile}>
                            <Text style={[styles.tileValue, { color: colors.vendido }]}>{bajoStock.length}</Text>
                            <Text style={styles.tileLabel}>Bajo stock</Text>
                        </View>
                    </View>

                    {esDueno && <View style={styles.card}>
                        <View style={styles.cardTop}>
                            <TouchableOpacity onPress={() => setMostrarForm(v => !v)}>
                                <Text style={styles.toggle}>{mostrarForm ? '▲ Cancelar' : '+ Agregar producto'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={cargarCatalogoBase}>
                                <Text style={styles.toggle}>Cargar catálogo base</Text>
                            </TouchableOpacity>
                        </View>
                        {mostrarForm && (
                            <View>
                                <Text style={styles.label}>Nombre *</Text>
                                <TextInput style={styles.input} value={form.nombre} onChangeText={v => set('nombre', v)} placeholder="Nombre del producto" />
                                <Text style={styles.label}>Unidad de venta</Text>
                                <View style={styles.chipsWrap}>
                                    {UNIDADES.map(u => (
                                        <TouchableOpacity key={u} style={[styles.chip, form.unidad_venta === u && styles.chipActive]} onPress={() => set('unidad_venta', u)}>
                                            <Text style={[styles.chipText, form.unidad_venta === u && styles.chipTextActive]}>{u}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <View style={styles.row}>
                                    <View style={styles.col}>
                                        <Text style={styles.label}>Precio *</Text>
                                        <TextInput style={styles.input} value={form.precio} onChangeText={v => set('precio', v)} placeholder="Precio" keyboardType="decimal-pad" />
                                    </View>
                                    <View style={styles.col}>
                                        <Text style={styles.label}>Costo</Text>
                                        <TextInput style={styles.input} value={form.costo} onChangeText={v => set('costo', v)} placeholder="Costo" keyboardType="decimal-pad" />
                                    </View>
                                    <View style={styles.col}>
                                        <Text style={styles.label}>Stock mín.</Text>
                                        <TextInput style={styles.input} value={form.stock_minimo} onChangeText={v => set('stock_minimo', v)} placeholder="Stock mínimo" keyboardType="decimal-pad" />
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.btnGuardar} onPress={guardarProducto} disabled={saving}>
                                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnGuardarText}>Guardar producto</Text>}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>}

                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Productos cargados</Text>
                        {cantidadInactivos > 0 && (
                            <TouchableOpacity onPress={() => setVerInactivos(v => !v)}>
                                <Text style={styles.productoSub}>{verInactivos ? 'Ocultar' : 'Mostrar'} dados de baja ({cantidadInactivos})</Text>
                            </TouchableOpacity>
                        )}
                        {visibles.length === 0
                            ? <Text style={styles.empty}>Todavía no hay productos. Empezá cargando el catálogo.</Text>
                            : visibles.map(renderProducto)}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { backgroundColor: colors.campoDark, paddingBottom: 16, paddingHorizontal: 16 },
    backBtn: { color: colors.campoSoft, fontSize: 14, fontWeight: '600', marginBottom: 6 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.white },
    headerSub: { fontSize: 12, color: colors.campoSoft, marginTop: 4 },
    alert: { margin: space.md, borderRadius: radius.sm, padding: 10 },
    alertSuccess: { backgroundColor: colors.vivo },
    alertError: { backgroundColor: colors.muerto },
    alertText: { color: colors.white, fontWeight: '600', textAlign: 'center' },
    content: { padding: space.md, paddingBottom: 96 },
    tiles: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    tile: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, alignItems: 'center', ...shadow.card },
    tileValue: { fontSize: 24, fontWeight: '800', color: colors.ink },
    tileLabel: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
    card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 12, ...shadow.card },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: 6 },
    toggle: { fontSize: 14, fontWeight: '700', color: colors.campo },
    label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6, marginTop: 10 },
    input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 10, fontSize: 14, color: colors.ink, backgroundColor: colors.surface },
    row: { flexDirection: 'row', gap: 8 },
    col: { flex: 1 },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.surface },
    chipActive: { backgroundColor: colors.campo, borderColor: colors.campo },
    chipText: { fontSize: 12, color: colors.ink, fontWeight: '600' },
    chipTextActive: { color: colors.white, fontWeight: '800' },
    btnGuardar: { backgroundColor: colors.campo, borderRadius: radius.sm, padding: 13, alignItems: 'center', marginTop: 16 },
    btnGuardarText: { color: colors.white, fontWeight: '700', fontSize: 15 },
    empty: { color: colors.inkFaint, fontSize: 13, paddingVertical: 10, textAlign: 'center' },
    producto: { borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 12 },
    productoTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    productoNombre: { fontSize: 15, fontWeight: '700', color: colors.ink },
    productoSub: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
    stock: { fontSize: 15, fontWeight: '800', color: colors.ink },
    movRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    // flexBasis 0 + minWidth 0: en web el TextInput tiene ancho intrínseco y desbordaba la fila
    inputCantidad: { flex: 1, flexBasis: 0, minWidth: 0, paddingVertical: 7 },
    btnAplicar: { backgroundColor: colors.campoDark, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 9 },
    btnAplicarText: { color: colors.white, fontWeight: '700', fontSize: 12 },
    btnSecundario: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
    btnSecundarioText: { color: colors.ink, fontWeight: '700', fontSize: 12 },
    accionesRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    sinPrecio: { color: colors.vendido, fontWeight: '700' },
});

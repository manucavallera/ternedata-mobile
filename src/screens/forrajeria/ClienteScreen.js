import { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { useRecargarAlEnfocar } from '../../hooks/useRecargarAlEnfocar';
import { confirmar } from '../../utils/confirmar';
import { etiquetaEstado, plata } from '../../utils/ventas';
import { colors } from '../../theme';
import { Aviso, Encabezado, estilos, fechaCorta, mensajeError, ok, useAviso, useEsDueno } from './comun';
import { CAMPOS_CLIENTE } from './ClientesScreen';

export default function ClienteScreen() {
    const navigation = useNavigation();
    const { id } = useRoute().params || {};
    const {
        obtenerCuentaClienteForrajeriaHook, obtenerPedidosForrajeriaHook,
        actualizarContactoForrajeriaHook, registrarPagoClienteForrajeriaHook,
    } = useBussinesMicroservicio();
    const consultarDueno = useEsDueno();
    const [cuenta, setCuenta] = useState(null);
    const [pedidos, setPedidos] = useState([]);
    const [esDueno, setEsDueno] = useState(false);
    const [edicion, setEdicion] = useState(null);
    const [pago, setPago] = useState({ monto: '', concepto: '' });
    const [cargando, setCargando] = useState(true);
    const [refrescando, setRefrescando] = useState(false);
    const [aviso, avisar] = useAviso();

    const cargar = useCallback(async () => {
        const [c, p, dueno] = await Promise.all([
            obtenerCuentaClienteForrajeriaHook(id),
            obtenerPedidosForrajeriaHook({ id_cliente: id }),
            consultarDueno(),
        ]);
        if (c?.status === 200) setCuenta(c.data);
        else avisar(mensajeError(c, 'No se pudo cargar el cliente'), false);
        if (p?.status === 200) setPedidos(p.data || []);
        setEsDueno(dueno);
        setCargando(false);
    }, [id, consultarDueno]);

    useRecargarAlEnfocar(cargar, [cargar]);

    const guardarEdicion = async () => {
        if (!edicion.nombre.trim()) return avisar('El nombre es obligatorio', false);
        const limite = Number(String(edicion.limite_credito).replace(',', '.'));
        if (Number.isNaN(limite) || limite < 0) return avisar('El límite de crédito no puede ser negativo', false);
        // Un campo vacío se manda como null para poder borrarlo.
        const datos = { limite_credito: limite };
        for (const [campo] of CAMPOS_CLIENTE) datos[campo] = edicion[campo]?.trim() || (campo === 'nombre' ? undefined : null);
        const res = await actualizarContactoForrajeriaHook(id, datos);
        if (res?.status === 200) {
            setEdicion(null);
            avisar('Cliente actualizado');
            await cargar();
        } else avisar(mensajeError(res, 'No se pudo actualizar el cliente'), false);
    };

    const cambiarEstado = () => {
        const c = cuenta.contacto;
        const nuevo = c.estado === 'inactivo' ? 'activo' : 'inactivo';
        const aplicar = async () => {
            const res = await actualizarContactoForrajeriaHook(id, { estado: nuevo });
            if (res?.status === 200) {
                avisar(nuevo === 'inactivo' ? 'Cliente dado de baja' : 'Cliente reactivado');
                await cargar();
            } else avisar(mensajeError(res, 'No se pudo cambiar el estado'), false);
        };
        if (nuevo === 'activo') return aplicar();
        confirmar('Dar de baja', `¿Dar de baja a "${c.nombre}"? No se le van a poder cargar pedidos nuevos. Su cuenta y sus pedidos se conservan.`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Dar de baja', style: 'destructive', onPress: aplicar },
        ]);
    };

    const registrarPago = () => {
        const monto = Number(pago.monto.replace(',', '.'));
        if (!(monto > 0)) return avisar('Indicá un monto mayor a cero', false);
        confirmar('Registrar pago', `¿Registrar un pago de ${plata(monto)} de ${cuenta.contacto.nombre}?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Registrar',
                onPress: async () => {
                    const res = await registrarPagoClienteForrajeriaHook(id, {
                        monto,
                        ...(pago.concepto.trim() ? { concepto: pago.concepto.trim() } : {}),
                    });
                    if (ok(res)) {
                        setPago({ monto: '', concepto: '' });
                        avisar(`Pago de ${plata(monto)} registrado`);
                        await cargar();
                    } else avisar(mensajeError(res, 'No se pudo registrar el pago'), false);
                },
            },
        ]);
    };

    const onRefresh = async () => { setRefrescando(true); await cargar(); setRefrescando(false); };

    if (cargando || !cuenta) {
        return (
            <View style={estilos.container}>
                <Encabezado titulo="👤 Cliente" />
                <Aviso aviso={aviso} />
                {cargando ? <ActivityIndicator size="large" color={colors.campo} style={{ marginTop: 40 }} />
                    : <Text style={estilos.vacio}>Cliente no encontrado.</Text>}
            </View>
        );
    }

    const { contacto: c, movimientos = [], saldo } = cuenta;

    return (
        <View style={estilos.container}>
            <Encabezado titulo={`👤 ${c.nombre}`} subtitulo={[c.estado === 'inactivo' && 'De baja', c.documento, c.zona].filter(Boolean).join(' · ')} />
            <Aviso aviso={aviso} />
            <ScrollView
                contentContainerStyle={estilos.content}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}
            >
                <View style={[estilos.card, { alignItems: 'center' }]}>
                    <Text style={[estilos.monto, { fontSize: 28 }, saldo > 0 && estilos.debe, saldo < 0 && estilos.aFavor]}>{plata(Math.abs(saldo))}</Text>
                    <Text style={estilos.sub}>{saldo > 0 ? 'Debe' : saldo < 0 ? 'A favor' : 'Al día'}</Text>
                </View>

                <View style={estilos.card}>
                    <View style={[estilos.row, { justifyContent: 'space-between' }]}>
                        <Text style={estilos.sectionTitle}>Datos</Text>
                        {esDueno && !edicion && (
                            <View style={estilos.row}>
                                <TouchableOpacity
                                    style={estilos.btnSecundario}
                                    onPress={() => setEdicion({ ...Object.fromEntries(CAMPOS_CLIENTE.map(([k]) => [k, c[k] || ''])), limite_credito: String(c.limite_credito ?? 0) })}
                                >
                                    <Text style={estilos.btnSecundarioText}>Editar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={estilos.btnSecundario} onPress={cambiarEstado}>
                                    <Text style={estilos.btnSecundarioText}>{c.estado === 'inactivo' ? 'Reactivar' : 'Dar de baja'}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                    {edicion ? (
                        <View>
                            {CAMPOS_CLIENTE.map(([campo, etiqueta, max]) => (
                                <View key={campo}>
                                    <Text style={estilos.label}>{etiqueta}</Text>
                                    <TextInput style={estilos.input} maxLength={max} value={edicion[campo]} onChangeText={v => setEdicion(e => ({ ...e, [campo]: v }))} placeholder={etiqueta.replace(' *', '')} />
                                </View>
                            ))}
                            <Text style={estilos.label}>Límite de crédito (0 = sin límite)</Text>
                            <TextInput style={estilos.input} value={edicion.limite_credito} onChangeText={v => setEdicion(e => ({ ...e, limite_credito: v }))} placeholder="Límite de crédito" keyboardType="decimal-pad" />
                            <View style={[estilos.row, { marginTop: 12 }]}>
                                <TouchableOpacity style={[estilos.btnPrimario, { flex: 1 }]} onPress={guardarEdicion}>
                                    <Text style={estilos.btnPrimarioText}>Guardar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={estilos.btnSecundario} onPress={() => setEdicion(null)}>
                                    <Text style={estilos.btnSecundarioText}>Cancelar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View>
                            {CAMPOS_CLIENTE.slice(1).map(([campo, etiqueta]) => (
                                <Text key={campo} style={estilos.texto}><Text style={estilos.sub}>{etiqueta}: </Text>{c[campo] || '-'}</Text>
                            ))}
                            <Text style={estilos.texto}>
                                <Text style={estilos.sub}>Límite de crédito: </Text>{Number(c.limite_credito) > 0 ? plata(c.limite_credito) : 'Sin límite'}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={estilos.card}>
                    <Text style={estilos.sectionTitle}>Cuenta corriente</Text>
                    {esDueno && (
                        <View style={{ marginBottom: 8 }}>
                            <View style={estilos.row}>
                                <TextInput style={[estilos.input, { width: 110 }]} value={pago.monto} onChangeText={v => setPago(p => ({ ...p, monto: v }))} placeholder="Monto" keyboardType="decimal-pad" />
                                <TextInput style={[estilos.input, { flex: 1, minWidth: 0 }]} maxLength={200} value={pago.concepto} onChangeText={v => setPago(p => ({ ...p, concepto: v }))} placeholder="Concepto (opcional)" />
                            </View>
                            <TouchableOpacity style={[estilos.btnPrimario, { marginTop: 8 }]} onPress={registrarPago}>
                                <Text style={estilos.btnPrimarioText}>Registrar pago</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {movimientos.length === 0
                        ? <Text style={estilos.vacio}>Sin movimientos. Los pedidos a crédito se cargan acá al entregarse.</Text>
                        : movimientos.map(m => (
                            <View key={m.id_movimiento} style={[estilos.fila, estilos.row]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={estilos.texto}>{m.concepto}</Text>
                                    <Text style={estilos.sub}>{fechaCorta(m.fecha_creacion)}</Text>
                                </View>
                                {Number(m.debe) > 0
                                    ? <Text style={[estilos.fuerte, estilos.debe]}>+ {plata(m.debe)}</Text>
                                    : <Text style={[estilos.fuerte, estilos.aFavor]}>pagó {plata(m.haber)}</Text>}
                            </View>
                        ))}
                </View>

                <View style={estilos.card}>
                    <View style={[estilos.row, { justifyContent: 'space-between' }]}>
                        <Text style={estilos.sectionTitle}>Pedidos</Text>
                        {c.estado !== 'inactivo' && (
                            <TouchableOpacity onPress={() => navigation.navigate('ForrajeriaPedidoNuevo', { cliente: c.id_contacto })}>
                                <Text style={estilos.link}>Nuevo pedido →</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {pedidos.length === 0
                        ? <Text style={estilos.vacio}>Todavía no tiene pedidos.</Text>
                        : pedidos.map(p => (
                            <View key={p.id_pedido} style={[estilos.fila, estilos.row]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={estilos.texto}>Pedido #{p.id_pedido} <Text style={estilos.sub}>· {fechaCorta(p.fecha_creacion)}</Text></Text>
                                    <Text style={estilos.sub} numberOfLines={1}>{(p.items || []).map(i => `${Number(i.cantidad)} ${i.producto?.nombre || 'producto'}`).join(', ')}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={estilos.fuerte}>{plata(p.total)}</Text>
                                    <Text style={estilos.sub}>{etiquetaEstado(p.estado)} · {p.forma_pago === 'credito' ? 'cuenta corriente' : 'contado'}</Text>
                                </View>
                            </View>
                        ))}
                </View>
            </ScrollView>
        </View>
    );
}

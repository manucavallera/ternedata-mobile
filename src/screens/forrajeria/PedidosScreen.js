import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { useRecargarAlEnfocar } from '../../hooks/useRecargarAlEnfocar';
import { confirmar } from '../../utils/confirmar';
import { ESTADOS, etiquetaEstado, plata, sePuedeCancelar, siguientePaso, textoRemito } from '../../utils/ventas';
import { colors } from '../../theme';
import { Aviso, Chips, Encabezado, estilos, mensajeError, useAviso, useEsDueno } from './comun';

// "En curso" agrupa todo lo que falta entregar (igual que la web).
const FILTROS = [['en_curso', 'En curso'], ...ESTADOS.slice(4).map(e => [e.valor, e.etiqueta]), ['', 'Todos']];
const EN_CURSO = ['pendiente', 'confirmado', 'preparando', 'listo'];
const COLOR = {
    pendiente: colors.neutro, confirmado: '#2C5282', preparando: colors.vendido,
    listo: colors.vivo, entregado: colors.inkSoft, cancelado: colors.muerto,
};

const fecha = (valor) =>
    new Date(valor).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function PedidosScreen() {
    const navigation = useNavigation();
    const { obtenerPedidosForrajeriaHook, cambiarEstadoPedidoForrajeriaHook } = useBussinesMicroservicio();
    const consultarDueno = useEsDueno();
    const [pedidos, setPedidos] = useState([]);
    const [filtro, setFiltro] = useState('en_curso');
    const [cargando, setCargando] = useState(true);
    const [refrescando, setRefrescando] = useState(false);
    const [ocupado, setOcupado] = useState(null);
    const [esDueno, setEsDueno] = useState(false);
    const [aviso, avisar] = useAviso();

    const cargar = useCallback(async () => {
        const f = filtro;
        const params = f && f !== 'en_curso' ? { estado: f } : {};
        const [res, dueno] = await Promise.all([obtenerPedidosForrajeriaHook(params), consultarDueno()]);
        if (res?.status === 200) {
            const lista = res.data || [];
            setPedidos(f === 'en_curso' ? lista.filter(p => EN_CURSO.includes(p.estado)) : lista);
        } else avisar(mensajeError(res, 'No se pudieron cargar los pedidos'), false);
        setEsDueno(dueno);
        setCargando(false);
    }, [filtro, consultarDueno]);

    // Recarga al volver a la pantalla y al cambiar el filtro (cargar depende de filtro).
    useRecargarAlEnfocar(cargar, [cargar]);

    const elegirFiltro = (f) => { setCargando(true); setFiltro(f); };

    const aplicarEstado = async (pedido, estado) => {
        setOcupado(pedido.id_pedido);
        const res = await cambiarEstadoPedidoForrajeriaHook(pedido.id_pedido, estado);
        if (res?.status === 200) {
            avisar(`Pedido #${pedido.id_pedido}: ${etiquetaEstado(estado).toLowerCase()}`);
            await cargar();
        } else {
            const m = res?.data?.message;
            avisar(m === 'Stock insuficiente para confirmar el pedido'
                ? 'No hay stock suficiente para confirmar este pedido. Cargá la entrada de mercadería en Productos.'
                : mensajeError(res, 'No se pudo cambiar el estado'), false);
        }
        setOcupado(null);
    };

    const cambiarEstado = (pedido, estado) => {
        const cliente = pedido.cliente?.nombre || 'el cliente';
        if (estado === 'cancelado') {
            const devuelve = ['confirmado', 'preparando'].includes(pedido.estado) ? ' El stock vuelve al galpón.' : '';
            confirmar('Cancelar pedido', `¿Cancelar el pedido #${pedido.id_pedido} de ${cliente}?${devuelve}`, [
                { text: 'No', style: 'cancel' },
                { text: 'Cancelar pedido', style: 'destructive', onPress: () => aplicarEstado(pedido, estado) },
            ]);
            return;
        }
        if (estado === 'entregado' && pedido.forma_pago === 'credito') {
            confirmar('Entregar', `Al entregar, ${plata(pedido.total)} se cargan en la cuenta corriente de ${cliente}. ¿Seguir?`, [
                { text: 'No', style: 'cancel' },
                { text: 'Entregar', onPress: () => aplicarEstado(pedido, estado) },
            ]);
            return;
        }
        aplicarEstado(pedido, estado);
    };

    // El remito va por WhatsApp: al número del cliente si lo tiene, si no se elige el chat.
    const compartirRemito = (pedido) => {
        const numero = String(pedido.cliente?.whatsapp || '').replace(/\D/g, '');
        Linking.openURL(`https://wa.me/${numero}?text=${encodeURIComponent(textoRemito(pedido, 'Forrajería'))}`);
    };

    const onRefresh = async () => { setRefrescando(true); await cargar(); setRefrescando(false); };

    const renderPedido = (p) => {
        const paso = siguientePaso(p.estado);
        return (
            <View key={p.id_pedido} style={estilos.card}>
                <View style={[estilos.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={estilos.fuerte}>
                            #{p.id_pedido}{' '}
                            <Text onPress={() => p.cliente && navigation.navigate('ForrajeriaCliente', { id: p.cliente.id_contacto })}>
                                {p.cliente?.nombre || 'Cliente'}
                            </Text>
                        </Text>
                        <Text style={[estilos.sub, { color: COLOR[p.estado], fontWeight: '800' }]}>{etiquetaEstado(p.estado)}</Text>
                        <Text style={estilos.sub}>
                            {fecha(p.fecha_creacion)} · {p.forma_entrega === 'reparto' ? `Reparto${p.zona_entrega ? ` a ${p.zona_entrega}` : ''}` : 'Retira'} · {p.forma_pago === 'credito' ? 'Cuenta corriente' : 'Contado'}
                        </Text>
                    </View>
                    <Text style={estilos.monto}>{plata(p.total)}</Text>
                </View>
                <View style={{ marginTop: 8 }}>
                    {(p.items || []).map(i => (
                        <Text key={i.id_item} style={estilos.texto}>
                            {Number(i.cantidad)} {i.producto?.unidad_venta || ''} {i.producto?.nombre || 'producto'}
                            <Text style={estilos.sub}> · {plata(i.subtotal)}</Text>
                        </Text>
                    ))}
                </View>
                {p.direccion_entrega ? <Text style={estilos.sub}>Dirección: {p.direccion_entrega}</Text> : null}
                {p.observaciones ? <Text style={estilos.sub}>Nota: {p.observaciones}</Text> : null}
                <View style={[estilos.row, { marginTop: 10, flexWrap: 'wrap' }]}>
                    {paso && (
                        <TouchableOpacity style={estilos.btnPrimario} disabled={ocupado === p.id_pedido} onPress={() => cambiarEstado(p, paso.estado)}>
                            <Text style={estilos.btnPrimarioText}>{paso.accion}</Text>
                        </TouchableOpacity>
                    )}
                    {esDueno && sePuedeCancelar(p.estado) && (
                        <TouchableOpacity style={estilos.btnSecundario} disabled={ocupado === p.id_pedido} onPress={() => cambiarEstado(p, 'cancelado')}>
                            <Text style={estilos.btnSecundarioText}>Cancelar pedido</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={estilos.btnSecundario} onPress={() => compartirRemito(p)}>
                        <Text style={estilos.btnSecundarioText}>Remito por WhatsApp</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={estilos.container}>
            <Encabezado titulo="🧾 Pedidos" subtitulo="Ventas a clientes" />
            <Aviso aviso={aviso} />
            <ScrollView
                contentContainerStyle={estilos.content}
                refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}
            >
                <TouchableOpacity style={[estilos.btnPrimario, { marginBottom: 12 }]} onPress={() => navigation.navigate('ForrajeriaPedidoNuevo')}>
                    <Text style={estilos.btnPrimarioText}>+ Nuevo pedido</Text>
                </TouchableOpacity>
                <View style={{ marginBottom: 12 }}>
                    <Chips opciones={FILTROS} valor={filtro} onCambio={elegirFiltro} />
                </View>
                {cargando ? <ActivityIndicator size="large" color={colors.campo} style={{ marginTop: 30 }} />
                    : pedidos.length === 0
                        ? <Text style={estilos.vacio}>{filtro === 'en_curso' ? 'No hay pedidos pendientes de entregar.' : 'No hay pedidos con este estado.'}</Text>
                        : pedidos.map(renderPedido)}
            </ScrollView>
        </View>
    );
}

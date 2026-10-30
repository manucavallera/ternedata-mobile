import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { confirmar } from '../../utils/confirmar';
import { coincideCliente, plata, totalPedido } from '../../utils/ventas';
import { colors } from '../../theme';
import { Aviso, Chips, Encabezado, estilos, mensajeError, ok, useAviso, useEsDueno } from './comun';

// Busca productos por nombre, sin importar mayúsculas ni tildes.
const coincideProducto = (producto, busqueda) => coincideCliente({ nombre: producto.nombre }, busqueda);

export default function PedidoNuevoScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { obtenerClientesForrajeriaHook, obtenerProductosForrajeriaHook, crearPedidoForrajeriaHook } = useBussinesMicroservicio();
    const consultarDueno = useEsDueno();
    const [clientes, setClientes] = useState([]);
    const [productos, setProductos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [esDueno, setEsDueno] = useState(false);
    const [idCliente, setIdCliente] = useState(route.params?.cliente ?? null);
    const [buscarCliente, setBuscarCliente] = useState('');
    const [buscarProducto, setBuscarProducto] = useState('');
    // { [id_producto]: cantidad escrita }: un producto aparece una sola vez en el pedido.
    const [cantidades, setCantidades] = useState({});
    const [entrega, setEntrega] = useState({ forma_entrega: 'retiro', direccion_entrega: '', zona_entrega: '' });
    const [formaPago, setFormaPago] = useState('contado');
    const [observaciones, setObservaciones] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [aviso, avisar] = useAviso();

    useEffect(() => {
        Promise.all([obtenerClientesForrajeriaHook(), obtenerProductosForrajeriaHook(), consultarDueno()])
            .then(([c, p, dueno]) => {
                if (c?.status !== 200 || p?.status !== 200) avisar('No se pudieron cargar clientes y productos', false);
                setClientes((c?.data || []).filter(x => x.estado !== 'inactivo'));
                setProductos((p?.data || []).filter(x => x.estado !== 'inactivo'));
                setEsDueno(dueno);
            })
            .finally(() => setCargando(false));
    }, []);

    const cliente = clientes.find(c => String(c.id_contacto) === String(idCliente));
    const lineas = useMemo(() => productos
        .filter(p => Number(cantidades[p.id_producto]) > 0)
        .map(p => ({ producto: p, cantidad: Number(cantidades[p.id_producto]), precio: p.precio })), [productos, cantidades]);
    const total = totalPedido(lineas);
    const sinPrecio = lineas.some(l => Number(l.precio) === 0);

    // Al elegir cliente, completa dirección y zona desde su ficha.
    const elegirCliente = (c) => {
        setIdCliente(c.id_contacto);
        setEntrega(e => ({ ...e, direccion_entrega: c.direccion || '', zona_entrega: c.zona || '' }));
    };

    const enviar = async (superarLimite = false) => {
        if (!cliente) return avisar('Elegí un cliente', false);
        if (!lineas.length) return avisar('Agregá al menos un producto con cantidad', false);
        if (entrega.forma_entrega === 'reparto' && !entrega.direccion_entrega.trim()) return avisar('Para reparto indicá la dirección', false);

        const cuerpo = {
            id_cliente: cliente.id_contacto,
            items: lineas.map(l => ({ id_producto: l.producto.id_producto, cantidad: l.cantidad })),
            forma_entrega: entrega.forma_entrega,
            forma_pago: formaPago,
        };
        if (entrega.forma_entrega === 'reparto') {
            cuerpo.direccion_entrega = entrega.direccion_entrega.trim();
            if (entrega.zona_entrega.trim()) cuerpo.zona_entrega = entrega.zona_entrega.trim();
        }
        if (observaciones.trim()) cuerpo.observaciones = observaciones.trim();
        if (superarLimite) cuerpo.superar_limite = true;

        setEnviando(true);
        const res = await crearPedidoForrajeriaHook(cuerpo);
        setEnviando(false);
        if (ok(res)) {
            navigation.goBack();
            return;
        }
        const m = res?.data?.message;
        const pasaLimite = typeof m === 'string' && m.startsWith('Supera el límite');
        // Pasar el límite de crédito: el dueño puede cargarlo igual.
        if (pasaLimite && esDueno && !superarLimite) {
            confirmar('Límite de crédito', `${m}\n\n¿Cargar el pedido igual?`, [
                { text: 'No', style: 'cancel' },
                { text: 'Cargar igual', onPress: () => enviar(true) },
            ]);
            return;
        }
        avisar(pasaLimite && !esDueno ? `${m} Pedile al dueño que lo autorice.` : mensajeError(res, 'No se pudo crear el pedido'), false);
    };

    if (cargando) {
        return (
            <View style={estilos.container}>
                <Encabezado titulo="🧾 Nuevo pedido" />
                <ActivityIndicator size="large" color={colors.campo} style={{ marginTop: 40 }} />
            </View>
        );
    }

    const clientesVisibles = clientes.filter(c => coincideCliente(c, buscarCliente)).slice(0, 8);
    const productosVisibles = productos.filter(p => coincideProducto(p, buscarProducto));

    return (
        <View style={estilos.container}>
            <Encabezado titulo="🧾 Nuevo pedido" subtitulo="Queda pendiente. El stock se descuenta al confirmarlo." />
            <Aviso aviso={aviso} />
            <ScrollView contentContainerStyle={estilos.content} keyboardShouldPersistTaps="handled">
                <View style={estilos.card}>
                    <Text style={estilos.sectionTitle}>Cliente</Text>
                    {clientes.length === 0 ? (
                        <TouchableOpacity onPress={() => navigation.navigate('ForrajeriaClientes')}>
                            <Text style={estilos.texto}>No hay clientes cargados. <Text style={estilos.link}>Cargá uno primero</Text></Text>
                        </TouchableOpacity>
                    ) : cliente ? (
                        <View style={[estilos.row, { justifyContent: 'space-between' }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.fuerte}>{cliente.nombre}</Text>
                                {cliente.zona ? <Text style={estilos.sub}>{cliente.zona}</Text> : null}
                            </View>
                            <TouchableOpacity onPress={() => setIdCliente(null)}>
                                <Text style={estilos.link}>Cambiar</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            <TextInput style={estilos.input} value={buscarCliente} onChangeText={setBuscarCliente} placeholder="Buscar cliente" />
                            {clientesVisibles.map(c => (
                                <TouchableOpacity key={c.id_contacto} style={estilos.fila} onPress={() => elegirCliente(c)}>
                                    <Text style={estilos.texto}>{c.nombre}{c.zona ? ` (${c.zona})` : ''}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                <View style={estilos.card}>
                    <Text style={estilos.sectionTitle}>Productos</Text>
                    <TextInput style={estilos.input} value={buscarProducto} onChangeText={setBuscarProducto} placeholder="Buscar producto" />
                    {productosVisibles.length === 0 && <Text style={estilos.vacio}>No hay productos que coincidan.</Text>}
                    {productosVisibles.map(p => (
                        <View key={p.id_producto} style={[estilos.fila, estilos.row]}>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.texto}>{p.nombre}</Text>
                                <Text style={estilos.sub}>{plata(p.precio)} / {p.unidad_venta} · stock {Number(p.stock_actual)}</Text>
                            </View>
                            <TextInput
                                style={[estilos.input, { width: 80 }]}
                                value={cantidades[p.id_producto] || ''}
                                onChangeText={v => setCantidades(c => ({ ...c, [p.id_producto]: v.replace(',', '.') }))}
                                placeholder={p.unidad_venta}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    ))}
                    {sinPrecio && <Text style={estilos.advertencia}>Hay productos sin precio: van a salir a $0. Cargale el precio en Productos.</Text>}
                </View>

                <View style={estilos.card}>
                    <Text style={estilos.sectionTitle}>Entrega</Text>
                    <Chips
                        opciones={[['retiro', 'Retira en el local'], ['reparto', 'Reparto']]}
                        valor={entrega.forma_entrega}
                        onCambio={v => setEntrega(e => ({ ...e, forma_entrega: v }))}
                    />
                    {entrega.forma_entrega === 'reparto' && (
                        <View>
                            <Text style={estilos.label}>Dirección *</Text>
                            <TextInput style={estilos.input} maxLength={200} value={entrega.direccion_entrega} onChangeText={v => setEntrega(e => ({ ...e, direccion_entrega: v }))} placeholder="Dirección" />
                            <Text style={estilos.label}>Zona</Text>
                            <TextInput style={estilos.input} maxLength={100} value={entrega.zona_entrega} onChangeText={v => setEntrega(e => ({ ...e, zona_entrega: v }))} placeholder="Zona" />
                        </View>
                    )}
                    <Text style={[estilos.sectionTitle, { marginTop: 14 }]}>Pago</Text>
                    <Chips opciones={[['contado', 'Contado'], ['credito', 'Cuenta corriente']]} valor={formaPago} onCambio={setFormaPago} />
                    {formaPago === 'credito' && (
                        <Text style={estilos.sub}>
                            Se carga en la cuenta del cliente cuando se entrega.
                            {Number(cliente?.limite_credito) > 0 ? ` Límite de crédito: ${plata(cliente.limite_credito)}.` : ''}
                        </Text>
                    )}
                    <Text style={estilos.label}>Nota</Text>
                    <TextInput style={estilos.input} value={observaciones} onChangeText={setObservaciones} placeholder="Nota (opcional)" multiline />
                </View>

                <View style={[estilos.card, estilos.row, { justifyContent: 'space-between' }]}>
                    <View>
                        <Text style={estilos.sub}>Total</Text>
                        <Text style={[estilos.monto, { fontSize: 22 }]}>{plata(total)}</Text>
                    </View>
                    <TouchableOpacity style={estilos.btnPrimario} onPress={() => enviar()} disabled={enviando}>
                        {enviando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.btnPrimarioText}>Crear pedido</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

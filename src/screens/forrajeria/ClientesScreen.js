import { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useBussinesMicroservicio } from '../../hooks/bussines';
import { useRecargarAlEnfocar } from '../../hooks/useRecargarAlEnfocar';
import { coincideCliente, haceCuanto, ordenarDeudores, plata } from '../../utils/ventas';
import { colors } from '../../theme';
import { Aviso, Chips, Encabezado, estilos, mensajeError, ok, useAviso } from './comun';

const VACIO = { nombre: '', documento: '', telefono: '', whatsapp: '', direccion: '', zona: '' };
export const CAMPOS_CLIENTE = [
    ['nombre', 'Nombre *', 150],
    ['documento', 'CUIT / DNI', 30],
    ['telefono', 'Teléfono', 50],
    ['whatsapp', 'WhatsApp', 50],
    ['direccion', 'Dirección', 200],
    ['zona', 'Zona de reparto', 100],
];

export default function ClientesScreen() {
    const navigation = useNavigation();
    const { obtenerClientesForrajeriaHook, obtenerSaldosForrajeriaHook, crearContactoForrajeriaHook } = useBussinesMicroservicio();
    const [clientes, setClientes] = useState([]);
    const [saldos, setSaldos] = useState({});
    const [busqueda, setBusqueda] = useState('');
    const [soloDeudores, setSoloDeudores] = useState(false);
    const [verBajas, setVerBajas] = useState(false);
    const [form, setForm] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [refrescando, setRefrescando] = useState(false);
    const [aviso, avisar] = useAviso();

    const cargar = useCallback(async () => {
        const [c, s] = await Promise.all([obtenerClientesForrajeriaHook(), obtenerSaldosForrajeriaHook()]);
        if (c?.status === 200) setClientes(c.data || []);
        else avisar(mensajeError(c, 'No se pudieron cargar los clientes'), false);
        if (s?.status === 200) setSaldos(Object.fromEntries((s.data || []).map(x => [x.id_contacto, x])));
        setCargando(false);
    }, []);

    useRecargarAlEnfocar(cargar, [cargar]);

    const guardar = async () => {
        const nombre = form.nombre.trim();
        if (!nombre) return avisar('Ingresá el nombre del cliente', false);
        const datos = { tipo: 'cliente', nombre };
        for (const [campo] of CAMPOS_CLIENTE.slice(1)) if (form[campo].trim()) datos[campo] = form[campo].trim();
        setGuardando(true);
        const res = await crearContactoForrajeriaHook(datos);
        setGuardando(false);
        if (ok(res)) {
            avisar(`Cliente "${nombre}" cargado`);
            setForm(null);
            await cargar();
        } else avisar(mensajeError(res, 'No se pudo guardar el cliente'), false);
    };

    const visibles = useMemo(() => {
        const filtrados = clientes.filter(c => (verBajas || c.estado !== 'inactivo') && coincideCliente(c, busqueda));
        return soloDeudores ? ordenarDeudores(filtrados, saldos) : filtrados;
    }, [clientes, verBajas, busqueda, soloDeudores, saldos]);
    const bajas = clientes.filter(c => c.estado === 'inactivo').length;
    const totalDeuda = Object.values(saldos).reduce((s, v) => s + (v.saldo > 0 ? v.saldo : 0), 0);

    const onRefresh = async () => { setRefrescando(true); await cargar(); setRefrescando(false); };

    return (
        <View style={estilos.container}>
            <Encabezado titulo="👥 Clientes" subtitulo={totalDeuda > 0 ? `Te deben en total ${plata(totalDeuda)}` : 'Cuenta corriente de cada cliente'} />
            <Aviso aviso={aviso} />
            <ScrollView
                contentContainerStyle={estilos.content}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}
            >
                {form ? (
                    <View style={estilos.card}>
                        <Text style={estilos.sectionTitle}>Nuevo cliente</Text>
                        {CAMPOS_CLIENTE.map(([campo, etiqueta, max]) => (
                            <View key={campo}>
                                <Text style={estilos.label}>{etiqueta}</Text>
                                <TextInput
                                    style={estilos.input}
                                    value={form[campo]}
                                    maxLength={max}
                                    onChangeText={v => setForm(f => ({ ...f, [campo]: v }))}
                                    placeholder={etiqueta.replace(' *', '')}
                                    keyboardType={['telefono', 'whatsapp'].includes(campo) ? 'phone-pad' : 'default'}
                                />
                            </View>
                        ))}
                        <View style={[estilos.row, { marginTop: 14 }]}>
                            <TouchableOpacity style={[estilos.btnPrimario, { flex: 1 }]} onPress={guardar} disabled={guardando}>
                                {guardando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.btnPrimarioText}>Guardar cliente</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity style={estilos.btnSecundario} onPress={() => setForm(null)}>
                                <Text style={estilos.btnSecundarioText}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity style={[estilos.btnPrimario, { marginBottom: 12 }]} onPress={() => setForm(VACIO)}>
                        <Text style={estilos.btnPrimarioText}>+ Nuevo cliente</Text>
                    </TouchableOpacity>
                )}

                <TextInput style={[estilos.input, { marginBottom: 10 }]} value={busqueda} onChangeText={setBusqueda} placeholder="Buscar por nombre, CUIT o zona" />
                <Chips opciones={[[false, 'Todos'], [true, 'Deudores']]} valor={soloDeudores} onCambio={setSoloDeudores} />
                {bajas > 0 && (
                    <TouchableOpacity onPress={() => setVerBajas(v => !v)} style={{ marginTop: 8 }}>
                        <Text style={estilos.sub}>{verBajas ? 'Ocultar' : 'Mostrar'} dados de baja ({bajas})</Text>
                    </TouchableOpacity>
                )}

                <View style={[estilos.card, { marginTop: 12 }]}>
                    {cargando ? <ActivityIndicator color={colors.campo} />
                        : visibles.length === 0 ? (
                            <Text style={estilos.vacio}>
                                {clientes.length === 0 ? 'Todavía no cargaste clientes.' : soloDeudores ? 'Nadie te debe plata.' : 'Ningún cliente coincide con la búsqueda.'}
                            </Text>
                        ) : visibles.map(c => {
                            const saldo = saldos[c.id_contacto]?.saldo || 0;
                            return (
                                <TouchableOpacity
                                    key={c.id_contacto}
                                    style={[estilos.fila, estilos.row, c.estado === 'inactivo' && { opacity: 0.5 }]}
                                    onPress={() => navigation.navigate('ForrajeriaCliente', { id: c.id_contacto })}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={estilos.fuerte}>{c.nombre}{c.estado === 'inactivo' ? '  · de baja' : ''}</Text>
                                        <Text style={estilos.sub}>{[c.zona, c.telefono || c.whatsapp].filter(Boolean).join(' · ') || 'Sin datos de contacto'}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[estilos.monto, saldo > 0 && estilos.debe, saldo < 0 && estilos.aFavor]}>{plata(Math.abs(saldo))}</Text>
                                        <Text style={estilos.sub}>
                                            {saldo > 0 ? (soloDeudores ? `último pago: ${haceCuanto(saldos[c.id_contacto]?.ultimo_pago)}` : 'debe') : saldo < 0 ? 'a favor' : 'al día'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                </View>
            </ScrollView>
        </View>
    );
}

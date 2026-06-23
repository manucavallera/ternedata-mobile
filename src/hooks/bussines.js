import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import businessApi from '../api/bussines-api';
import { setAuthPayload, setStatus, setUserData } from '../store/auth/authSlice';

const handleUnauthorized = async (dispatch) => {
    await AsyncStorage.clear();
    dispatch(setAuthPayload({}));
    dispatch(setStatus('not-authenticated'));
    dispatch(setUserData({}));
};

export const useBussinesMicroservicio = () => {
    const dispatch = useDispatch();
    const on401 = () => handleUnauthorized(dispatch);

    // MADRES
    const crearMadreHook = async (objectMadre) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.post('/madres/crear-madre', objectMadre);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const obtenerMadreHook = async (queryParams = '') => {
        try {
            const url = queryParams ? `/madres/obtener-listado-madres?${queryParams}` : '/madres/obtener-listado-madres';
            const { data, config, headers, status, statusText, request } = await businessApi.get(url);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const patchMadreHook = async (id, data) => {
        try {
            const res = await businessApi.patch(`/madres/patch-madre-by-id/${id}`, data);
            return { data: res.data, status: res.status };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return { status: error.response?.status, error: true };
        }
    };

    // TERNEROS
    const crearTerneroHook = async (objectTernero) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.post('/terneros/crear-ternero', objectTernero);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const obtenerTerneroHook = async (queryParams = '') => {
        try {
            const url = queryParams ? `/terneros/obtener-listado-terneros?${queryParams}` : '/terneros/obtener-listado-terneros';
            const { data, config, headers, status, statusText, request } = await businessApi.get(url);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const agregarPesoDiarioHook = async (id_ternero, pesoData) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.post(`/terneros/peso-diario/${id_ternero}`, pesoData);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const obtenerHistorialCompletoHook = async (id_ternero) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.get(`/terneros/historial-completo/${id_ternero}`);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const patchTerneroHook = async (id, data) => {
        try {
            const res = await businessApi.patch(`/terneros/patch-ternero-by-id/${id}`, data);
            return { data: res.data, status: res.status };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return { status: error.response?.status, error: true };
        }
    };

    const actualizarCalostradoHook = async (id_ternero, calostradoData) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.patch(`/terneros/calostrado/${id_ternero}`, calostradoData);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    // EVENTOS
    const crearEventoHook = async (objectEvento) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.post('/eventos/crear-evento', objectEvento);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const crearMultiplesEventosHook = async (objectMultiplesEventos) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.post('/eventos/crear-multiples-eventos', objectMultiplesEventos);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const obtenerEventoHook = async (queryParams = '') => {
        try {
            const url = queryParams ? `/eventos/obtener-listado-eventos?${queryParams}` : '/eventos/obtener-listado-eventos';
            const { data, config, headers, status, statusText, request } = await businessApi.get(url);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const patchEventoHook = async (id, data) => {
        try {
            const res = await businessApi.patch(`/eventos/patch-evento-by-id/${id}`, data);
            return { data: res.data, status: res.status };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return { status: error.response?.status, error: true };
        }
    };

    // TRATAMIENTOS
    const crearTratamientoHook = async (objectTratamiento) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.post('/tratamientos/crear-tratamiento', objectTratamiento);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const crearMultiplesTratamientosHook = async (objectMultiplesTratamientos) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.post('/tratamientos/crear-multiples-tratamientos', objectMultiplesTratamientos);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const obtenerTratamientoHook = async (queryParams = '') => {
        try {
            const url = queryParams ? `/tratamientos/obtener-listado-tratamientos?${queryParams}` : '/tratamientos/obtener-listado-tratamientos';
            const { data, config, headers, status, statusText, request } = await businessApi.get(url);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const obtenerTratamientosPorTipoHook = async (tipoEnfermedad) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.get(`/tratamientos/obtener-tratamientos-por-enfermedad/${tipoEnfermedad}`);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const obtenerTratamientosPorTurnoHook = async (turno) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.get(`/tratamientos/obtener-tratamientos-por-turno/${turno}`);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const obtenerTratamientosPorTipoYTurnoHook = async (tipoEnfermedad, turno) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.get(`/tratamientos/obtener-tratamientos-por-enfermedad-y-turno/${tipoEnfermedad}/${turno}`);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const patchTratamientoHook = async (id, data) => {
        try {
            const res = await businessApi.patch(`/tratamientos/patch-tratamiento-by-id/${id}`, data);
            return { data: res.data, status: res.status };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return { status: error.response?.status, error: true };
        }
    };

    // DIARREA TERNERO
    const crearDiarreTerneroHook = async (objectTratamiento) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.post('/diarrea-terneros/crear-diarrea-ternero', objectTratamiento);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return { status: error.response?.status, data: error.response?.data, error: true };
        }
    };

    const obtenerDiarreaTerneroHook = async (queryParams = '') => {
        try {
            const url = queryParams ? `/diarrea-terneros/obtener-listado-diarrea-terneros?${queryParams}` : '/diarrea-terneros/obtener-listado-diarrea-terneros';
            const { data, config, headers, status, statusText, request } = await businessApi.get(url);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const patchDiarreaHook = async (id, data) => {
        try {
            const res = await businessApi.patch(`/diarrea-terneros/patch-diarrea-ternero-by-id/${id}`, data);
            return { data: res.data, status: res.status };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return { status: error.response?.status, error: true };
        }
    };

    // TRATAMIENTO TERNERO
    const crearTratamientoTerneroHook = async (objectTratamiento) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.post('/terneros-tratamientos/crear-tratamiento-ternero', objectTratamiento);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const obtenerTratamientoTerneroHook = async () => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.get('/terneros-tratamientos/obtener-listado-tratamientos-terneros');
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    // RESUMEN SALUD
    const obtenerResumenSaludHook = async (queryParams = '') => {
        try {
            const url = queryParams ? `/resumen-salud?${queryParams}` : '/resumen-salud';
            const { data, config, headers, status, statusText, request } = await businessApi.get(url);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    // USERS ADMIN
    const obtenerUsuariosHook = async () => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.get('/users');
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const obtenerEstadisticasUsuariosHook = async () => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.get('/users/stats');
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const crearUsuarioHook = async (userData) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.post('/users', userData);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const actualizarUsuarioHook = async (id, userData) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.put(`/users/${id}`, userData);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const eliminarUsuarioHook = async (id) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.delete(`/users/${id}`);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const toggleEstadoUsuarioHook = async (id) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.put(`/users/${id}/toggle-status`, {});
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const obtenerUsuariosPendientesHook = async () => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.get('/users', { params: { estado: 'pendiente' } });
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    // ESTABLECIMIENTOS
    const obtenerEstablecimientosHook = async () => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.get('/establecimientos');
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const crearEstablecimientoHook = async (dataEstablecimiento) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.post('/establecimientos', dataEstablecimiento);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const actualizarEstablecimientoHook = async (id, dataEstablecimiento) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.put(`/establecimientos/${id}`, dataEstablecimiento);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const eliminarEstablecimientoHook = async (id) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.delete(`/establecimientos/${id}`);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    const toggleEstadoEstablecimientoHook = async (id) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.patch(`/establecimientos/${id}/toggle-estado`);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error.response?.status === 401) await on401();
            return error.response?.status || error;
        }
    };

    // RODEOS
    const obtenerRodeosHook = async (queryParams = '') => {
        try {
            const url = queryParams ? `/rodeos/obtener-listado?${queryParams}` : '/rodeos/obtener-listado';
            const { data, config, headers, status, statusText, request } = await businessApi.get(url);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error?.response?.status === 401) await on401();
            return { status: error?.response?.status, data: error?.response?.data, error: true };
        }
    };

    const crearRodeoHook = async (dataRodeo) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.post('/rodeos', dataRodeo);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error?.response?.status === 401) await on401();
            return { status: error?.response?.status, data: error?.response?.data, error: true };
        }
    };

    const actualizarRodeoHook = async (id, dataRodeo) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.put(`/rodeos/${id}`, dataRodeo);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error?.response?.status === 401) await on401();
            return { status: error?.response?.status, data: error?.response?.data, error: true };
        }
    };

    const toggleEstadoRodeoHook = async (id) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.patch(`/rodeos/${id}/toggle-estado`);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error?.response?.status === 401) await on401();
            return { status: error?.response?.status, data: error?.response?.data, error: true };
        }
    };

    const obtenerEstadisticasRodeoHook = async (id, queryParams = '') => {
        try {
            const url = queryParams ? `/rodeos/${id}/estadisticas?${queryParams}` : `/rodeos/${id}/estadisticas`;
            const { data, config, headers, status, statusText, request } = await businessApi.get(url);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error?.response?.status === 401) await on401();
            return { status: error?.response?.status || 500, data: error?.response?.data || { message: error.message }, error: true };
        }
    };

    const asignarTernerosRodeoHook = async (idRodeo, data) => {
        try {
            const { data: responseData, config, headers, status, statusText, request } = await businessApi.post(`/rodeos/${idRodeo}/asignar-terneros`, data);
            return { data: responseData, config, headers, status, statusText, request };
        } catch (error) {
            if (error?.response?.status === 401) await on401();
            return { status: error?.response?.status || 500, data: error?.response?.data || { message: error.message }, error: true };
        }
    };

    const desasignarTernerosRodeoHook = async (idRodeo, data) => {
        try {
            const { data: responseData, config, headers, status, statusText, request } = await businessApi.post(`/rodeos/${idRodeo}/desasignar-terneros`, data);
            return { data: responseData, config, headers, status, statusText, request };
        } catch (error) {
            if (error?.response?.status === 401) await on401();
            return { status: error?.response?.status || 500, data: error?.response?.data || { message: error.message }, error: true };
        }
    };

    const asignarMadresRodeoHook = async (idRodeo, data) => {
        try {
            const { data: responseData, config, headers, status, statusText, request } = await businessApi.post(`/rodeos/${idRodeo}/asignar-madres`, data);
            return { data: responseData, config, headers, status, statusText, request };
        } catch (error) {
            if (error?.response?.status === 401) await on401();
            return { status: error?.response?.status || 500, data: error?.response?.data || { message: error.message }, error: true };
        }
    };

    const desasignarMadresRodeoHook = async (idRodeo, data) => {
        try {
            const { data: responseData, config, headers, status, statusText, request } = await businessApi.post(`/rodeos/${idRodeo}/desasignar-madres`, data);
            return { data: responseData, config, headers, status, statusText, request };
        } catch (error) {
            if (error?.response?.status === 401) await on401();
            return { status: error?.response?.status || 500, data: error?.response?.data || { message: error.message }, error: true };
        }
    };

    // EQUIPO / INVITACIONES
    const obtenerEquipoHook = async (establecimientoId) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.get(`/establecimientos/${establecimientoId}/equipo`);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error?.response?.status === 401) await on401();
            return { status: error?.response?.status || 500, data: error?.response?.data || { message: error.message }, error: true };
        }
    };

    const obtenerInvitacionesPendientesHook = async (establecimientoId) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.get(`/invitaciones/pendientes/${establecimientoId}`);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error?.response?.status === 401) await on401();
            return { status: error?.response?.status || 500, data: error?.response?.data || { message: error.message }, error: true };
        }
    };

    const crearInvitacionHook = async (establecimientoId, payload) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.post(`/invitaciones/crear/${establecimientoId}`, payload);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error?.response?.status === 401) await on401();
            return { status: error?.response?.status || 500, data: error?.response?.data || { message: error.message }, error: true };
        }
    };

    const revocarInvitacionHook = async (invitacionId) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.delete(`/invitaciones/revocar/${invitacionId}`);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error?.response?.status === 401) await on401();
            return { status: error?.response?.status || 500, data: error?.response?.data || { message: error.message }, error: true };
        }
    };

    const eliminarMiembroHook = async (establecimientoId, userId) => {
        try {
            const { data, config, headers, status, statusText, request } = await businessApi.delete(`/establecimientos/${establecimientoId}/equipo/${userId}`);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error?.response?.status === 401) await on401();
            return { status: error?.response?.status || 500, data: error?.response?.data || { message: error.message }, error: true };
        }
    };

    // DASHBOARD
    const obtenerResumenDashboardHook = async (queryParams = '') => {
        try {
            const url = queryParams ? `/terneros/resumen-dashboard?${queryParams}` : '/terneros/resumen-dashboard';
            const { data, config, headers, status, statusText, request } = await businessApi.get(url);
            return { data, config, headers, status, statusText, request };
        } catch (error) {
            if (error?.response?.status === 401) await on401();
            return { status: error?.response?.status || 500, data: error?.response?.data || { message: error.message }, error: true };
        }
    };

    return {
        crearMadreHook, obtenerMadreHook, patchMadreHook,
        crearTerneroHook, obtenerTerneroHook, patchTerneroHook,
        agregarPesoDiarioHook, obtenerHistorialCompletoHook, actualizarCalostradoHook,
        crearEventoHook, crearMultiplesEventosHook, obtenerEventoHook, patchEventoHook,
        crearTratamientoHook, crearMultiplesTratamientosHook, obtenerTratamientoHook,
        obtenerTratamientosPorTipoHook, obtenerTratamientosPorTurnoHook, obtenerTratamientosPorTipoYTurnoHook, patchTratamientoHook,
        crearTratamientoTerneroHook, obtenerTratamientoTerneroHook,
        crearDiarreTerneroHook, obtenerDiarreaTerneroHook, patchDiarreaHook,
        obtenerResumenSaludHook,
        obtenerUsuariosHook, obtenerEstadisticasUsuariosHook, crearUsuarioHook,
        actualizarUsuarioHook, eliminarUsuarioHook, toggleEstadoUsuarioHook, obtenerUsuariosPendientesHook,
        obtenerEstablecimientosHook, crearEstablecimientoHook, actualizarEstablecimientoHook,
        eliminarEstablecimientoHook, toggleEstadoEstablecimientoHook,
        obtenerRodeosHook, crearRodeoHook, actualizarRodeoHook, toggleEstadoRodeoHook,
        obtenerEstadisticasRodeoHook, asignarTernerosRodeoHook, desasignarTernerosRodeoHook,
        asignarMadresRodeoHook, desasignarMadresRodeoHook,
        obtenerEquipoHook, obtenerInvitacionesPendientesHook, crearInvitacionHook,
        revocarInvitacionHook, eliminarMiembroHook,
        obtenerResumenDashboardHook,
    };
};

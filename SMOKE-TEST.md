# Smoke Test — TerneData Mobile

Guion de prueba en device real (Expo Go, Android, misma WiFi).
Backends = PRODUCCIÓN. Lo que crees queda en la base real → usá datos de prueba o borralos al final.

## Arranque
```
cd C:\Users\coco\ternedata-mobile
npx expo start -c
```
Escanear QR con Expo Go (SDK 54). Reload: tecla `r` o sacudir el celu.

---

## 0. Auth
- [ ] **Login** contra prod → entra, trae data real
- [ ] Cerrar app y reabrir → sesión persiste (no pide login de nuevo)
- [ ] (opcional) Logout desde Más → Perfil → vuelve a Login

## 1. Dashboard (Inicio 📊) — NUEVO
- [ ] Abre por defecto al loguear
- [ ] 6 KPIs cargan: Total, Vivos, Mortalidad 30d, Ganancia, Calostrados, Bajo crecim.
- [ ] Pull-to-refresh (deslizar abajo) recarga KPIs
- [ ] Botón 🔄 recarga
- [ ] Barras Vivos/Muertos/Vendidos proporcionales al total
- [ ] Si hay alertas bajo crecimiento → tabla aparece con RP/días/peso/ganancia
- [ ] Comparar KPIs vs la WEB (mismo establecimiento) → mismos números

## 2. Terneros 🐮
- [ ] Listado carga, RP visible (rp_ternero, no id)
- [ ] Último peso, Gan/día, chips rendimiento, línea Madre, calostrado
- [ ] Crear ternero (rp + peso_nacer requeridos) → guarda OK
- [ ] Modal Historial abre (pesos nacer/15d/30d/45d)
- [ ] Modal Calostrado (mamadera/sonda) guarda
- [ ] Peso Oficial (15d/30d/45d) patch OK

## 3. Madres 🐄
- [ ] Listado carga (rp_madre, hijos, eventos) — sin "raza"
- [ ] Crear madre → OK

## 4. Tratamientos 💉
- [ ] Listado carga (ternero + nombre + tipo_enfermedad + turno + fecha)
- [ ] Crear: seleccionar ternero + nombre → guarda OK (verifica fix campo `nombre`)
- [ ] Editar + Eliminar funcionan

## 5. Eventos 📅
- [ ] Listado carga (fecha + observacion + counts)
- [ ] Crear: observacion + al menos 1 ternero o madre → guarda OK (arrays)
- [ ] Editar + Eliminar

## 6. Rodeos 🐂
- [ ] Listado carga
- [ ] Abrir rodeo → Asignar: tab Terneros / tab Madres
- [ ] Seleccionar varios → Asignar → "● En este rodeo" aparece
- [ ] Desasignar → desaparece

## 7. Más •••
- [ ] **Diarrea**: listado + crear (ternero + severidad + fecha) → OK
- [ ] **Resumen de Salud**: morbilidad/mortalidad + población + severidades
      (OJO: fila "Leve" siempre 0 — limitación backend conocida, NO es bug)
- [ ] **Equipo**: miembros con rol (dueño/veterinario/operario)
- [ ] **Admin** (solo admin): establecimientos listan/editan
- [ ] **Perfil**: datos + tarjeta "Vincular Telegram" genera código 8 dígitos

## 8. Multi-tenant (si tenés 2 establecimientos)
- [ ] Cambiar establecimiento activo → Dashboard + listados cambian de data
- [ ] No se ve data del otro establecimiento

---

## Qué reportar si algo falla
1. Pantalla + acción exacta
2. Mensaje de error en el alert (texto literal)
3. Si la web (mismo dato) sí funciona → es bug mobile; si la web también falla → backend

## Visual (Caravana)
- [ ] Headers verde oscuro `#0F4E30`, botones verde pasto `#176B43`
- [ ] Cero índigo/cyan/púrpura suelto en ninguna pantalla

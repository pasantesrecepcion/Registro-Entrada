document.addEventListener('DOMContentLoaded', () => {
    const SUPABASE_URL = 'https://kdclsbscslklcypclohj.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_-jYliISAOxmckNHeoXMkpQ_7DIP0vp0';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const activeListContainer = document.getElementById('active-list');
    const historyRowsContainer = document.getElementById('history-rows');
    const dateFilter = document.getElementById('date-filter');

    const kpiFinalizado = document.getElementById('kpi-finalizado');
    const kpiProceso = document.getElementById('kpi-proceso');
    const kpiTotal = document.getElementById('kpi-total');

    // Forzar fecha de hoy
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    const fechaHoyString = `${año}-${mes}-${dia}`;

    dateFilter.value = fechaHoyString;

    cargarDatosPanel();
    dateFilter.addEventListener('change', cargarDatosPanel);

    function formatearSoloHora(timestampString) {
        if (!timestampString) return '--:--:--';
        if (timestampString.includes('.')) {
            return timestampString.split('.')[0];
        }
        const coincidencia = timestampString.match(/(\d{2}):(\d{2}):(\d{2})/);
        if (coincidencia) {
            return coincidencia[0];
        }
        return timestampString;
    }

    async function cargarDatosPanel() {
        const fechaSeleccionada = dateFilter.value;
        if (!fechaSeleccionada) return;

        try {
            const { data, error } = await supabase
                .from('registros_recepcion')
                .select('*')
                .eq('fecha_corta', fechaSeleccionada)
                .order('fecha_entrada', { ascending: true });

            if (error) throw error;

            renderizarPaneles(data);
        } catch (error) {
            console.error('Error al recuperar registros de Supabase:', error);
            activeListContainer.innerHTML = `<div style="color:red; padding:10px;">Error al conectar: ${error.message}</div>`;
        }
    }

    function renderizarPaneles(registros) {
        activeListContainer.innerHTML = '';
        historyRowsContainer.innerHTML = '';

        let enProcesoCount = 0;
        let finalizadoCount = 0;
        let totalCount = registros.length;

        if (registros.length === 0) {
            activeListContainer.innerHTML = '<div style="color:var(--text-muted); padding:10px; font-size:14px;">NO HAY REGISTROS EN ESTA FECHA</div>';
            historyRowsContainer.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Sin movimientos registrados</td></tr>';
            kpiFinalizado.textContent = '0';
            kpiProceso.textContent = '0';
            kpiTotal.textContent = '0';
            return;
        }

        registros.forEach(reg => {
            const horaInicio = formatearSoloHora(reg.fecha_entrada);

            if (reg.estado !== 'FINALIZADO' && !reg.hora_salida) {
                enProcesoCount++;

                const row = document.createElement('div');
                row.className = 'visitante-row';
                row.id = `vis-${reg.id}`;

                // Estructura visual basada en el nuevo requerimiento de protagonismo
                row.innerHTML = `
                    <div class="card-header-main">
                        <div class="empresa-title">${reg.empresa_proveedora || 'SIN EMPRESA'}</div>
                        <div class="hora-badge"><i class="ph ph-clock"></i> Entrada: ${horaInicio}</div>
                    </div>
                    
                    <div class="grid-datos-superficial">
                        <div class="dato-item">
                            <strong>Nombre del Visitante</strong>
                            <input type="text" id="nombre-${reg.id}" class="input-editable" value="${reg.nombre_completo || ''}" disabled>
                        </div>
                        <div class="dato-item">
                            <strong>Documento de Identidad (CI)</strong>
                            <input type="text" id="ci-${reg.id}" class="input-editable" value="${reg.documento_ci || ''}" disabled>
                        </div>
                        <div class="dato-item">
                            <strong>Nro. Personas</strong>
                            <input type="number" id="personas-${reg.id}" class="input-editable" value="${reg.personas || 1}" disabled>
                        </div>
                        <div class="dato-item">
                            <strong>Puerta Asignada</strong>
                            <input type="text" id="puerta-${reg.id}" class="input-editable" value="${reg.puerta || ''}" disabled>
                        </div>
                        <div class="dato-item observaciones-container">
                            <strong>Observaciones</strong>
                            <textarea id="obs-${reg.id}" class="input-editable textarea-obs" placeholder="Ninguna observación registrada..." disabled>${reg.observacion || ''}</textarea>
                        </div>
                    </div>
                    
                    <div class="row-actions">
                        <button class="btn-action btn-delete" data-id="${reg.id}" title="Eliminar Registro Físico"><i class="ph ph-trash"></i></button>
                        
                        <button class="btn-action btn-edit-toggle" data-id="${reg.id}" id="btn-toggle-${reg.id}" title="Habilitar Edición"><i class="ph ph-pencil"></i> Editar</button>
                        
                        <button class="btn-action btn-ok" data-id="${reg.id}"><i class="ph ph-floppy-disk"></i> Guardar</button>
                        
                        <button class="btn-action btn-fin" data-id="${reg.id}"><i class="ph ph-check"></i> Finalizar</button>
                    </div>
                `;
                activeListContainer.appendChild(row);
            } else {
                finalizadoCount++;
                const horaFin = formatearSoloHora(reg.hora_salida);

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${reg.nombre_completo || ''}</strong></td>
                    <td class="text-uppercase">${reg.empresa_proveedora || ''}</td>
                    <td>${horaInicio}</td>
                    <td>${horaFin}</td>
                    <td class="text-uppercase">${reg.area_destino || ''}</td>
                `;
                historyRowsContainer.appendChild(tr);
            }
        });

        kpiFinalizado.textContent = finalizadoCount;
        kpiProceso.textContent = enProcesoCount;
        kpiTotal.textContent = totalCount;

        asignarEventosBotones();
    }

    function asignarEventosBotones() {
        // Lógica del Lápiz (Conmutar entre Vista Superficial y modo Edición)
        document.querySelectorAll('.btn-edit-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');

                const camposAEditar = [
                    document.getElementById(`nombre-${id}`),
                    document.getElementById(`ci-${id}`),
                    document.getElementById(`personas-${id}`),
                    document.getElementById(`puerta-${id}`),
                    document.getElementById(`obs-${id}`)
                ];

                const estaDeshabilitado = camposAEditar[0].hasAttribute('disabled');

                if (estaDeshabilitado) {
                    // Activar modo edición
                    camposAEditar.forEach(campo => {
                        campo.removeAttribute('disabled');
                        campo.style.border = "1px solid var(--fc-blue)";
                    });
                    btn.innerHTML = `<i class="ph ph-x"></i> Cancelar`;
                    btn.style.background = "#ffe4e6";
                    btn.style.color = "#b91c1c";
                } else {
                    // Cancelar y volver a bloquear sin guardar
                    camposAEditar.forEach(campo => {
                        campo.setAttribute('disabled', 'true');
                        campo.style.border = "1px solid transparent";
                    });
                    btn.innerHTML = `<i class="ph ph-pencil"></i> Editar`;
                    btn.style.background = "#f1f5f9";
                    btn.style.color = "var(--text-muted)";
                    cargarDatosPanel(); // Recarga para revertir cambios no guardados
                }
            });
        });

        // Guardar Cambios inline en Supabase
        document.querySelectorAll('.btn-ok').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const nombre = document.getElementById(`nombre-${id}`).value.trim().toUpperCase();
                const ci = document.getElementById(`ci-${id}`).value.trim().toUpperCase();
                const personas = parseInt(document.getElementById(`personas-${id}`).value, 10) || 1;
                const puerta = document.getElementById(`puerta-${id}`).value.trim().toUpperCase();
                const observacion = document.getElementById(`obs-${id}`).value.trim().toUpperCase();

                try {
                    const { error } = await supabase
                        .from('registros_recepcion')
                        .update({
                            nombre_completo: nombre,
                            documento_ci: ci,
                            personas: personas,
                            puerta: puerta,
                            observacion: observacion || null
                        })
                        .eq('id', id);

                    if (error) throw error;
                    alert('¡Datos modificados guardados correctamente!');
                    cargarDatosPanel();
                } catch (err) {
                    console.error('Error al guardar datos:', err);
                    alert('No se pudieron actualizar los campos.');
                }
            });
        });

        // 🗑️ Botón Papelera de Reciclaje (Eliminar permanentemente de Supabase)
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const confirmacion = confirm(`¿Está seguro de que desea ELIMINAR permanentemente este registro del sistema? Esta acción no se puede deshacer.`);

                if (!confirmacion) return;

                try {
                    const { error } = await supabase
                        .from('registros_recepcion')
                        .delete()
                        .eq('id', id);

                    if (error) throw error;
                    cargarDatosPanel(); // Refresca la lista y los KPIs automáticamente
                } catch (err) {
                    console.error('Error al eliminar registro:', err);
                    alert('No se pudo eliminar el registro seleccionado.');
                }
            });
        });

        // Finalizar Entrada (Cambio de estado y seteo de hora de salida)
        document.querySelectorAll('.btn-fin').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const ahora = new Date();
                const horaSalidaLimpia = ahora.toLocaleTimeString('es-CL', { hour12: false });

                try {
                    const { error } = await supabase
                        .from('registros_recepcion')
                        .update({
                            hora_salida: horaSalidaLimpia,
                            estado: 'FINALIZADO'
                        })
                        .eq('id', id);

                    if (error) throw error;
                    cargarDatosPanel();
                } catch (err) {
                    console.error('Error al finalizar visita:', err);
                    alert('No se pudo procesar la salida.');
                }
            });
        });
    }
});
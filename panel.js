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

    // Referencias de Notificaciones, Modales y Botón Exportar
    const toastCentral = document.getElementById('toastCentral');
    const toastIcon = document.getElementById('toastIcon');
    const toastMessage = document.getElementById('toastMessage');

    const modalConfirmacion = document.getElementById('modalConfirmacion');
    const btnModalCancelar = document.getElementById('btnModalCancelar');
    const btnModalAceptar = document.getElementById('btnModalAceptar');
    const btnExportar = document.getElementById('btn-exportar');

    // Variable temporal para guardar el ID a eliminar
    let idParaEliminar = null;

    // Forzar fecha de hoy
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    const fechaHoyString = `${año}-${mes}-${dia}`;

    dateFilter.value = fechaHoyString;

    cargarDatosPanel();
    dateFilter.addEventListener('change', cargarDatosPanel);

    // 🔔 FUNCIÓN GLOBAL DE NOTIFICACIONES ESTILO TOAST
    function mostrarNotificacion(mensaje, tipo = 'success') {
        toastMessage.textContent = mensaje.toUpperCase();

        if (tipo === 'error') {
            toastCentral.classList.add('toast-error');
            toastIcon.className = "ph ph-warning-circle";
        } else if (tipo === 'delete') {
            toastCentral.classList.remove('toast-error');
            toastIcon.className = "ph ph-trash";
        } else {
            toastCentral.classList.remove('toast-error');
            toastIcon.className = "ph ph-check-circle";
        }

        toastCentral.classList.add('show');

        setTimeout(() => {
            toastCentral.classList.remove('show');
        }, 2500);
    }

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
            mostrarNotificacion('Error de conexión con la base de datos', 'error');
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
        // Lógica del Lápiz (Alternar Edición)
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
                    camposAEditar.forEach(campo => {
                        campo.removeAttribute('disabled');
                        campo.style.border = "1px solid var(--fc-blue)";
                    });
                    btn.innerHTML = `<i class="ph ph-x"></i> Cancelar`;
                    btn.style.background = "#ffe4e6";
                    btn.style.color = "#b91c1c";
                } else {
                    camposAEditar.forEach(campo => {
                        campo.setAttribute('disabled', 'true');
                        campo.style.border = "1px solid transparent";
                    });
                    btn.innerHTML = `<i class="ph ph-pencil"></i> Editar`;
                    btn.style.background = "#f1f5f9";
                    btn.style.color = "var(--text-muted)";
                    cargarDatosPanel();
                }
            });
        });

        // Guardar Cambios inline
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

                    mostrarNotificacion('Cambios modificados con éxito');
                    cargarDatosPanel();
                } catch (err) {
                    console.error('Error al guardar datos:', err);
                    mostrarNotificacion('No se pudieron salvar los cambios', 'error');
                }
            });
        });

        // 🗑️ Botón Papelera (Abre la nueva ventana flotante central)
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                idParaEliminar = btn.getAttribute('data-id');
                modalConfirmacion.classList.add('show');
            });
        });

        // Finalizar Entrada
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

                    mostrarNotificacion('Visita concluida correctamente');
                    cargarDatosPanel();
                } catch (err) {
                    console.error('Error al finalizar visita:', err);
                    mostrarNotificacion('No se pudo procesar la salida', 'error');
                }
            });
        });
    }

    // ⚡ EVENTOS CONTROLADORES DE LA VENTANA FLOTANTE MODAL
    btnModalCancelar.addEventListener('click', () => {
        modalConfirmacion.classList.remove('show');
        idParaEliminar = null;
    });

    btnModalAceptar.addEventListener('click', async () => {
        if (!idParaEliminar) return;

        try {
            const { error } = await supabase
                .from('registros_recepcion')
                .delete()
                .eq('id', idParaEliminar);

            if (error) throw error;

            modalConfirmacion.classList.remove('show');
            mostrarNotificacion('Registro eliminado del sistema', 'delete');
            cargarDatosPanel();
        } catch (err) {
            console.error('Error al eliminar de Supabase:', err);
            modalConfirmacion.classList.remove('show');
            mostrarNotificacion('Error al intentar eliminar', 'error');
        } finally {
            idParaEliminar = null;
        }
    });

    modalConfirmacion.addEventListener('click', (e) => {
        if (e.target === modalConfirmacion) {
            modalConfirmacion.classList.remove('show');
            idParaEliminar = null;
        }
    });

    // 🟢 LÓGICA DE EXPORTACIÓN A EXCEL (CSV)
    btnExportar.addEventListener('click', async () => {
        try {
            mostrarNotificacion('Preparando exportación...', 'success');
            
            // 1. Obtener la totalidad de los datos de la tabla desde Supabase
            const { data, error } = await supabase
                .from('registros_recepcion')
                .select('*')
                .order('fecha_corta', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                mostrarNotificacion('No hay datos globales para exportar', 'error');
                return;
            }

            // 2. Definir las columnas de cabecera en el Excel
            const headers = ['ID', 'Fecha', 'Hora Entrada', 'Hora Salida', 'Nombre Completo', 'CI', 'Empresa', 'Personas', 'Puerta', 'Área Destino', 'Estado', 'Observaciones'];
            
            // 3. Transformar las filas de la DB a filas de Excel cuidando los nulos y comas
            const rows = data.map(reg => [
                reg.id,
                reg.fecha_corta || '',
                formatearSoloHora(reg.fecha_entrada),
                reg.hora_salida || '',
                `"${(reg.nombre_completo || '').replace(/"/g, '""')}"`, // Previene roturas por comas internas
                reg.documento_ci || '',
                `"${(reg.empresa_proveedora || '').replace(/"/g, '""')}"`,
                reg.personas || 1,
                reg.puerta || '',
                `"${(reg.area_destino || '').replace(/"/g, '""')}"`,
                reg.estado || 'EN PROCESO',
                `"${(reg.observacion || '').replace(/"/g, '""')}"`
            ]);

            // 4. Construir la estructura CSV separada por punto y coma (Estándar Excel Latinoamericano)
            const csvContent = [
                headers.join(';'),
                ...rows.map(e => e.join(';'))
            ].join('\n');

            // 5. Crear el blob con el BOM de UTF-8 para que Excel reconozca eñes y caracteres especiales
            const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            // 6. Ejecutar descarga virtual invisibly
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `Reporte_Recepcion_CEDIS_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            mostrarNotificacion('Base de datos descargada');
        } catch (err) {
            console.error('Error al exportar los datos:', err);
            mostrarNotificacion('Error al exportar registros', 'error');
        }
    });
});

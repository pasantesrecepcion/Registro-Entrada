// Esperar a que todo el HTML esté cargado en el navegador antes de ejecutar el JS
document.addEventListener('DOMContentLoaded', () => {

    const SUPABASE_URL = 'https://kdclsbscslklcypclohj.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_-jYliISAOxmckNHeoXMkpQ_7DIP0vp0';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Captura de elementos del DOM
    const form = document.getElementById('recepcionForm');
    const areaDestinoSelect = document.getElementById('areaDestino');
    const motivoVisitaSelect = document.getElementById('motivoVisita');
    const especifiqueMotivoGroup = document.getElementById('especifiqueMotivoGroup');
    const motivoDetalleTextarea = document.getElementById('motivoDetalle');
    const textInputs = document.querySelectorAll('input[type="text"], textarea');
    const btnSubmit = document.querySelector('.btn-submit');
    const empresaInput = document.getElementById('empresa');
    const autocompleteResults = document.getElementById('autocompleteResults');

    // Validación de seguridad: Si el formulario no existe en la página, detiene el script sin romper la consola
    if (!form) {
        console.warn("Advertencia: No se encontró el formulario 'recepcionForm'.");
        return;
    }

    const motivosMap = {
        'LOGISTICA INVERSA': ['NOTA DE CREDITO', 'DEVOLUCIONES', 'OTROS'],
        'RECEPCION': ['AGENDA DE ENTREGA', 'ENTREGA DE FACTURA', 'OTROS'],
        'RRHH': ['FIRMA DE CONTRATO', 'ENTREVISTA', 'OTROS'],
        'MANTENIMIENTO': ['OTROS'],
        'OTROS': ['OTROS']
    };

    // Forzar mayúsculas en los inputs de texto
    textInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            e.target.value = e.target.value.toUpperCase();
            e.target.setSelectionRange(start, end);
        });
    });

    // Control del cambio de Área Destino
    areaDestinoSelect.addEventListener('change', (e) => {
        const area = e.target.value;
        const motivos = motivosMap[area] || [];

        motivoVisitaSelect.innerHTML = '<option value="" disabled selected>SELECCIONE EL MOTIVO</option>';

        if (motivos.length > 0) {
            motivos.forEach(motivo => {
                const option = document.createElement('option');
                option.value = motivo;
                option.textContent = motivo;
                motivoVisitaSelect.appendChild(option);
            });
            motivoVisitaSelect.disabled = false;
        }

        if (area === 'MANTENIMIENTO' || area === 'OTROS') {
            motivoVisitaSelect.value = "OTROS";
        }

        checkOtrosField();
    });

    motivoVisitaSelect.addEventListener('change', checkOtrosField);

    function checkOtrosField() {
        const isAreaOtros = areaDestinoSelect.value === 'OTROS' || areaDestinoSelect.value === 'MANTENIMIENTO';
        const isMotivoOtros = motivoVisitaSelect.value === 'OTROS';

        if (isAreaOtros || isMotivoOtros) {
            especifiqueMotivoGroup.classList.remove('hidden');
            motivoDetalleTextarea.setAttribute('required', 'true');
        } else {
            especifiqueMotivoGroup.classList.add('hidden');
            motivoDetalleTextarea.removeAttribute('required');
            motivoDetalleTextarea.value = '';
        }
    }

    // Autocompletado con Debounce para Proveedores
    let debounceTimer;
    if (empresaInput && autocompleteResults) {
        empresaInput.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            const query = this.value.trim();

            if (query.length < 3) {
                autocompleteResults.style.display = 'none';
                return;
            }

            debounceTimer = setTimeout(async () => {
                try {
                    const { data, error } = await supabase
                        .from('maestros_proveedores')
                        .select('nombre')
                        .ilike('nombre', `%${query}%`)
                        .limit(8);

                    if (error) throw error;

                    autocompleteResults.innerHTML = '';

                    if (data && data.length > 0) {
                        autocompleteResults.style.display = 'block';
                        data.forEach(prov => {
                            const optDiv = document.createElement('div');
                            optDiv.className = 'autocomplete-option';
                            optDiv.textContent = prov.nombre.toUpperCase();

                            optDiv.addEventListener('click', function () {
                                empresaInput.value = prov.nombre.toUpperCase();
                                autocompleteResults.style.display = 'none';
                            });
                            autocompleteResults.appendChild(optDiv);
                        });
                    } else {
                        autocompleteResults.innerHTML = '<div style="padding:11px 14px; font-size:13px; color:#64748b;">SIN RESULTADOS COINCIDENTES</div>';
                        autocompleteResults.style.display = 'block';
                    }
                } catch (err) {
                    console.error('Error al recuperar datos del proveedor:', err);
                }
            }, 300);
        });

        document.addEventListener('click', function (e) {
            if (!empresaInput.contains(e.target) && !autocompleteResults.contains(e.target)) {
                autocompleteResults.style.display = 'none';
            }
        });
    }

    function mostrarToast() {
        const toast = document.getElementById('toastNotification');
        if (toast) {
            toast.classList.add('show');
            setTimeout(() => { toast.classList.remove('show'); }, 3500);
        }
    }

    // Envío seguro a Supabase
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const originalText = btnSubmit.textContent;
        btnSubmit.textContent = 'REGISTRANDO...';
        btnSubmit.disabled = true;

        // 🕒 Capturar la hora local exacta de la computadora actual (HH:MM:SS)
        const ahora = new Date();
        const horaLocalLimpia = ahora.toLocaleTimeString('es-CL', { hour12: false });

        const formData = {
            nombre_completo: document.getElementById('nombre').value.trim().toUpperCase(),
            empresa_proveedora: empresaInput.value.trim().toUpperCase(),
            documento_ci: document.getElementById('ci').value.trim().toUpperCase(),
            telefono: document.getElementById('telefono').value.trim() || null,
            personas: parseInt(document.getElementById('personas').value, 10) || 1,
            puerta: document.getElementById('puerta').value,
            area_destino: areaDestinoSelect.value,
            motivo_visita: motivoVisitaSelect.value,
            motivo_otros_detalle: !especifiqueMotivoGroup.classList.contains('hidden')
                ? motivoDetalleTextarea.value.trim().toUpperCase()
                : "",

            // 🎯 SOLUCIÓN HORA ADELANTADA Y ESTADO INITIAL:
            fecha_entrada: horaLocalLimpia,  // Fuerza el ingreso con tu hora local
            estado: 'EN PROCESO'            // Inicializa explícitamente en proceso
        };

        try {
            const { data, error } = await supabase
                .from('registros_recepcion')
                .insert([formData]);

            if (error) throw error;

            mostrarToast();
            form.reset();
            motivoVisitaSelect.innerHTML = '<option value="" disabled selected>-- ELIJA ÁREA PRIMERO --</option>';
            motivoVisitaSelect.disabled = true;
            especifiqueMotivoGroup.classList.add('hidden');
            motivoDetalleTextarea.removeAttribute('required');

        } catch (error) {
            console.error('Error al registrar:', error);
            alert('Hubo un error al guardar el registro. Por favor intente de nuevo.\n\nDetalle: ' + (error.message || 'Error desconocido'));
        } finally {
            btnSubmit.textContent = originalText;
            btnSubmit.disabled = false;
        }
    });
});
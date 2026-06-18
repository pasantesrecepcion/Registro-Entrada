const SUPABASE_URL = 'https://kdclsbscslklcypclohj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_-jYliISAOxmckNHeoXMkpQ_7DIP0vp0';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById('recepcionForm');
const areaDestinoSelect = document.getElementById('areaDestino');
const motivoVisitaSelect = document.getElementById('motivoVisita');
const especifiqueMotivoGroup = document.getElementById('especifiqueMotivoGroup');
const motivoDetalleTextarea = document.getElementById('motivoDetalle');
const textInputs = document.querySelectorAll('input[type="text"], textarea');
const btnSubmit = document.querySelector('.btn-submit');

const motivosMap = {
    'LOGISTICA INVERSA': ['NOTA DE CREDITO', 'DEVOLUCIONES', 'OTROS'],
    'RECEPCION': ['AGENDA DE ENTREGA', 'ENTREGA DE FACTURA', 'OTROS'],
    'RRHH': ['FIRMA DE CONTRATO', 'ENTREVISTA', 'OTROS'],
    'MANTENIMIENTO': ['OTROS'],
    'OTROS': ['OTROS']
};

textInputs.forEach(input => {
    input.addEventListener('input', (e) => {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = e.target.value.toUpperCase();
        e.target.setSelectionRange(start, end);
    });
});

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
    }
    checkOtrosField();
});

motivoVisitaSelect.addEventListener('change', checkOtrosField);

function checkOtrosField() {
    const isAreaOtros = areaDestinoSelect.value === 'OTROS';
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

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        nombre_completo: document.getElementById('nombre').value.trim().toUpperCase(),
        empresa_proveedora: document.getElementById('empresa').value.trim().toUpperCase(),
        documento_ci: document.getElementById('ci').value.trim().toUpperCase(),
        personas: parseInt(document.getElementById('personas').value, 10),
        puerta: parseInt(document.getElementById('puerta').value, 10),
        area_destino: areaDestinoSelect.value,
        motivo_visita: motivoVisitaSelect.value,
        motivo_otros_detalle: !especifiqueMotivoGroup.classList.contains('hidden')
            ? motivoDetalleTextarea.value.trim().toUpperCase()
            : null
    };

    const originalText = btnSubmit.textContent;
    btnSubmit.textContent = 'REGISTRANDO...';
    btnSubmit.disabled = true;

    try {
        const { data, error } = await supabase
            .from('registros_recepcion')
            .insert([formData]);

        if (error) throw error;

        alert('Registro completado exitosamente.');
        form.reset();
        motivoVisitaSelect.innerHTML = '<option value="" disabled selected>SELECCIONE EL MOTIVO</option>';
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
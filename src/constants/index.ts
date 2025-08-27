export const EXPENSE_CATEGORIES = [
  { value: 'fixed', label: 'Gasto Fijo' },
  { value: 'viaticos', label: 'Viáticos' },
  { value: 'otros', label: 'Otros' },
];

export const FIXED_EXPENSE_OPTIONS = [
  { value: 'internet', label: 'Internet' },
  { value: 'servidor', label: 'Servidor' },
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'agua_mantenimiento', label: 'Agua/Mantenimiento' },
  { value: 'luz', label: 'Luz' },
  { value: 'sueldo', label: 'Sueldo' },
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'afp', label: 'AFP' },
  { value: 'contador', label: 'Contador' },
];

export const VIATICOS_OPTIONS = [
  { value: 'tecnicos', label: 'Técnicos' },
  { value: 'proyecto', label: 'Proyecto' },
  { value: 'representantes', label: 'Representantes' },
  { value: 'ocasional', label: 'Ocasional' },
];

// ACCOUNTS ya no es una constante aquí, se cargará dinámicamente desde Supabase
// export const ACCOUNTS = [
//   { value: 'bbva_empresa', label: 'BBVA Empresa' },
//   { value: 'efectivo', label: 'Efectivo' },
// ];

export const TRANSACTION_TYPES = [
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'anulacion', label: 'Anulación' },
  { value: 'devolucion', label: 'Devolución' },
];

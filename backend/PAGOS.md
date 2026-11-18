# Reservas y pagos con Wompi

Las nuevas citas se confirman cuando Wompi aprueba el anticipo del 20 % del servicio. Si el cliente tiene un abono que cubre todo el anticipo, la cita se confirma inmediatamente sin abrir Wompi. El valor se redondea al peso colombiano más cercano; el saldo restante se registra desde el panel de administrador o empleado después de finalizar la cita.

Si se cancela una cita que ya tiene un anticipo aprobado, el valor pagado en línea queda como abono del cliente. El sistema lo aplica automáticamente a una reserva posterior. La parte de una reserva cubierta con abonos anteriores se restaura al cancelar.

## Preparación

1. Ejecuta una sola vez `database/migrations/20261116_wompi_reservas.sql` en la base de datos configurada para el backend.
2. Copia las variables de Wompi de `.env.example` a `backend/.env` y reemplaza los valores de ejemplo por las llaves del comercio. Comienza con las llaves de pruebas (`pub_test_`).
3. En el Dashboard de Wompi configura la URL de eventos del ambiente de pruebas:
   `https://<dominio-del-backend>/inser/wompi/webhook`
4. Configura `FRONTEND_URL` con la URL pública del frontend. En producción debe usarse HTTPS.
5. Prueba reservas aprobadas, rechazadas y vencidas en el ambiente de pruebas antes de cambiar a llaves de producción (`pub_prod_`).

No publiques ni compartas `WOMPI_INTEGRITY_SECRET` o `WOMPI_EVENTS_SECRET`. La referencia, el monto en centavos y la firma de integridad se generan en el backend. Cuando el pago se hace con Wompi, la cita no se crea hasta recibir un evento `transaction.updated` con firma válida y estado `APPROVED`.

El checkout vence a los 30 minutos. Las reservas en proceso bloquean temporalmente el horario y liberan el abono aplicado si vencen o el pago es rechazado.

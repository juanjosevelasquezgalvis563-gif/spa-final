# Proyecto de agendamiento de citas y control de inventario de un spa
Error 1:Al principio se podia registrar usuarios ya registrados,osea un email que estaba regitrado en la base de datos se podia volver a registrar otra vez.Lo solucione haciendo una consulta trayendo id de la db con email y haviendo la validacion si usuario esta mas de una vez osea es mayor a 1 que devuelva un mensaje que ese usuario ya esta registrado.

Error 2:Error de envio de datos podia ingresar el nombre y darle registrar y quedaba guardado correctamente.Pero lo solucione agregando validaciones para campo diciendo que el campo es obligatorio y que no puede estar vacio.

Error 3:errores de validacion de datos al principio,no tenia una cantidad limitad de caracteres para el ingreso de un nombre,y no tenia una cantidad de caracteres para la contraseña pues se podia agregar infinidades de caracteres.
Lo solucione agregando validaciones de minimo cuantos caracteres podia ingresar en el nombre y la contraseña.

Error 4: Error de roles en el acceso de rutas,al principio se podia acceder a todas las rutas sin importar el rol que tenia el usuario,lo solucione agregando validaciones de roles para que solo los usuarios con rol clientes podian acceder a las rutas de clientes,que solo los usuarios con rol administrador podian acceder a las rutas de administrador y que solo los usuarios con rol empleado podian acceder a las rutas de empleado.

Error 5:Error al  momento de agendar una cita,al ´principio se podia agendar una cita sin importar si a esa hora ya estaba agendada una cita,lo solucione agregando validaciones de horario para que no se pudiera agendar una cita en una hora que ya estaba agendada.

Error 6:Error al momento de cancelar una cita sin importar el estado en el que se encontrara por ejemplo uan cita en estado finalizada ya no se puede cancelar y hice la prueba y si se podia cancelar sin importar ya su estado finalizado.






